import React, { useEffect, useRef, useState } from "react";
import { Plus, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useChatStore } from "@/store/useChatStore";
import { useSearchParams } from "react-router-dom";
import { MessageList } from "@/components/agent/MessageList";
import { MessageInput } from "@/components/agent/MessageInput";
import { ToolLauncher } from "@/components/agent/ToolLauncher";
import { TransactionDataCollector } from "./TransactionDataCollector";
import { useExecuteTool } from "@/hooks/useExecuteTool";
import { usePlan } from "@/hooks/usePlan";
import { PlanModal } from "@/components/agent/PlanModal";
import { executePlanSequentially } from "@/utils/planExecutor";
import type { Plan } from "@/agent/planner/schema";
import { supabase } from "@/integrations/supabase/client";

const TypingAnimation = () => {
  const [currentTextIndex, setCurrentTextIndex] = useState(0);
  const [currentText, setCurrentText] = useState("");
  const [isTyping, setIsTyping] = useState(true);
  
  const texts = [
    "What reports you want me to build?",
    "What client you want me to register?",
    "What connection you need to create?",
    "What dashboard you want me to create?",
    "What graph do you want?"
  ];
  
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
        setCurrentTextIndex((prev) => (prev + 1) % texts.length);
        setIsTyping(true);
      }
    }
  }, [currentText, isTyping, currentTextIndex]);
  
  return (
    <h1 className="text-4xl font-bold text-white mb-8 h-16 flex items-center justify-center">
      {currentText}<span className="animate-pulse">|</span>
    </h1>
  );
};

