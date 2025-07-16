import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Plan } from "@/agent/planner/schema";

interface PlanRequest {
  userPrompt: string;
  chatHistory?: Array<{ role: string; content: string }>;
}

export async function fetchPlan({ userPrompt, chatHistory = [] }: PlanRequest): Promise<Plan> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new Error('User not authenticated');
  }

  const { data, error } = await supabase.functions.invoke('ai-planner', {
    body: { userPrompt, chatHistory },
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
  });

  if (error) {
    throw new Error(error.message || "Failed to generate plan");
  }
  
  return data;
}

export function usePlan() {
  return useMutation({
    mutationFn: fetchPlan,
    onError: (err) => console.error("Plan generation error:", err),
  });
}