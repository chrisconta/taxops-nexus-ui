import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Brain } from "lucide-react";
import { Card } from "@/components/ui/card";
import { ChatWindow } from "@/components/chat/ChatWindow";
import { useChatStore } from "@/store/useChatStore";

const Assistant = () => {
  const [searchParams] = useSearchParams();
  const { load } = useChatStore();
  
  useEffect(() => {
    const convId = searchParams.get('conv');
    if (convId) {
      load(convId);
    }
  }, [searchParams, load]);

  return (
    <div className="h-full flex flex-col">
      <Card className="flex-1 bg-glass-bg/50 backdrop-blur-xl border-glass-border shadow-glass overflow-hidden flex flex-col">
        {/* Chat Header */}
        <div className="p-6 border-b border-glass-border bg-gradient-to-r from-primary/10 to-primary/5">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-gradient-to-br from-primary to-primary/80 rounded-xl flex items-center justify-center animate-glow-pulse">
              <Brain className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">AI Tax Assistant</h2>
              <p className="text-sm text-taxops-gray-light">Ready to help you with your questions</p>
            </div>
          </div>
        </div>

        <ChatWindow />
      </Card>
    </div>
  );
};

export default Assistant;