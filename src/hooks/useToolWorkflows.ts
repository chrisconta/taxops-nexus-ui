
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { WorkflowState } from './useWorkflowBuilder';

type ToolWorkflow = WorkflowState & { 
  id: string; 
  created_at: string; 
  updated_at: string; 
};

export const useToolWorkflows = () => {
  const [tools, setTools] = useState<ToolWorkflow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const loadTools = useCallback(async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('tool_workflows')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;

      const formattedTools: ToolWorkflow[] = data.map(workflow => ({
        id: workflow.id,
        name: workflow.name,
        description: workflow.description || '',
        nodes: workflow.nodes || [],
        connections: workflow.connections || [],
        status: workflow.status as 'draft' | 'active' | 'archived',
        metadata: workflow.metadata || {},
        created_at: workflow.created_at,
        updated_at: workflow.updated_at
      }));

      setTools(formattedTools);
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
    loadTools();
  }, [loadTools]);

  const refreshTools = useCallback(() => {
    loadTools();
  }, [loadTools]);

  return {
    tools,
    isLoading,
    refreshTools
  };
};
