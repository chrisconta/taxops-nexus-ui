import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Plan } from "@/agent/planner/schema";

interface PlanRequest {
  intent: string;
  params: Record<string, any>;
}

// Custom error class for validation errors
export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export interface ValidationErrorResponse {
  missing: Array<{ field: string; reason: string; hint: string }>;
  invalid: Array<{ field: string; reason: string; hint: string }>;
}

function isPlanResponse(data: any): data is Plan {
  return data && typeof data === 'object' && typeof data.tool === 'string';
}

export async function fetchPlan({ intent, params }: PlanRequest): Promise<Plan> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new Error('User not authenticated');
  }

  const { data, error } = await supabase.functions.invoke('ai-planner', {
    body: { intent, params },
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
  });

  if (error) {
    throw new Error(error.message || "Failed to generate plan");
  }

  // Validate that we received a proper plan
  if (!isPlanResponse(data)) {
    throw new Error("Invalid plan response from server");
  }
  
  return data;
}

export function usePlan() {
  return useMutation({
    mutationFn: fetchPlan,
    onError: (err) => console.error("Plan generation error:", err),
  });
}