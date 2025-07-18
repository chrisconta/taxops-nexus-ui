import { useChatStore } from "@/store/useChatStore";
import { executeTool } from "@/api/agent";
import type { Plan } from "@/agent/planner/schema";

export async function executePlan(plan: Plan) {
  const { addMessage } = useChatStore.getState();
  addMessage({
    id: crypto.randomUUID(),
    author: "agent",
    content: `Executing ${plan.tool}...`,
    timestamp: Date.now(),
  });

  try {
    const result = await executeTool({ toolName: plan.tool, params: plan.params });
    addMessage({
      id: crypto.randomUUID(),
      author: "agent",
      content: `Result: ${JSON.stringify(result)}`,
      timestamp: Date.now(),
    });
  } catch (err: any) {
    addMessage({
      id: crypto.randomUUID(),
      author: "agent",
      content: `Error: ${err.message}`,
      timestamp: Date.now(),
    });
  }
}
