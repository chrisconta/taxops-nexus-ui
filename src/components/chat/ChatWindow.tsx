import React, { useEffect, useRef, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useChatStore } from "@/store/useChatStore";
import { useSearchParams } from "react-router-dom";
import { MessageList } from "@/components/agent/MessageList";
import { MessageInput } from "@/components/agent/MessageInput";
import { ToolLauncher } from "@/components/agent/ToolLauncher";
import { TransactionDataCollector } from "./TransactionDataCollector";

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
  
  const {
    messages,
    isLoading,
    send,
    load,
    startNew,
    invokeTool,
    markDataCollected
  } = useChatStore();
  
  const { toast } = useToast();

  // Load conversation from URL parameter and handle generate requests
  useEffect(() => {
    const convId = searchParams.get('conv');
    const generate = searchParams.get('generate');
    
    if (convId) {
      load(convId);
    }

    // Auto-generate report request if specified
    if (generate) {
      const reportPrompt = `Please generate a ${generate} report based on the available data and rules.`;
      send(reportPrompt);

      // Clear the generate parameter from URL
      const newSearchParams = new URLSearchParams(searchParams);
      newSearchParams.delete('generate');
      window.history.replaceState({}, '', `${window.location.pathname}?${newSearchParams.toString()}`);
    }
  }, [searchParams, load, send]);

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

  const handleToolInvoke = (toolName: string, params: Record<string, any>) => {
    invokeTool(toolName, params);
    toast({
      title: "Tool Launched",
      description: `${toolName} has been invoked with the provided parameters.`,
    });
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header with New Chat Button - Fixed outside scroll area */}
      {messages.length > 0 && (
        <div className="flex-shrink-0 p-4 flex justify-end">
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
    </div>
  );
};