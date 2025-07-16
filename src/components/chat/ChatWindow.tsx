import { useState, useEffect, useRef } from "react";
import { Send, Loader2, Brain, AlertCircle, Download, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useChatStore } from "@/store/useChatStore";
import { useSearchParams } from "react-router-dom";
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
const TypingDots = () => <div className="flex space-x-1">
    <div className="w-2 h-2 bg-white/70 rounded-full animate-bounce" style={{
    animationDelay: '0ms'
  }}></div>
    <div className="w-2 h-2 bg-white/70 rounded-full animate-bounce" style={{
    animationDelay: '150ms'
  }}></div>
    <div className="w-2 h-2 bg-white/70 rounded-full animate-bounce" style={{
    animationDelay: '300ms'
  }}></div>
  </div>;
const FileLink = ({
  url,
  filename
}: {
  url: string;
  filename: string;
}) => <Badge variant="secondary" className="bg-primary/20 text-primary hover:bg-primary/30 cursor-pointer inline-flex items-center gap-1 mt-2" onClick={() => window.open(url, '_blank')}>
    <Download className="w-3 h-3" />
    {filename}
  </Badge>;
const DownloadButton = ({
  label,
  url,
  filename
}: {
  label: string;
  url: string;
  filename: string;
}) => <div className="mt-4 mb-2">
    <p className="text-sm text-white/70 mb-3">Here is the report to download:</p>
    <button onClick={() => window.open(url, '_blank')} className="w-full bg-primary hover:bg-primary/90 text-white font-medium py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors">
      <Download className="w-5 h-5" />
      {label}
    </button>
  </div>;
const MessageContent = ({
  content
}: {
  content: string | {
    text: string;
    downloadButton?: {
      label: string;
      url: string;
      filename: string;
    };
  };
}) => {
  // Handle structured content with download button
  if (typeof content === 'object' && content.downloadButton) {
    return <div className="whitespace-pre-wrap">
        <span>{content.text}</span>
        <DownloadButton label={content.downloadButton.label} url={content.downloadButton.url} filename={content.downloadButton.filename} />
      </div>;
  }

  // Handle string content (backward compatibility)
  const stringContent = typeof content === 'string' ? content : content.text;

  // Detect file links
  const parts = stringContent.split(/(\[Download report\]\([^)]+\))/g);
  return <div className="whitespace-pre-wrap">
      {parts.map((part, index) => {
      const linkMatch = part.match(/\[Download report\]\(([^)]+)\)/);
      if (linkMatch) {
        const url = linkMatch[1];
        const filename = url.split('/').pop() || 'report.csv';
        return <FileLink key={index} url={url} filename={filename} />;
      }
      return <span key={index}>{part}</span>;
    })}
    </div>;
};
export const ChatWindow = () => {
  const [input, setInput] = useState("");
  const [searchParams] = useSearchParams();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const {
    messages,
    isLoading,
    send,
    load,
    startNew
  } = useChatStore();
  const {
    toast
  } = useToast();

  // Track which messages have data collectors
  const [dataCollectors, setDataCollectors] = useState<Set<string>>(new Set());

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
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth"
    });
  }, [messages]);
  const handleNewChat = () => {
    startNew();
    toast({
      title: "New Chat Started",
      description: "Previous conversation saved to history",
    });
  };

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
        variant: "destructive"
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
    <div className="flex flex-col h-[calc(100vh-250px)]">
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
          <div className="px-4 py-6 space-y-4">
            {messages.map(message => (
              <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-full ${message.role === 'user' ? 'max-w-xs lg:max-w-md' : 'max-w-4xl'}`}>
                  <div className={`px-4 py-2 rounded-2xl ${message.role === 'user' ? 'bg-primary text-white' : 'bg-glass-bg/30 border border-glass-border text-white'}`}>
                    {message.typing ? <TypingDots /> : <MessageContent content={message.content} />}
                  </div>
                  {message.requiresData && !message.dataCollected && !dataCollectors.has(message.id) && (
                    <TransactionDataCollector 
                      messageId={message.id} 
                      missingParams={message.missingParams} 
                      onDataSubmitted={() => {
                        setDataCollectors(prev => new Set(prev).add(message.id));
                      }} 
                    />
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Chat Input - Fixed at bottom */}
      <div className={`flex-shrink-0 p-6 ${messages.length === 0 ? 'pb-8' : 'border-t border-glass-border bg-glass-bg/30'}`}>
        <div className={`${messages.length === 0 ? 'max-w-4xl mx-auto' : ''}`}>
          <div className="flex space-x-3">
            <Input 
              value={input} 
              onChange={e => setInput(e.target.value)} 
              placeholder="Type your message... (max 4000 chars)" 
              className="flex-1 bg-glass-bg/20 border-glass-border text-white placeholder:text-taxops-gray-light h-16 text-lg" 
              onKeyPress={handleKeyPress} 
              disabled={isLoading} 
              maxLength={4000} 
            />
            <Button 
              onClick={handleSend} 
              disabled={!input.trim() || isLoading || input.length > 4000} 
              className="bg-primary hover:bg-primary/80 h-16 px-6"
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            </Button>
          </div>
          
          <div className="flex justify-between text-xs text-taxops-gray-light mt-2">
            <span>{input.length}/4000 characters</span>
          </div>
          
          <div className="text-xs text-taxops-gray-light/60 mt-2 text-center">
            AI can make mistakes. Always review your work.
          </div>
        </div>
      </div>
    </div>
  );
};