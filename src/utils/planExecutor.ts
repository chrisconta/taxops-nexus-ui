import Ajv from "ajv";
import addFormats from "ajv-formats";
import { toolRegistry } from "@/agent/tools/index";
import { useChatStore } from "@/store/useChatStore";
import { useUIStore } from "@/stores/uiStore";
import { supabase, SUPABASE_URL } from "@/integrations/supabase/client";
import type { Plan } from "@/agent/planner/schema";

const ajv = new Ajv({ allErrors: true, strict: true });
addFormats(ajv);

async function invokeTool(toolName: string, params: Record<string, any>) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  const response = await fetch(`${SUPABASE_URL}/functions/v1/agent-tool-execute`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      toolName,
      params
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Tool execution failed: ${errorText}`);
  }

  return response.json();
}

export async function executePlanSequentially(plan: Plan) {
  const { addMessage, setRecovery, recovery } = useChatStore.getState();
  const { openSidebar } = useUIStore.getState();
  
  // Open the sidebar to show chat during plan execution
  openSidebar();
  
  // Navigate to appropriate page based on the plan's first tool
  const firstTool = plan.steps[0]?.toolName;
  if (firstTool) {
    const pageMapping: Record<string, string> = {
      'register_client': '/clients',
      'create_connection': '/connections', 
      'build_dashboard': '/analytics',
      'sync_data': '/connections',
      'generate_report': '/reports'
    };
    
    const targetPage = pageMapping[firstTool];
    if (targetPage && window.location.pathname !== targetPage) {
      // Use history API to navigate without page reload
      window.history.pushState({}, '', targetPage);
      // Dispatch a popstate event to trigger router navigation
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  }

  for (const step of plan.steps) {
    // Skip already completed steps when recovering
    if (recovery.pendingStep && recovery.pendingStep.stepId !== step.stepId) {
      continue;
    }

    // 1) Validate parameters
    const schema = toolRegistry[step.toolName as keyof typeof toolRegistry];
    if (schema) {
      const validate = ajv.compile(schema);
      if (!validate(step.params)) {
        console.error("Validation failed for step:", step.toolName, "Errors:", validate.errors);
        const err = validate.errors?.find((e) => e.keyword === "required");
        const missing = err?.params?.missingProperty as string;
        if (missing) {
          // 2) Prompt user for the missing field
          addMessage({
            id: crypto.randomUUID(),
            author: "agent",
            content: `⚠️ The "${step.toolName}" step is missing the required field "${missing}". Please provide that now.`,
            timestamp: Date.now(),
          });
          setRecovery({ pendingStep: step, missingField: missing });
          return; // pause execution
        } else {
          // Other validation errors
          addMessage({
            id: crypto.randomUUID(),
            author: "agent", 
            content: `❌ Parameter validation failed for "${step.toolName}": ${validate.errors?.map(e => e.message).join(', ')}`,
            timestamp: Date.now(),
          });
          return;
        }
      }
    }

    // 3) Execute the step
    addMessage({
      id: crypto.randomUUID(),
      author: "agent",
      content: `⚡ Step: ${step.description}`,
      timestamp: Date.now(),
    });
    
    try {
      await invokeTool(step.toolName, step.params);
      addMessage({
        id: crypto.randomUUID(),
        author: "agent",
        content: `✅ Step completed successfully.`,
        timestamp: Date.now(),
      });

      // Prompt for step feedback
      addMessage({
        id: crypto.randomUUID(),
        author: "agent",
        content: `How did the step "${step.toolName}" go? (👍/👎) You can add a comment.`,
        timestamp: Date.now(),
      });
      setRecovery({});
      useChatStore.getState().setFeedbackContext({
        lastPlanId: plan.intent || crypto.randomUUID(),
        lastStepId: step.stepId,
        toolName: step.toolName,
      });
    } catch (err: any) {
      addMessage({
        id: crypto.randomUUID(),
        author: "agent",
        content: `❌ Step failed: ${err.message || "Unknown error"}. Execution halted.`,
        timestamp: Date.now(),
      });
      return;
    }

    // Clear any recovery state after a successful step
    setRecovery({});
  }

  addMessage({
    id: crypto.randomUUID(),
    author: "agent",
    content: `🎉 Plan execution completed successfully! All steps finished.`,
    timestamp: Date.now(),
  });

  // Prompt for overall plan feedback
  addMessage({
    id: crypto.randomUUID(),
    author: "agent",
    content: `Overall plan is complete—was this helpful? (👍/👎)`,
    timestamp: Date.now(),
  });
  useChatStore.getState().setFeedbackContext({
    lastPlanId: plan.intent || crypto.randomUUID(),
    lastStepId: undefined,
    toolName: "plan_execution",
  });
}