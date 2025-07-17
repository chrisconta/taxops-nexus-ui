import React, { useEffect, useRef, useState, useCallback } from "react";
import { Plus, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useChatStore } from "@/store/useChatStore";
import { useClientRegistrationStore } from "@/stores/useClientRegistrationStore";
import { useSearchParams } from "react-router-dom";
import { MessageList } from "@/components/agent/MessageList";
import { MessageInput } from "@/components/agent/MessageInput";
import { ToolLauncher } from "@/components/agent/ToolLauncher";
import { FieldPrompt } from "@/components/registration/FieldPrompt";
import { DuplicateClientCard } from "@/components/registration/DuplicateClientCard";
import { FallbackForm } from "@/components/registration/FallbackForm";
import { TransactionDataCollector } from "./TransactionDataCollector";
import { ValidationErrorCollector } from "./ValidationErrorCollector";
import { useExecuteTool } from "@/hooks/useExecuteTool";
import { usePlan, ValidationError } from "@/hooks/usePlan";
import { PlanModal } from "@/components/agent/PlanModal";
import { executePlanSequentially } from "@/utils/planExecutor";
import type { Plan } from "@/agent/planner/schema";
import { supabase } from "@/integrations/supabase/client";
import { withAction } from "@/lib/actionWrapper";
import { ActionBanner } from "@/components/agent/ActionBanner";
import { useChatLogger } from "@/hooks/useChatLogger";
const TypingAnimation = () => {
  const [currentTextIndex, setCurrentTextIndex] = useState(0);
  const [currentText, setCurrentText] = useState("");
  const [isTyping, setIsTyping] = useState(true);
  const texts = ["What reports you want me to build?", "What client you want me to register?", "What connection you need to create?", "What dashboard you want me to create?", "What graph do you want?"];
  useEffect(() => {
    const targetText = texts[currentTextIndex];
    if (isTyping) {
      if (currentText.length < targetText.length) {
        const timer = setTimeout(() => {
          setCurrentText(targetText.slice(0, currentText.length + 1));
        }, 100);
        return () => clearTimeout(timer);
      } else {
        const timer = setTimeout(() => {
          setIsTyping(false);
        }, 2000);
        return () => clearTimeout(timer);
      }
    } else {
      if (currentText.length > 0) {
        const timer = setTimeout(() => {
          setCurrentText(currentText.slice(0, -1));
        }, 50);
        return () => clearTimeout(timer);
      } else {
        setCurrentTextIndex(prev => (prev + 1) % texts.length);
        setIsTyping(true);
      }
    }
  }, [currentText, isTyping, currentTextIndex]);
  return <h1 className="text-4xl font-bold text-white mb-8 h-16 flex items-center justify-center">
      {currentText}<span className="animate-pulse">|</span>
    </h1>;
};
interface ChatWindowProps {
  onSend?: (text: string) => void;
  onToolInvoke?: (toolName: string, params: Record<string, any>) => void;
  isLoading?: boolean;
}
export const ChatWindow: React.FC<ChatWindowProps> = ({
  onSend: externalOnSend,
  onToolInvoke: externalOnToolInvoke,
  isLoading: externalIsLoading
}) => {
  const [searchParams] = useSearchParams();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [dataCollectors, setDataCollectors] = useState<Set<string>>(new Set());
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [currentPlan, setCurrentPlan] = useState<Plan | null>(null);
  const [lastUserMessage, setLastUserMessage] = useState<string>("");
  
  // Registration store
  const {
    currentField,
    isDuplicate,
    duplicateInfo,
    partialParams,
    retryCount,
    validateAndSetField,
    incrementRetry,
    canRetry,
    reset: resetRegistration,
    setDuplicateInfo,
    clearDuplicateInfo,
  } = useClientRegistrationStore();
  
  const [registrationMode, setRegistrationMode] = useState<'chat' | 'field' | 'form' | 'duplicate'>('chat');
  
  const {
    messages,
    isLoading: internalIsLoading,
    send,
    load,
    startNew,
    addMessage,
    markDataCollected,
    recovery,
    setRecovery,
    feedbackContext,
    setFeedbackContext,
    registrationModeActive,
    setAction,
    setRegistrationModeActive
  } = useChatStore();
  const executeToolMutation = useExecuteTool();
  const planMutation = usePlan();
  const {
    toast
  } = useToast();

  // Initialize chat logger
  const {
    startSession,
    endSession,
    logMessage,
    logSystemRoute,
    logProcess,
    logError,
    logNotification,
    logEdgeFunction,
    getCurrentSession
  } = useChatLogger();

  // Use external loading state if provided, otherwise use internal
  const isLoading = externalIsLoading !== undefined ? externalIsLoading : internalIsLoading;

  // Load conversation from URL parameter
  useEffect(() => {
    const convId = searchParams.get('conv');
    if (convId) {
      load(convId);
      // Start logger session
      startSession(convId, `Chat Session ${new Date().toLocaleString()}`);
      logSystemRoute('URL', 'Chat Window', `Loading conversation ${convId}`);
    } else {
      // Start a new session for new chats
      const newSessionId = crypto.randomUUID();
      startSession(newSessionId, `New Chat ${new Date().toLocaleString()}`);
      logSystemRoute('Direct', 'Chat Window', 'New chat session started');
    }
  }, [searchParams, load, startSession, logSystemRoute]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth"
    });
  }, [messages]);

  // Log messages when they are added
  useEffect(() => {
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      logMessage(lastMessage.author, 
        typeof lastMessage.content === 'string' ? lastMessage.content : lastMessage.content.text || '',
        lastMessage.id
      );
    }
  }, [messages, logMessage]);

  // Update registration mode active state in chat store
  useEffect(() => {
    const isActive = registrationMode !== 'chat';
    if (registrationModeActive !== isActive) {
      setRegistrationModeActive(isActive);
      if (isActive) {
        setAction(undefined); // Clear any action when entering registration mode
        logSystemRoute('Chat', 'Registration Mode', `Registration mode activated: ${registrationMode}`);
      } else {
        logSystemRoute('Registration Mode', 'Chat', 'Registration mode deactivated');
      }
    }
  }, [registrationMode, registrationModeActive, setAction, setRegistrationModeActive, logSystemRoute]);
  const handleNewChat = useCallback(async () => {
    try {
      logProcess('New Chat', 'started', 'Starting new chat session');
      
      // End current session
      endSession('completed');
      
      // First, start the new chat to clear the messages
      startNew();
      
      // Wait for the next tick to ensure state updates are applied
      await new Promise(resolve => setTimeout(resolve, 0));
      
      // Clear localStorage cache to ensure clean start
      localStorage.removeItem('taxops-chat-storage');
      
      // Start new logger session
      const newSessionId = crypto.randomUUID();
      startSession(newSessionId, `New Chat ${new Date().toLocaleString()}`);
      
      logProcess('New Chat', 'completed', 'New chat session started successfully');
      
      // Show success toast
      toast({
        title: "New Chat Started",
        description: "Previous conversation saved to history"
      });
      logNotification('success', 'New Chat Started', 'Previous conversation saved to history');
    } catch (error) {
      logError(error as Error, 'New Chat');
      console.error('Error starting new chat:', error);
      toast({
        title: "Error",
        description: "Failed to start new chat",
        variant: "destructive"
      });
      logNotification('error', 'Error', 'Failed to start new chat');
    }
  }, [startNew, toast, logProcess, logError, endSession, startSession]);
  const handleSend = async (text: string) => {
    logProcess('Message Send', 'started', `User sending message: ${text.substring(0, 50)}...`);
    
    // Use external handler if provided, otherwise use internal logic
    if (externalOnSend) {
      externalOnSend(text);
      return;
    }

    // Internal handling logic for when ChatWindow is standalone
    // Handle feedback input
    const trimmed = text.trim();
    if (trimmed.startsWith("👍") || trimmed.startsWith("👎")) {
      const positive = trimmed.startsWith("👍");
      const comment = trimmed.slice(1).trim() || undefined;
      
      logProcess('Feedback', 'started', `Processing ${positive ? 'positive' : 'negative'} feedback`);

      // Send feedback to edge function
      try {
        const {
          data: {
            session
          }
        } = await supabase.auth.getSession();
        if (session) {
          await fetch('https://zitderdjvqtadtwgatmm.supabase.co/functions/v1/agent-feedback', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.access_token}`
            },
            body: JSON.stringify({
              planId: feedbackContext.lastPlanId,
              stepId: feedbackContext.lastStepId,
              toolName: feedbackContext.toolName,
              feedback: positive,
              comments: comment
            })
          });
        }
      } catch (err) {
        console.error('Feedback error:', err);
      }

      // Clear feedback context
      setFeedbackContext({});
      addMessage({
        id: crypto.randomUUID(),
        author: "user",
        content: text,
        timestamp: Date.now()
      });
      addMessage({
        id: crypto.randomUUID(),
        author: "agent",
        content: "Thanks for your feedback! 🙏",
        timestamp: Date.now()
      });
      return;
    }

    // If we're waiting for a missing field in recovery mode...
    if (recovery.pendingStep && recovery.missingField) {
      // 1) Update the pending step's params
      recovery.pendingStep.params[recovery.missingField] = text.trim();

      // Add user message
      addMessage({
        id: crypto.randomUUID(),
        author: "user",
        content: text,
        timestamp: Date.now()
      });

      // 2) Clear recovery state
      setRecovery({});

      // 3) Resume execution with the current plan
      if (currentPlan) {
        executePlanSequentially(currentPlan);
      }
      return;
    }
    setLastUserMessage(text);

    // Check if this looks like an actionable request that should generate a plan
    const actionableKeywords = ['add', 'create', 'register', 'setup', 'build', 'connect'];
    const isActionable = actionableKeywords.some(keyword => text.toLowerCase().includes(keyword));
    if (isActionable) {
      // Automatically generate plan for actionable requests
      try {
        const chatHistory = messages.slice(-5).map(msg => ({
          role: msg.author === "user" ? "user" : "assistant",
          content: typeof msg.content === 'string' ? msg.content : msg.content.text || ""
        }));

        // Add user message first
        addMessage({
          id: crypto.randomUUID(),
          author: "user",
          content: text,
          timestamp: Date.now()
        });

        // Add thinking message with typing animation
        const thinkingMessageId = crypto.randomUUID();
        addMessage({
          id: thinkingMessageId,
          author: "agent",
          content: "Thinking",
          timestamp: Date.now(),
          typing: true
        });

        // Generate plan automatically
        planMutation.mutate({
          userPrompt: text,
          chatHistory
        }, {
          onSuccess: plan => {
            // Remove thinking message and show plan modal
            const {
              removeTyping
            } = useChatStore.getState();
            removeTyping();
            setCurrentPlan(plan);
            setIsPlanModalOpen(true);
          },
          onError: (error: any) => {
            // Remove thinking message and show error
            const {
              removeTyping
            } = useChatStore.getState();
            removeTyping();
            
            // Handle validation errors specifically
            if (error instanceof ValidationError) {
              // Instead of showing toast, add message with data collector
              get().removeTyping();
              const msgId = crypto.randomUUID();
              get().addMessage({
                id: msgId,
                author: "agent",
                content: `I need some additional information to complete this request:`,
                timestamp: Date.now(),
                requiresData: true,
                validationErrors: error.validationResponse
              });
              return;
            }
            
            toast({
              title: "Plan Generation Failed",
              description: error.message,
              variant: "destructive"
            });
            // Fallback to regular chat if plan generation fails
            send(text);
          }
        });
      } catch (error) {
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : 'Failed to process request',
          variant: "destructive"
        });
      }
    } else {
      // For non-actionable messages, use regular chat
      try {
        await send(text);
      } catch (error) {
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : 'Failed to send message',
          variant: "destructive"
        });
      }
    }
  };
  const handleGeneratePlan = () => {
    if (!lastUserMessage) {
      toast({
        title: "No Recent Message",
        description: "Send a message first to generate a plan",
        variant: "destructive"
      });
      return;
    }

    withAction('validate', 'plan generation', async () => {
      // Convert messages to chat history format
      const chatHistory = messages.slice(-5).map(msg => ({
        role: msg.author === "user" ? "user" : "assistant",
        content: typeof msg.content === 'string' ? msg.content : msg.content.text || ""
      }));
      
      return new Promise((resolve, reject) => {
        planMutation.mutate({
          userPrompt: lastUserMessage,
          chatHistory
        }, {
          onSuccess: plan => {
            setCurrentPlan(plan);
            setIsPlanModalOpen(true);
            resolve(plan);
          },
          onError: (error: any) => {
            // Handle validation errors specifically
            if (error instanceof ValidationError) {
              toast({
                title: "Plan Generation Failed",
                description: error.details || error.message,
                variant: "destructive"
              });
              // Don't open modal for validation errors
              reject(error);
              return;
            }
            
            toast({
              title: "Plan Generation Failed",
              description: error.message,
              variant: "destructive"
            });
            reject(error);
          }
        });
      });
    }, 'planner', { userPrompt: lastUserMessage });
  };
  const handleExecutePlan = async (plan: Plan) => {
    // Store the current plan for recovery purposes
    setCurrentPlan(plan);

    // Use the centralized plan executor with recovery logic
    withAction('execute', 'plan execution', async () => {
      executePlanSequentially(plan);
      return plan;
    }, 'plan-executor', { intent: plan.intent });
  };
  const handleToolInvoke = (toolName: string, params: Record<string, any>) => {
    // Use external handler if provided, otherwise use internal logic
    if (externalOnToolInvoke) {
      externalOnToolInvoke(toolName, params);
      return;
    }

    // Internal handling logic for when ChatWindow is standalone
    const invocationId = crypto.randomUUID();

    // 1) Show optimistic "pending" message
    addMessage({
      id: invocationId,
      author: "agent",
      content: `Invoking ${toolName}...`,
      timestamp: Date.now(),
      toolCall: {
        name: toolName,
        params
      }
    });

    // 2) Call server with action wrapper
    withAction('execute', toolName, async () => {
      return new Promise((resolve, reject) => {
        executeToolMutation.mutate({
          toolName,
          params
        }, {
          onSuccess: ({ result }) => {
            // Add success message with result
            addMessage({
              id: crypto.randomUUID(),
              author: "agent",
              content: `✅ ${toolName} completed successfully`,
              timestamp: Date.now(),
              toolCall: {
                name: toolName,
                params
              }
            });
            toast({
              title: "Tool Completed",
              description: `${toolName} executed successfully`
            });
            resolve(result);
          },
          onError: (error: any) => {
            // Add error message
            addMessage({
              id: crypto.randomUUID(),
              author: "agent",
              content: `❌ ${toolName} failed: ${error.message}`,
              timestamp: Date.now(),
              toolCall: {
                name: toolName,
                params
              }
            });
            toast({
              title: "Tool Error",
              description: error.message,
              variant: "destructive"
            });
            reject(error);
          }
        });
      });
    }, toolName, params);
  };
  return <div className="h-full w-full flex flex-col overflow-hidden max-w-full">
      {/* Header with New Chat Button - Fixed at top, properly positioned */}
      {messages.length > 0}

      {/* Chat Messages - Properly constrained scrollable area */}
      <div className="flex-1 min-h-0 w-full overflow-hidden">
        {messages.length === 0 ? <div className="flex flex-col items-center justify-center h-full px-4 min-h-[400px] w-full max-w-full overflow-hidden">
            <div className="text-center max-w-2xl w-full overflow-hidden">
              <TypingAnimation />
              {/* Tool Launcher & Input centered below animation - only show when standalone */}
              {!externalOnSend && <div className="mt-12 max-w-4xl w-full overflow-hidden">
                  <ToolLauncher onInvoke={handleToolInvoke} availableTools={["register_client", "create_connection", "build_dashboard"]} disabled={isLoading} />
                  
                  <MessageInput 
                    onSend={handleSend} 
                    placeholder="Type your message..." 
                    isLoading={isLoading} 
                    onNewChat={handleNewChat}
                    showNewChatButton={true}
                  />
                  
                  <div className="flex justify-between text-xs text-taxops-gray-light mt-2">
                    <span>Use tools above or type naturally</span>
                  </div>
                  
                  <div className="text-xs text-taxops-gray-light/60 mt-2 text-center">
                    AI can make mistakes. Always review your work.
                  </div>
                </div>}
            </div>
          </div> : <div className="h-full flex flex-col overflow-hidden">
            <ActionBanner />
            {/* Progressive Registration UI */}
            {registrationMode === 'field' && currentField && (
              <div className="p-4 border-b bg-muted/50">
                <FieldPrompt
                  field={currentField as keyof typeof partialParams}
                  value={partialParams[currentField as keyof typeof partialParams] || ''}
                  retryCount={retryCount[currentField] || 0}
                  isLoading={isLoading}
                  onSubmit={(value) => {
                    const result = validateAndSetField(currentField as keyof typeof partialParams, value);
                    if (!result.success) {
                      incrementRetry(currentField as keyof typeof partialParams);
                      toast({
                        title: "Validation Error",
                        description: result.error,
                        variant: "destructive"
                      });
                    }
                  }}
                  onFallback={() => setRegistrationMode('form')}
                />
              </div>
            )}
            
            {/* Messages container with proper scrolling */}
            <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-4 py-6">
              <div className="space-y-4">
                <MessageList messages={messages} />
                
                {/* Data Collectors for messages that require data */}
                {messages.map(message => message.requiresData && !message.dataCollected && !dataCollectors.has(message.id) && <div key={`collector-${message.id}`} className="mt-4">
                      <TransactionDataCollector messageId={message.id} missingParams={message.missingParams} onDataSubmitted={() => {
                setDataCollectors(prev => new Set(prev).add(message.id));
                markDataCollected(message.id);
              }} />
                    </div>)}
                
                <div ref={messagesEndRef} />
              </div>
            </div>
          </div>}
      </div>

      {/* Input section for standalone mode when there are messages */}
      {messages.length > 0 && !externalOnSend && <div className="flex-shrink-0 border-t border-glass-border bg-glass-bg/30 w-full max-w-full overflow-hidden">
          <div className="p-4 space-y-4 w-full max-w-full overflow-hidden">
            <ToolLauncher onInvoke={handleToolInvoke} availableTools={["register_client", "create_connection", "build_dashboard"]} disabled={isLoading} />
            
            <MessageInput 
              onSend={handleSend} 
              placeholder="Type your message..." 
              isLoading={isLoading} 
              onNewChat={handleNewChat}
              showNewChatButton={true}
            />
            
            <div className="flex justify-between text-xs text-taxops-gray-light">
              <span>Use tools above or type naturally</span>
            </div>
            
            <div className="text-xs text-taxops-gray-light/60 text-center">
              AI can make mistakes. Always review your work.
            </div>
          </div>
        </div>}
      
      {/* Plan Modal */}
      <PlanModal isOpen={isPlanModalOpen} onClose={() => setIsPlanModalOpen(false)} plan={currentPlan} onConfirm={handleExecutePlan} isExecuting={executeToolMutation.isPending} />
    </div>;
};