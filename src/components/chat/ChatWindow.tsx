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
import type { Plan } from "@/agent/planner/schema";

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
    markDataCollected
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
    toast({
      title: "New Chat Started",
      description: "Previous conversation saved to history",
    });
  };

  const handleSend = async (text: string) => {
    setLastUserMessage(text); // Store for potential plan generation
    try {
      await send(text);
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to send message',
        variant: "destructive"
      });
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
    // Add plan preview message
    addMessage({
      id: crypto.randomUUID(),
      author: "agent",
      content: `🎯 Executing plan: ${plan.intent}`,
      timestamp: Date.now(),
    });

    // Execute steps sequentially
    for (let i = 0; i < plan.steps.length; i++) {
      const step = plan.steps[i];
      
      // Show step start message
      addMessage({
        id: crypto.randomUUID(),
        author: "agent", 
        content: `⚡ Step ${i + 1}: ${step.description}`,
        timestamp: Date.now(),
      });

      try {
        const result = await new Promise<{ success: boolean; result: unknown }>((resolve, reject) => {
          executeToolMutation.mutate(
            { toolName: step.toolName, params: step.params },
            {
              onSuccess: resolve,
              onError: reject
            }
          );
        });

        // Show success message
        addMessage({
          id: crypto.randomUUID(),
          author: "agent",
          content: `✅ Step ${i + 1} completed successfully`,
          timestamp: Date.now(),
        });

      } catch (error: any) {
        // Show error and stop execution
        addMessage({
          id: crypto.randomUUID(),
          author: "agent",
          content: `❌ Step ${i + 1} failed: ${error.message}. Plan execution stopped.`,
          timestamp: Date.now(),
        });
        
        toast({
          title: "Plan Execution Failed",
          description: `Step ${i + 1} failed: ${error.message}`,
          variant: "destructive"
        });
        return;
      }
    }

    // Show completion message
    addMessage({
      id: crypto.randomUUID(),
      author: "agent",
      content: `🎉 Plan execution completed successfully! All ${plan.steps.length} steps finished.`,
      timestamp: Date.now(),
    });

    toast({
      title: "Plan Completed",
      description: `Successfully executed ${plan.steps.length} steps`,
    });
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
      {/* Header with New Chat Button and Plan Generator - Fixed outside scroll area */}
      {messages.length > 0 && (
        <div className="flex-shrink-0 p-4 flex justify-between items-center">
          <Button 
            onClick={handleGeneratePlan}
            disabled={planMutation.isPending || !lastUserMessage}
            className="bg-accent/20 hover:bg-accent/30 text-accent-foreground border border-accent/30 hover:border-accent/50"
            variant="outline"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            {planMutation.isPending ? "Generating..." : "Generate Plan"}
          </Button>
          
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
            <div className="text-center max-w-2xl">
              <TypingAnimation />
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

      {/* Tool Launcher & Input - Fixed at bottom */}
      <div className={`flex-shrink-0 p-6 ${messages.length === 0 ? 'pb-8' : 'border-t border-glass-border bg-glass-bg/30'}`}>
        <div className={`${messages.length === 0 ? 'max-w-4xl mx-auto' : ''}`}>
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