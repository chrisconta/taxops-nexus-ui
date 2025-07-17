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
    <div className="flex space-x-3 p-1">{/* Added p-1 to prevent focus ring clipping */}
      <Input 
        value={input} 
        onChange={e => setInput(e.target.value)} 
        placeholder={`${placeholder} (max 4000 chars)`}
        className="flex-1 bg-glass-bg/20 border-glass-border text-white placeholder:text-taxops-gray-light h-16 text-lg" 
        onKeyPress={handleKeyPress} 
        disabled={isLoading || disabled} 
        maxLength={4000} 
      />
      <Button 
        onClick={handleSend} 
        disabled={!input.trim() || isLoading || disabled || input.length > 4000} 
        className="bg-primary hover:bg-primary/80 h-16 px-6"
      >
        {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
      </Button>
    </div>
  );
};