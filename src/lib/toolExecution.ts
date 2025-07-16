import { supabase } from "@/integrations/supabase/client";
import type { ToolName } from "@/agent/tools";

export interface ToolExecutionResult {
  success: boolean;
  result?: any;
  error?: string;
  details?: string;
}

export async function executeToolOnServer(
  toolName: ToolName,
  params: Record<string, any>
): Promise<ToolExecutionResult> {
  try {
    // Get current session for auth
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      throw new Error('User not authenticated');
    }

    // Call the edge function with auth header
    const { data, error } = await supabase.functions.invoke('agent-tool-execute', {
      body: { toolName, params },
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    if (error) {
      console.error('Tool execution error:', error);
      return {
        success: false,
        error: 'Tool execution failed',
        details: error.message
      };
    }

    return data;
  } catch (error: any) {
    console.error('Tool execution error:', error);
    return {
      success: false,
      error: 'Tool execution failed',
      details: error.message
    };
  }
}

// Hook for getting tool execution logs
export async function getToolLogs(limit: number = 50) {
  const { data, error } = await supabase
    .from('agent_tool_logs')
    .select('*')
    .order('invoked_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching tool logs:', error);
    return [];
  }

  return data || [];
}