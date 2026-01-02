export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      conversation_labels: {
        Row: {
          conversation_id: number
          created_at: string | null
          id: number
          label_id: number
        }
        Insert: {
          conversation_id: number
          created_at?: string | null
          id?: number
          label_id: number
        }
        Update: {
          conversation_id?: number
          created_at?: string | null
          id?: number
          label_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "conversation_labels_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_labels_label_id_fkey"
            columns: ["label_id"]
            isOneToOne: false
            referencedRelation: "labels"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          assigned_operator_id: number | null
          created_at: string | null
          customer_phone_number: string
          external_conversation_id: string
          id: number
          inbox_id: number
          last_message_at: string
          message_count: number | null
          priority_score: number | null
          resolved_at: string | null
          state: Database["public"]["Enums"]["conversation_state"]
          tenant_id: number
          updated_at: string | null
        }
        Insert: {
          assigned_operator_id?: number | null
          created_at?: string | null
          customer_phone_number: string
          external_conversation_id: string
          id?: number
          inbox_id: number
          last_message_at?: string
          message_count?: number | null
          priority_score?: number | null
          resolved_at?: string | null
          state?: Database["public"]["Enums"]["conversation_state"]
          tenant_id: number
          updated_at?: string | null
        }
        Update: {
          assigned_operator_id?: number | null
          created_at?: string | null
          customer_phone_number?: string
          external_conversation_id?: string
          id?: number
          inbox_id?: number
          last_message_at?: string
          message_count?: number | null
          priority_score?: number | null
          resolved_at?: string | null
          state?: Database["public"]["Enums"]["conversation_state"]
          tenant_id?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversations_assigned_operator_id_fkey"
            columns: ["assigned_operator_id"]
            isOneToOne: false
            referencedRelation: "operators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_inbox_id_fkey"
            columns: ["inbox_id"]
            isOneToOne: false
            referencedRelation: "inboxes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      grace_period_assignments: {
        Row: {
          conversation_id: number
          created_at: string | null
          expires_at: string
          id: number
          operator_id: number
          reason: Database["public"]["Enums"]["grace_reason"]
        }
        Insert: {
          conversation_id: number
          created_at?: string | null
          expires_at: string
          id?: number
          operator_id: number
          reason: Database["public"]["Enums"]["grace_reason"]
        }
        Update: {
          conversation_id?: number
          created_at?: string | null
          expires_at?: string
          id?: number
          operator_id?: number
          reason?: Database["public"]["Enums"]["grace_reason"]
        }
        Relationships: [
          {
            foreignKeyName: "grace_period_assignments_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: true
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grace_period_assignments_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators"
            referencedColumns: ["id"]
          },
        ]
      }
      inboxes: {
        Row: {
          created_at: string | null
          display_name: string
          id: number
          phone_number: string
          tenant_id: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          display_name: string
          id?: number
          phone_number: string
          tenant_id: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          display_name?: string
          id?: number
          phone_number?: string
          tenant_id?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inboxes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      labels: {
        Row: {
          color: string | null
          created_at: string | null
          created_by: number
          id: number
          inbox_id: number
          name: string
          tenant_id: number
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          created_by: number
          id?: number
          inbox_id: number
          name: string
          tenant_id: number
        }
        Update: {
          color?: string | null
          created_at?: string | null
          created_by?: number
          id?: number
          inbox_id?: number
          name?: string
          tenant_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "labels_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "operators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "labels_inbox_id_fkey"
            columns: ["inbox_id"]
            isOneToOne: false
            referencedRelation: "inboxes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "labels_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      operator_inbox_subscriptions: {
        Row: {
          created_at: string | null
          id: number
          inbox_id: number
          operator_id: number
        }
        Insert: {
          created_at?: string | null
          id?: number
          inbox_id: number
          operator_id: number
        }
        Update: {
          created_at?: string | null
          id?: number
          inbox_id?: number
          operator_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "operator_inbox_subscriptions_inbox_id_fkey"
            columns: ["inbox_id"]
            isOneToOne: false
            referencedRelation: "inboxes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operator_inbox_subscriptions_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators"
            referencedColumns: ["id"]
          },
        ]
      }
      operator_status: {
        Row: {
          id: number
          last_status_change_at: string | null
          operator_id: number
          status: Database["public"]["Enums"]["operator_status_type"]
        }
        Insert: {
          id?: number
          last_status_change_at?: string | null
          operator_id: number
          status?: Database["public"]["Enums"]["operator_status_type"]
        }
        Update: {
          id?: number
          last_status_change_at?: string | null
          operator_id?: number
          status?: Database["public"]["Enums"]["operator_status_type"]
        }
        Relationships: [
          {
            foreignKeyName: "operator_status_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: true
            referencedRelation: "operators"
            referencedColumns: ["id"]
          },
        ]
      }
      operators: {
        Row: {
          created_at: string | null
          email: string
          id: number
          name: string
          role: Database["public"]["Enums"]["operator_role"]
          tenant_id: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: number
          name: string
          role?: Database["public"]["Enums"]["operator_role"]
          tenant_id: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: number
          name?: string
          role?: Database["public"]["Enums"]["operator_role"]
          tenant_id?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "operators_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          created_at: string | null
          id: number
          name: string
          priority_alpha: number | null
          priority_beta: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: number
          name: string
          priority_alpha?: number | null
          priority_beta?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: number
          name?: string
          priority_alpha?: number | null
          priority_beta?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_priority_score: {
        Args: {
          p_alpha: number
          p_beta: number
          p_last_message_at: string
          p_message_count: number
        }
        Returns: number
      }
    }
    Enums: {
      conversation_state: "QUEUED" | "ALLOCATED" | "RESOLVED"
      grace_reason: "OFFLINE" | "MANUAL"
      operator_role: "OPERATOR" | "MANAGER" | "ADMIN"
      operator_status_type: "AVAILABLE" | "OFFLINE"
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
    Enums: {
      conversation_state: ["QUEUED", "ALLOCATED", "RESOLVED"],
      grace_reason: ["OFFLINE", "MANUAL"],
      operator_role: ["OPERATOR", "MANAGER", "ADMIN"],
      operator_status_type: ["AVAILABLE", "OFFLINE"],
    },
  },
} as const
