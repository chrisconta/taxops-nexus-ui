import { ChatWindow } from "@/components/chat/ChatWindow";
import { AgentProvider } from "@/components/AgentUI";

export default function ReportsChat() {
  return (
    <AgentProvider>
      <div className="h-screen w-screen bg-background flex flex-col">
        <div className="flex-1 overflow-hidden">
          <ChatWindow fullScreen />
        </div>
      </div>
    </AgentProvider>
  );
}