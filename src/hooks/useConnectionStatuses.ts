import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface ConnectionStatus {
  connectionId: string;
  status: "connected" | "not-connected" | "error";
  errorDetails?: string;
  lastSyncAt?: string;
}

export const useConnectionStatuses = () => {
  const [statuses, setStatuses] = useState<ConnectionStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchConnectionStatuses = async () => {
    try {
      setLoading(true);
      
      // Get all client credentials with their statuses
      const { data: credentials, error: credentialsError } = await supabase
        .from("client_credentials")
        .select(`
          code,
          status,
          updated_at,
          client_id,
          clients!inner(
            name,
            last_sync_at,
            last_sync_successful
          )
        `);

      if (credentialsError) throw credentialsError;

      // Aggregate statuses by connection code
      const statusMap = new Map<string, ConnectionStatus>();

      credentials?.forEach((cred) => {
        const connectionId = cred.code;
        const existing = statusMap.get(connectionId);

        // Determine overall status priority: error > connected > not-connected
        let overallStatus: "connected" | "not-connected" | "error" = "not-connected";
        let errorDetails: string | undefined;
        let lastSyncAt: string | undefined;

        if (cred.status === "error") {
          overallStatus = "error";
          errorDetails = "Connection authentication failed or sync error occurred";
        } else if (cred.status === "connected") {
          overallStatus = "connected";
          lastSyncAt = cred.clients?.last_sync_at || cred.updated_at;
        }

        // If we already have a status for this connection, merge intelligently
        if (existing) {
          // Error status takes highest priority
          if (existing.status === "error" || overallStatus === "error") {
            overallStatus = "error";
            errorDetails = existing.errorDetails || errorDetails;
          }
          // Connected takes priority over not-connected
          else if (existing.status === "connected" || overallStatus === "connected") {
            overallStatus = "connected";
            lastSyncAt = existing.lastSyncAt || lastSyncAt;
          }
        }

        statusMap.set(connectionId, {
          connectionId,
          status: overallStatus,
          errorDetails,
          lastSyncAt
        });
      });

      setStatuses(Array.from(statusMap.values()));
    } catch (err) {
      console.error("Error fetching connection statuses:", err);
      setError("Failed to load connection statuses");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConnectionStatuses();

    // Set up real-time subscription for status updates
    const channel = supabase
      .channel('connection-status-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'client_credentials'
        },
        () => {
          fetchConnectionStatuses();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { statuses, loading, error, refetch: fetchConnectionStatuses };
};