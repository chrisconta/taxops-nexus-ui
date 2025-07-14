
import { useState, useEffect, useRef } from "react";
import { Send, Loader2, Brain, AlertCircle, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useChatStore } from "@/store/useChatStore";
import { useSearchParams } from "react-router-dom";

const TypingDots = () => (
  <div className="flex space-x-1">
    <div className="w-2 h-2 bg-white/70 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
    <div className="w-2 h-2 bg-white/70 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
    <div className="w-2 h-2 bg-white/70 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
  </div>
);

const FileLink = ({ url, filename }: { url: string; filename: string }) => (
  <Badge 
    variant="secondary" 
    className="bg-primary/20 text-primary hover:bg-primary/30 cursor-pointer inline-flex items-center gap-1 mt-2"
    onClick={() => window.open(url, '_blank')}
  >
    <Download className="w-3 h-3" />
    {filename}
  </Badge>
);

const MessageContent = ({ content }: { content: string }) => {
  // Detect file links
  const parts = content.split(/(\[Download report\]\([^)]+\))/g);
  
  return (
    <div className="whitespace-pre-wrap">
      {parts.map((part, index) => {
        const linkMatch = part.match(/\[Download report\]\(([^)]+)\)/);
        if (linkMatch) {
          const url = linkMatch[1];
          const filename = url.split('/').pop() || 'report.csv';
          return <FileLink key={index} url={url} filename={filename} />;
        }
        return <span key={index}>{part}</span>;
      })}
    </div>
  );
};

export const ChatWindow = () => {
  const [input, setInput] = useState("");
  const [searchParams] = useSearchParams();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { messages, isLoading, send, load } = useChatStore();
  const { toast } = useToast();

  // Load conversation from URL parameter
  useEffect(() => {
    const convId = searchParams.get('conv');
    if (convId) {
      load(convId);
    }
  }, [searchParams, load]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading || input.length > 4000) return;
    
    const message = input.trim();
    setInput("");

    try {
      await send(message);
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to send message',
        variant: "destructive",
      });
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Brain className="w-16 h-16 text-taxops-gray-light mx-auto mb-4" />
              <p className="text-taxops-gray-light mb-2">Start a conversation</p>
              <p className="text-sm text-taxops-gray-light/70">
                Ask anything and I'll help you with your questions!
              </p>
            </div>
          </div>
        ) : (
          <>
            {messages.map(message => (
              <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-full ${message.role === 'user' ? 'max-w-xs lg:max-w-md' : 'max-w-4xl'}`}>
                  <div className={`px-4 py-2 rounded-2xl ${
                    message.role === 'user' 
                      ? 'bg-primary text-white' 
                      : 'bg-glass-bg/30 border border-glass-border text-white'
                  }`}>
                    {message.typing ? (
                      <TypingDots />
                    ) : (
                      <MessageContent content={message.content} />
                    )}
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Chat Input */}
      <div className="p-6 border-t border-glass-border bg-glass-bg/30">
        <div className="flex space-x-3">
          <Input 
            value={input} 
            onChange={e => setInput(e.target.value)} 
            placeholder="Type your message... (max 4000 chars)"
            className="flex-1 bg-glass-bg/20 border-glass-border text-white placeholder:text-taxops-gray-light" 
            onKeyPress={handleKeyPress}
            disabled={isLoading}
            maxLength={4000}
          />
          <Button 
            onClick={handleSend} 
            disabled={!input.trim() || isLoading || input.length > 4000}
            className="bg-primary hover:bg-primary/80"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
        
        <div className="flex justify-between text-xs text-taxops-gray-light mt-2">
          <span>{input.length}/4000 characters</span>
        </div>
        
        <div className="mt-3 p-3 bg-glass-bg/20 border border-glass-border rounded-lg">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-taxops-warning mt-0.5" />
            <div className="text-sm">
              <p className="text-white font-medium">Configure DeepSeek API Key</p>
              <p className="text-taxops-gray-light">
                To use AI-powered chat, please add your DeepSeek API key in{" "}
                <Button 
                  variant="link" 
                  className="p-0 h-auto text-primary hover:text-primary/80"
                  onClick={() => window.location.href = '/settings/ai'}
                >
                  Settings
                </Button>
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
