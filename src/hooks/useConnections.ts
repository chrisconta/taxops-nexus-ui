import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface ConnectionType {
  id: string;
  connection_type: string;
  title: string;
  category: string;
  description?: string;
  enabled: boolean;
}

export interface ClientCredential {
  id: string;
  client_id: string;
  code: string;
  name: string;
  credentials: any;
  status: 'connected' | 'not-connected' | 'error';
  created_at: string;
  updated_at: string;
}

// Hook to fetch all available connection types
export const useConnectionTypes = () => {
  return useQuery({
    queryKey: ['connection-types'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('connections')
        .select('*')
        .eq('enabled', true)
        .order('title');
      
      if (error) throw error;
      return data as ConnectionType[];
    },
  });
};

// Hook to fetch client credentials for a specific client
export const useClientCredentials = (clientId: string) => {
  return useQuery({
    queryKey: ['client-credentials', clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('client_credentials')
        .select('*')
        .eq('client_id', clientId)
        .order('name');
      
      if (error) throw error;
      return data as ClientCredential[];
    },
    enabled: !!clientId,
  });
};

// Hook to save client credentials
export const useSaveClientCredentials = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (params: {
      clientId: string;
      connectionCode: string;
      credentials: any;
      connectionName?: string;
    }) => {
      const { data, error } = await supabase.rpc('save_client_credentials', {
        p_client_id: params.clientId,
        p_connection_code: params.connectionCode,
        p_credentials: params.credentials,
        p_connection_name: params.connectionName,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      // Invalidate and refetch client credentials
      queryClient.invalidateQueries({ 
        queryKey: ['client-credentials', variables.clientId] 
      });
      
      toast({
        title: "Success",
        description: "Connection credentials saved successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to save credentials: ${error.message}`,
        variant: "destructive",
      });
    },
  });
};

// Hook to update connection status
export const useUpdateConnectionStatus = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (params: {
      clientId: string;
      connectionCode: string;
      status: 'connected' | 'not-connected' | 'error';
      lastSyncAt?: string;
    }) => {
      const { data, error } = await supabase.rpc('update_connection_status', {
        p_client_id: params.clientId,
        p_connection_code: params.connectionCode,
        p_status: params.status,
        p_last_sync_at: params.lastSyncAt,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ 
        queryKey: ['client-credentials', variables.clientId] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['clients'] 
      });
      
      toast({
        title: "Success",
        description: "Connection status updated successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to update status: ${error.message}`,
        variant: "destructive",
      });
    },
  });
};

// Hook to test a connection (placeholder for future implementation)
export const useTestConnection = () => {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (params: {
      connectionType: string;
      credentials: any;
    }) => {
      // This is a placeholder - you'll implement the actual connection testing logic
      // based on the specific connection type (QuickBooks, SAT, etc.)
      
      // Simulate connection test
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // For now, randomly succeed or fail for demo purposes
      if (Math.random() > 0.3) {
        return { success: true, message: 'Connection test successful' };
      } else {
        throw new Error('Connection test failed - please check your credentials');
      }
    },
    onSuccess: (result) => {
      toast({
        title: "Connection Test",
        description: result.message,
      });
    },
    onError: (error) => {
      toast({
        title: "Connection Test Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};