import React, { useState } from "react";
import { Send, Loader2, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface MessageInputProps {
  onSend: (text: string) => void;
  placeholder?: string;
  isLoading?: boolean;
  disabled?: boolean;
  onNewChat?: () => void;
  showNewChatButton?: boolean;
}

export const MessageInput: React.FC<MessageInputProps> = ({ 
  onSend, 
  placeholder = "Type your message...", 
  isLoading = false,
  disabled = false,
  onNewChat,
  showNewChatButton = false
}) => {
  const [input, setInput] = useState("");

  const handleSend = () => {
    if (!input.trim() || isLoading || disabled) return;
    
    onSend(input.trim());
    setInput("");
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex space-x-2 md:space-x-3 p-1 w-full max-w-full overflow-hidden">
      <Input 
        value={input} 
        onChange={e => setInput(e.target.value)} 
        placeholder={`${placeholder} (max 4000 chars)`}
        className="flex-1 bg-glass-bg/20 border-glass-border text-white placeholder:text-taxops-gray-light h-12 md:h-16 text-base md:text-lg min-w-0" 
        onKeyPress={handleKeyPress} 
        disabled={isLoading || disabled} 
        maxLength={4000} 
      />
      {showNewChatButton && (
        <Button 
          onClick={onNewChat} 
          disabled={isLoading || disabled} 
          className="bg-secondary hover:bg-secondary/80 h-12 md:h-16 px-3 md:px-4 flex-shrink-0"
          title="Start new chat"
        >
          <MessageSquare className="w-4 h-4 md:w-5 md:h-5" />
        </Button>
      )}
      <Button 
        onClick={handleSend} 
        disabled={!input.trim() || isLoading || disabled || input.length > 4000} 
        className="bg-primary hover:bg-primary/80 h-12 md:h-16 px-4 md:px-6 flex-shrink-0"
      >
        {isLoading ? <Loader2 className="w-4 h-4 md:w-5 md:h-5 animate-spin" /> : <Send className="w-4 h-4 md:w-5 md:h-5" />}
      </Button>
    </div>
  );
};