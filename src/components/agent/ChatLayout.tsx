import React, { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { ChatWindow } from "@/components/chat/ChatWindow";
import { useChatStore } from "@/store/useChatStore";

export const ChatLayout: React.FC = () => {
  const [searchParams] = useSearchParams();
  const { load: loadConversation } = useChatStore();

  // Handle URL-based conversation loading
  useEffect(() => {
    const convId = searchParams.get('conv');
    if (convId) {
      loadConversation(convId);
    }
  }, [searchParams, loadConversation]);

  return (
    <div className="h-screen w-full flex flex-col bg-background overflow-hidden">
      <div className="flex-1 min-h-0 w-full overflow-hidden">
        <ChatWindow />
      </div>
    </div>
  );
};