import React, { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { ChatWindow } from "@/components/chat/ChatWindow";
import { ReportsTabs } from "@/components/ReportsTabs";
import { useFeatureFlag } from "@/hooks/useFeatureFlag";
import { useChatStore } from "@/store/useChatStore";

export const ChatLayout: React.FC = () => {
  const [searchParams] = useSearchParams();
  const { load: loadConversation } = useChatStore();
  const enabled = useFeatureFlag("VITE_AGENT_UI_ENABLED");
  
  console.log('ChatLayout - enabled:', enabled);

  // Handle URL-based conversation loading
  useEffect(() => {
    const convId = searchParams.get('conv');
    if (enabled && convId) {
      loadConversation(convId);
    }
  }, [enabled, searchParams, loadConversation]);

  return enabled ? (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      <div className="flex-1 min-h-0 overflow-hidden">
        <ChatWindow />
      </div>
    </div>
  ) : (
    <ReportsTabs />
  );
};