export const ChatWindow: React.FC = () => {
  const [searchParams] = useSearchParams();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [dataCollectors, setDataCollectors] = useState<Set<string>>(new Set());
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [currentPlan, setCurrentPlan] = useState<Plan | null>(null);
  const [lastUserMessage, setLastUserMessage] = useState<string>("");
  
  const {
    messages,
    isLoading,
    send,
    load,
    startNew,
    addMessage,
    markDataCollected,
    recovery,
    setRecovery,
    feedbackContext,
    setFeedbackContext
  } = useChatStore();
  
  const executeToolMutation = useExecuteTool();
  const planMutation = usePlan();
  
  const { toast } = useToast();

  // Load conversation from URL parameter
  useEffect(() => {
    const convId = searchParams.get('conv');
    
    if (convId) {
      load(convId);
    }
    // Removed auto-report generation - users should manually start planning
  }, [searchParams, load]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleNewChat = () => {
    startNew();
    // Clear localStorage cache to ensure clean start
    localStorage.removeItem('taxops-chat-storage');
    toast({
      title: "New Chat Started",
      description: "Previous conversation saved to history",
    });
  };

  const handleSend = async (text: string) => {
    // Handle feedback input
    const trimmed = text.trim();
    if (trimmed.startsWith("👍") || trimmed.startsWith("👎")) {
      const positive = trimmed.startsWith("👍");
      const comment = trimmed.slice(1).trim() || undefined;

      // Send feedback to edge function
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          await fetch('https://zitderdjvqtadtwgatmm.supabase.co/functions/v1/agent-feedback', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({
              planId: feedbackContext.lastPlanId,
              stepId: feedbackContext.lastStepId,
              toolName: feedbackContext.toolName,
              feedback: positive,
              comments: comment,
            }),
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
        timestamp: Date.now(),
      });

      addMessage({
        id: crypto.randomUUID(),
        author: "agent",
        content: "Thanks for your feedback! 🙏",
        timestamp: Date.now(),
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
        timestamp: Date.now(),
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
    const isActionable = actionableKeywords.some(keyword => 
      text.toLowerCase().includes(keyword)
    );
    
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
          timestamp: Date.now(),
        });

        // Generate plan automatically
        planMutation.mutate(
          { userPrompt: text, chatHistory },
          {
            onSuccess: (plan) => {
              setCurrentPlan(plan);
              setIsPlanModalOpen(true);
            },
            onError: (error: any) => {
              toast({
                title: "Plan Generation Failed",
                description: error.message,
                variant: "destructive"
              });
              // Fallback to regular chat if plan generation fails
              send(text);
            }
          }
        );
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

    // Convert messages to chat history format
    const chatHistory = messages.slice(-5).map(msg => ({
      role: msg.author === "user" ? "user" : "assistant",
      content: typeof msg.content === 'string' ? msg.content : msg.content.text || ""
    }));

    planMutation.mutate(
      { userPrompt: lastUserMessage, chatHistory },
      {
        onSuccess: (plan) => {
          setCurrentPlan(plan);
          setIsPlanModalOpen(true);
        },
        onError: (error: any) => {
          toast({
            title: "Plan Generation Failed",
            description: error.message,
            variant: "destructive"
          });
        }
      }
    );
  };

  const handleExecutePlan = async (plan: Plan) => {
    // Store the current plan for recovery purposes
    setCurrentPlan(plan);
    
    // Use the centralized plan executor with recovery logic
    executePlanSequentially(plan);
  };

  const handleToolInvoke = (toolName: string, params: Record<string, any>) => {
    const invocationId = crypto.randomUUID();
    
    // 1) Show optimistic "pending" message
    addMessage({
      id: invocationId,
      author: "agent",
      content: `Invoking ${toolName}...`,
      timestamp: Date.now(),
      toolCall: { name: toolName, params },
    });

    // 2) Call server
    executeToolMutation.mutate(
      { toolName, params },
      {
        onSuccess: ({ result }) => {
          // Add success message with result
          addMessage({
            id: crypto.randomUUID(),
            author: "agent", 
            content: `✅ ${toolName} completed successfully`,
            timestamp: Date.now(),
            toolCall: { name: toolName, params },
          });
          
          toast({
            title: "Tool Completed", 
            description: `${toolName} executed successfully`,
          });
        },
        onError: (error: any) => {
          // Add error message
          addMessage({
            id: crypto.randomUUID(),
            author: "agent",
            content: `❌ ${toolName} failed: ${error.message}`,
            timestamp: Date.now(),
            toolCall: { name: toolName, params },
          });
          
          toast({
            title: "Tool Error",
            description: error.message,
            variant: "destructive"
          });
        },
      }
    );
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header with New Chat Button - Fixed outside scroll area */}
      {messages.length > 0 && (
        <div className="flex-shrink-0 p-4 flex justify-end items-center">
          <Button 
            onClick={handleNewChat}
            className="bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30 hover:border-primary/50"
            variant="outline"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Chat
          </Button>
        </div>
      )}

      {/* Chat Messages - Constrained scrollable area */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full px-4 min-h-[400px]">
            <div className="text-center max-w-2xl w-full">
              <TypingAnimation />
              
              {/* Tool Launcher & Input centered below animation */}
              <div className="mt-12 max-w-4xl">
                <ToolLauncher
                  onInvoke={handleToolInvoke}
                  availableTools={["register_client", "create_connection", "build_dashboard"]}
                  disabled={isLoading}
                />
                
                <MessageInput 
                  onSend={handleSend}
                  placeholder="Type your message..."
                  isLoading={isLoading}
                />
                
                <div className="flex justify-between text-xs text-taxops-gray-light mt-2">
                  <span>Use tools above or type naturally</span>
                </div>
                
                <div className="text-xs text-taxops-gray-light/60 mt-2 text-center">
                  AI can make mistakes. Always review your work.
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="px-4 py-6">
            <MessageList messages={messages} />
            
            {/* Data Collectors for messages that require data */}
            {messages.map(message => (
              message.requiresData && !message.dataCollected && !dataCollectors.has(message.id) && (
                <div key={`collector-${message.id}`} className="mt-4">
                  <TransactionDataCollector 
                    messageId={message.id} 
                    missingParams={message.missingParams} 
                    onDataSubmitted={() => {
                      setDataCollectors(prev => new Set(prev).add(message.id));
                      markDataCollected(message.id);
                    }} 
                  />
                </div>
              )
            ))}
            
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Tool Launcher & Input - Fixed at bottom for when there are messages */}
      {messages.length > 0 && (
        <div className="flex-shrink-0 p-6 border-t border-glass-border bg-glass-bg/30">
          <ToolLauncher
            onInvoke={handleToolInvoke}
            availableTools={["register_client", "create_connection", "build_dashboard"]}
            disabled={isLoading}
          />
          
          <MessageInput 
            onSend={handleSend}
            placeholder="Type your message..."
            isLoading={isLoading}
          />
          
          <div className="flex justify-between text-xs text-taxops-gray-light mt-2">
            <span>Use tools above or type naturally</span>
          </div>
          
          <div className="text-xs text-taxops-gray-light/60 mt-2 text-center">
            AI can make mistakes. Always review your work.
          </div>
        </div>
      )}
      
      {/* Plan Modal */}
      <PlanModal
        isOpen={isPlanModalOpen}
        onClose={() => setIsPlanModalOpen(false)}
        plan={currentPlan}
        onConfirm={handleExecutePlan}
        isExecuting={executeToolMutation.isPending}
      />
    </div>
  );
};