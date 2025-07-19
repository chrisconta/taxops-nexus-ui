import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Bot, User } from 'lucide-react';
import { WorkflowLogger } from '@/lib/workflowLogger';
import { supabase } from '@/integrations/supabase/client';
import { WorkflowState } from '@/hooks/useWorkflowBuilder';
import { ToolDebugInfo } from '@/components/chat/ToolDebugInfo';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  debugInfo?: {
    currentTool?: string;
    toolChain?: string[];
    apiCall?: {
      url: string;
      method: string;
      duration: number;
      status: number;
      response?: any;
    };
    processingTime?: number;
  };
}

interface WorkflowChatPanelProps {
  onWorkflowUpdate: (updates: Partial<WorkflowState>) => void;
  workflowState: WorkflowState;
}

export const WorkflowChatPanel: React.FC<WorkflowChatPanelProps> = ({
  onWorkflowUpdate,
  workflowState
}) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: 'Hi! I\'m here to help you build custom workflows. Describe what you\'d like to automate and I\'ll help you create the perfect tool.',
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const logger = WorkflowLogger.getInstance();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: input.trim(),
      timestamp: new Date()
    };

    logger.info('ui', 'User sent message in workflow chat', { 
      messageLength: input.length,
      messageId: userMessage.id 
    });

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    let startTime = Date.now();
    
    try {
      logger.info('api', 'Calling workflow planner function', {
        prompt: input.substring(0, 100) + '...',
        workflowNodeCount: workflowState.nodes.length
      });

      const { data, error } = await supabase.functions.invoke('workflow-planner', {
        body: {
          message: input,
          currentWorkflow: {
            nodes: workflowState.nodes,
            connections: workflowState.connections
          }
        }
      });

      if (error) throw error;

      logger.logApiCall('api', '/workflow-planner', 'POST', startTime, data);

      const endTime = Date.now();
      const processingTime = endTime - startTime;

      const assistantMessage: Message = {
        id: `msg-${Date.now()}`,
        role: 'assistant',
        content: data.response || 'I understand. Let me help you build that workflow.',
        timestamp: new Date(),
        debugInfo: {
          currentTool: 'workflow-planner',
          toolChain: ['workflow-planner'],
          apiCall: {
            url: '/functions/v1/workflow-planner',
            method: 'POST',
            duration: processingTime,
            status: 200,
            response: data
          },
          processingTime
        }
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Apply suggested workflow changes if any
      if (data.workflowUpdates) {
        logger.info('ai', 'Applying AI-suggested workflow updates', {
          suggestedNodes: data.workflowUpdates.nodes?.length || 0,
          suggestedConnections: data.workflowUpdates.connections?.length || 0
        });
        
        onWorkflowUpdate(data.workflowUpdates);
      }

    } catch (error) {
      const endTime = Date.now();
      const processingTime = endTime - startTime;

      logger.error('api', 'Workflow planner function call failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      const errorMessage: Message = {
        id: `msg-${Date.now()}`,
        role: 'assistant',
        content: 'I apologize, but I encountered an error processing your request. Please try again.',
        timestamp: new Date(),
        debugInfo: {
          currentTool: 'workflow-planner',
          toolChain: ['workflow-planner'],
          apiCall: {
            url: '/functions/v1/workflow-planner',
            method: 'POST',
            duration: processingTime,
            status: 500,
            response: { error: error instanceof Error ? error.message : 'Unknown error' }
          },
          processingTime
        }
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Chat Header */}
      <div className="p-4 border-b">
        <h3 className="font-semibold flex items-center gap-2">
          <Bot className="h-5 w-5 text-primary" />
          Workflow Assistant
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          Describe your automation needs
        </p>
      </div>

      {/* Chat Container */}
      <div className="flex-1 min-h-0 p-4">
        <div className="h-full bg-card rounded-lg border border-border shadow-sm flex flex-col">
          <ScrollArea className="flex-1 min-h-0 p-4" ref={scrollRef}>
        <div className="space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-3 ${
                message.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              {message.role === 'assistant' && (
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
              )}
              
              <div
                className={`max-w-[80%] rounded-lg p-3 ${
                  message.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                <span className="text-xs opacity-70 mt-1 block">
                  {message.timestamp.toLocaleTimeString()}
                </span>
                
                {/* Debug Info for assistant messages */}
                {message.role === 'assistant' && message.debugInfo && (
                  <ToolDebugInfo
                    currentTool={message.debugInfo.currentTool}
                    debugInfo={message.debugInfo}
                    toolChain={message.debugInfo.toolChain}
                  />
                )}
              </div>

              {message.role === 'user' && (
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <User className="h-4 w-4 text-primary" />
                </div>
              )}
            </div>
          ))}
          
          {isLoading && (
            <div className="flex gap-3 justify-start">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Bot className="h-4 w-4 text-primary" />
              </div>
              <div className="bg-muted rounded-lg p-3">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-primary/50 rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-primary/50 rounded-full animate-bounce delay-100" />
                  <div className="w-2 h-2 bg-primary/50 rounded-full animate-bounce delay-200" />
                </div>
              </div>
            </div>
          )}
        </div>
          </ScrollArea>
        </div>
      </div>

      {/* Input */}
      <div className="p-4 border-t">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Describe your workflow..."
            disabled={isLoading}
            className="flex-1"
          />
          <Button 
            onClick={handleSendMessage} 
            disabled={!input.trim() || isLoading}
            size="sm"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};