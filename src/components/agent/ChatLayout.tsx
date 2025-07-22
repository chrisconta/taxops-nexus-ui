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
    <div className="w-full flex flex-col bg-background overflow-hidden max-w-full h-[calc(100vh-var(--header-height))]">
      <div className="flex-1 min-h-0 w-full overflow-hidden max-w-full">
        <div className="h-full w-full max-w-full overflow-hidden">
          <ChatWindow />
        </div>
      </div>
    </div>
  );
};