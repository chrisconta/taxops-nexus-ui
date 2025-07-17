import React, { useState } from "react";
import { Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface MessageInputProps {
  onSend: (text: string) => void;
  placeholder?: string;
  isLoading?: boolean;
  disabled?: boolean;
}

export const MessageInput: React.FC<MessageInputProps> = ({ 
  onSend, 
  placeholder = "Type your message...", 
  isLoading = false,
  disabled = false
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
    <div className="flex space-x-2 p-3">
      <Input 
        value={input} 
        onChange={e => setInput(e.target.value)} 
        placeholder={placeholder}
        className="flex-1 bg-background/50 border-border/50 text-foreground placeholder:text-muted-foreground h-10 text-sm rounded-lg focus:border-primary/50 focus:ring-1 focus:ring-primary/20" 
        onKeyPress={handleKeyPress} 
        disabled={isLoading || disabled} 
        maxLength={4000} 
      />
      <Button 
        onClick={handleSend} 
        disabled={!input.trim() || isLoading || disabled || input.length > 4000} 
        className="bg-primary hover:bg-primary/80 h-10 w-10 p-0 rounded-lg shrink-0"
        size="sm"
      >
        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
      </Button>
    </div>
  );
};