
import React from "react";
import { useUIStore } from "@/stores/uiStore";
import { useLocation } from "react-router-dom";
import { MessageSquare } from "lucide-react";

export const FloatingChatButton: React.FC = () => {
  const { toggleSidebar } = useUIStore();
  const location = useLocation();
  
  // Don't show the floating button when user is on the AI assistant page
  if (location.pathname === '/ai-assistant') {
    return null;
  }
  
  return (
    <button
      onClick={toggleSidebar}
      className="
        fixed bottom-6 right-6 p-4 rounded-full bg-primary text-primary-foreground
        shadow-lg hover:bg-primary/90 focus:outline-none focus:ring-2
        focus:ring-offset-2 focus:ring-primary z-40 transition-all duration-200
        hover:scale-105 active:scale-95
      "
      aria-label="Open chat assistant"
    >
      <MessageSquare size={24} />
    </button>
  );
};
