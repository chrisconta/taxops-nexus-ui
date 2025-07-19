
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface SystemTool {
  id: string;
  name: string;
  description: string;
  category: string;
  capabilities: string[];
  input_schema: any;
  output_schema: any;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

export const useSystemTools = () => {
  const [systemTools, setSystemTools] = useState<SystemTool[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const loadSystemTools = useCallback(async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('system_modules')
        .select('*')
        .eq('enabled', true)
        .in('name', ['register_client', 'create_connection', 'build_dashboard'])
        .order('category', { ascending: true });

      if (error) throw error;

      setSystemTools(data || []);
    } catch (error) {
      console.error('Error loading system tools:', error);
      toast({
        title: "Error",
        description: "Failed to load system tools",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadSystemTools();
  }, [loadSystemTools]);

  return {
    systemTools,
    isLoading,
    refreshSystemTools: loadSystemTools
  };
};
