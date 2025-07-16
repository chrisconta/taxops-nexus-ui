import { ReactNode, useEffect } from "react";
import { useAgentStore } from "@/stores/agentStore";

export function AgentProvider({ children }: { children: ReactNode }) {
  const init = useAgentStore((state) => state.init);
  
  useEffect(() => {
    // Parse URL parameters for conversation ID
    const convId = new URLSearchParams(window.location.search).get("conv");
    init({ conversationId: convId });
  }, [init]);
  
  return <>{children}</>;
}