
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { SystemTool } from '@/hooks/useSystemTools';
import type { WorkflowState } from '@/hooks/useWorkflowBuilder';

export interface AllToolsResult {
  systemTools: SystemTool[];
  workflowTools: (WorkflowState & { id: string; created_at: string; updated_at: string })[];
  isLoading: boolean;
  refreshTools: () => void;
}

export const useAllTools = (): AllToolsResult => {
  const [systemTools, setSystemTools] = useState<SystemTool[]>([]);
  const [workflowTools, setWorkflowTools] = useState<(WorkflowState & { id: string; created_at: string; updated_at: string })[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const loadAllTools = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Load system tools
      const { data: systemData, error: systemError } = await supabase
        .from('system_modules')
        .select('*')
        .eq('enabled', true)
        .order('category', { ascending: true });

      if (systemError) throw systemError;

      const formattedSystemTools: SystemTool[] = (systemData || []).map(tool => ({
        id: tool.id,
        name: tool.name,
        description: tool.description || '',
        category: tool.category,
        capabilities: Array.isArray(tool.capabilities) ? 
          tool.capabilities.map(cap => String(cap)) : 
          typeof tool.capabilities === 'string' ? [tool.capabilities] : [],
        input_schema: tool.input_schema,
        output_schema: tool.output_schema,
        enabled: tool.enabled,
        created_at: tool.created_at,
        updated_at: tool.updated_at
      }));

      // Load workflow tools
      const { data: workflowData, error: workflowError } = await supabase
        .from('tool_workflows')
        .select('*')
        .order('updated_at', { ascending: false });

      if (workflowError) throw workflowError;

      const formattedWorkflowTools = (workflowData || []).map(workflow => ({
        id: workflow.id,
        name: workflow.name,
        description: workflow.description || '',
        nodes: typeof workflow.nodes === 'string' ? JSON.parse(workflow.nodes) : (workflow.nodes || []),
        connections: typeof workflow.connections === 'string' ? JSON.parse(workflow.connections) : (workflow.connections || []),
        status: workflow.status as 'draft' | 'active' | 'archived',
        metadata: typeof workflow.metadata === 'string' ? JSON.parse(workflow.metadata) : (workflow.metadata || {}),
        created_at: workflow.created_at,
        updated_at: workflow.updated_at
      }));

      setSystemTools(formattedSystemTools);
      setWorkflowTools(formattedWorkflowTools);
    } catch (error) {
      console.error('Error loading tools:', error);
      toast({
        title: "Error",
        description: "Failed to load tools",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadAllTools();
  }, [loadAllTools]);

  return {
    systemTools,
    workflowTools,
    isLoading,
    refreshTools: loadAllTools
  };
};
