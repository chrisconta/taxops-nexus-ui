import type { ToolName } from "@/agent/tools";

export interface PlanStep {
  stepId: string;            // unique UUID for the step
  toolName: ToolName;        // must match one of the registered tools
  params: Record<string, any>;
  description: string;       // human-readable summary
}

export interface Plan {
  intent: string;            // the user's high‐level request
  steps: PlanStep[];         // ordered list of steps
}