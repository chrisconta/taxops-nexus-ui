import { supabase } from "@/integrations/supabase/client";

export interface ExecuteToolPayload {
  toolName: string;
  params: unknown;
}

export async function executeTool({
  toolName,
  params,
}: ExecuteToolPayload): Promise<{
  success: boolean;
  result: unknown;
}> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new Error('User not authenticated');
  }

  const { data, error } = await supabase.functions.invoke('agent-tool-execute', {
    body: { toolName, params },
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
  });

  if (error) {
    throw new Error(error.message || "Tool execution failed");
  }
  
  return data;
}