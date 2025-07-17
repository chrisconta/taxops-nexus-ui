import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Plan } from "@/agent/planner/schema";

interface PlanRequest {
  userPrompt: string;
  chatHistory?: Array<{ role: string; content: string }>;
}

// Custom error class for validation errors
export class ValidationError extends Error {
  constructor(
    message: string,
    public details: string,
    public validationResponse: ValidationErrorResponse
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

// Interface for validation error response
export interface ValidationErrorResponse {
  missing: Array<{ field: string; reason: string; hint: string }>;
  invalid: Array<{ field: string; reason: string; hint: string }>;
}

function isValidationErrorResponse(data: any): data is ValidationErrorResponse {
  return data && 
    typeof data === 'object' && 
    Array.isArray(data.missing) && 
    Array.isArray(data.invalid);
}

function isPlanResponse(data: any): data is Plan {
  return data && 
    typeof data === 'object' && 
    typeof data.intent === 'string' && 
    Array.isArray(data.steps);
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

  // Check if response is a validation error
  if (isValidationErrorResponse(data)) {
    const missingFields = data.missing.map(m => m.field).join(', ');
    const invalidFields = data.invalid.map(i => i.field).join(', ');
    
    let details = '';
    if (missingFields) {
      details += `Missing required fields: ${missingFields}`;
    }
    if (invalidFields) {
      details += `${missingFields ? '. ' : ''}Invalid fields: ${invalidFields}`;
    }
    
    throw new ValidationError("Cannot generate plan", details, data);
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