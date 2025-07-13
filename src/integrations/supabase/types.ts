export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      client_credentials: {
        Row: {
          client_id: string
          code: string
          created_at: string
          credentials: Json | null
          id: string
          name: string
          status: string | null
          updated_at: string
        }
        Insert: {
          client_id: string
          code: string
          created_at?: string
          credentials?: Json | null
          id?: string
          name: string
          status?: string | null
          updated_at?: string
        }
        Update: {
          client_id?: string
          code?: string
          created_at?: string
          credentials?: Json | null
          id?: string
          name?: string
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_credentials_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          created_at: string
          email: string
          id: string
          last_sync: string | null
          last_sync_at: string | null
          last_sync_successful: boolean | null
          name: string
          rfc: string
          sat_status: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          last_sync?: string | null
          last_sync_at?: string | null
          last_sync_successful?: boolean | null
          name: string
          rfc: string
          sat_status?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          last_sync?: string | null
          last_sync_at?: string | null
          last_sync_successful?: boolean | null
          name?: string
          rfc?: string
          sat_status?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      connections: {
        Row: {
          category: string
          config: Json | null
          connection_type: string
          created_at: string
          description: string | null
          enabled: boolean | null
          id: string
          status: string | null
          title: string
          updated_at: string
        }
        Insert: {
          category: string
          config?: Json | null
          connection_type: string
          created_at?: string
          description?: string | null
          enabled?: boolean | null
          id?: string
          status?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          config?: Json | null
          connection_type?: string
          created_at?: string
          description?: string | null
          enabled?: boolean | null
          id?: string
          status?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      reports: {
        Row: {
          client_id: string | null
          content: Json | null
          created_at: string
          id: string
          report_type: string
          status: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          client_id?: string | null
          content?: Json | null
          created_at?: string
          id?: string
          report_type: string
          status?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          client_id?: string | null
          content?: Json | null
          created_at?: string
          id?: string
          report_type?: string
          status?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      subscribers: {
        Row: {
          created_at: string
          email: string
          id: string
          stripe_customer_id: string | null
          subscribed: boolean
          subscription_end: string | null
          subscription_tier: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          stripe_customer_id?: string | null
          subscribed?: boolean
          subscription_end?: string | null
          subscription_tier?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          stripe_customer_id?: string | null
          subscribed?: boolean
          subscription_end?: string | null
          subscription_tier?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      sync_logs: {
        Row: {
          client_id: string
          created_at: string
          error_message: string | null
          execution_time_ms: number | null
          id: string
          records_processed: number | null
          status: string
          sync_request_id: string
        }
        Insert: {
          client_id: string
          created_at?: string
          error_message?: string | null
          execution_time_ms?: number | null
          id?: string
          records_processed?: number | null
          status: string
          sync_request_id: string
        }
        Update: {
          client_id?: string
          created_at?: string
          error_message?: string | null
          execution_time_ms?: number | null
          id?: string
          records_processed?: number | null
          status?: string
          sync_request_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sync_logs_sync_request_id_fkey"
            columns: ["sync_request_id"]
            isOneToOne: false
            referencedRelation: "sync_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      sync_requests: {
        Row: {
          client_ids: string[]
          connection_code: string
          created_at: string
          end_date: string | null
          error_message: string | null
          frequency: string | null
          id: string
          last_run_at: string | null
          next_run_at: string | null
          start_date: string | null
          status: string
          sync_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          client_ids: string[]
          connection_code: string
          created_at?: string
          end_date?: string | null
          error_message?: string | null
          frequency?: string | null
          id?: string
          last_run_at?: string | null
          next_run_at?: string | null
          start_date?: string | null
          status?: string
          sync_type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          client_ids?: string[]
          connection_code?: string
          created_at?: string
          end_date?: string | null
          error_message?: string | null
          frequency?: string | null
          id?: string
          last_run_at?: string | null
          next_run_at?: string | null
          start_date?: string | null
          status?: string
          sync_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount_cents: number
          client_id: string
          counterparty: string | null
          created_at: string | null
          id: string
          note: string | null
          posted_at: string
          raw: Json | null
          status: string | null
          sync_request_id: string
        }
        Insert: {
          amount_cents: number
          client_id: string
          counterparty?: string | null
          created_at?: string | null
          id?: string
          note?: string | null
          posted_at: string
          raw?: Json | null
          status?: string | null
          sync_request_id: string
        }
        Update: {
          amount_cents?: number
          client_id?: string
          counterparty?: string | null
          created_at?: string | null
          id?: string
          note?: string | null
          posted_at?: string
          raw?: Json | null
          status?: string | null
          sync_request_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_sync_request_id_fkey"
            columns: ["sync_request_id"]
            isOneToOne: false
            referencedRelation: "sync_requests"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      decrypt_credentials: {
        Args: { encrypted_data: string }
        Returns: Json
      }
      encrypt_credentials: {
        Args: { data: Json; key_id?: string }
        Returns: string
      }
      save_client_credentials: {
        Args: {
          p_client_id: string
          p_connection_code: string
          p_credentials: Json
          p_connection_name?: string
        }
        Returns: string
      }
      update_connection_status: {
        Args: {
          p_client_id: string
          p_connection_code: string
          p_status: string
          p_last_sync_at?: string
        }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
