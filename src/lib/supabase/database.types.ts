// Generated from the Supabase schema (unused helper types trimmed).
// Do not edit by hand; regenerate after each migration.
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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      branches: {
        Row: {
          id: number
          name: string
          slug: string
          sort_order: number
        }
        Insert: {
          id?: never
          name: string
          slug: string
          sort_order?: number
        }
        Update: {
          id?: never
          name?: string
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      colleges: {
        Row: {
          city: string
          email_domain: string | null
          id: number
          name: string
        }
        Insert: {
          city?: string
          email_domain?: string | null
          id?: never
          name: string
        }
        Update: {
          city?: string
          email_domain?: string | null
          id?: never
          name?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          birth_year: number | null
          branch_id: number | null
          college_id: number | null
          college_other: string | null
          consent_version: string | null
          consented_at: string | null
          created_at: string
          degree: Database["public"]["Enums"]["degree"] | null
          display_name: string | null
          graduation_year: number | null
          id: string
          onboarded_at: string | null
          status: Database["public"]["Enums"]["account_status"]
          updated_at: string
          year_of_study: number | null
        }
        Insert: {
          birth_year?: number | null
          branch_id?: number | null
          college_id?: number | null
          college_other?: string | null
          consent_version?: string | null
          consented_at?: string | null
          created_at?: string
          degree?: Database["public"]["Enums"]["degree"] | null
          display_name?: string | null
          graduation_year?: number | null
          id: string
          onboarded_at?: string | null
          status?: Database["public"]["Enums"]["account_status"]
          updated_at?: string
          year_of_study?: number | null
        }
        Update: {
          birth_year?: number | null
          branch_id?: number | null
          college_id?: number | null
          college_other?: string | null
          consent_version?: string | null
          consented_at?: string | null
          created_at?: string
          degree?: Database["public"]["Enums"]["degree"] | null
          display_name?: string | null
          graduation_year?: number | null
          id?: string
          onboarded_at?: string | null
          status?: Database["public"]["Enums"]["account_status"]
          updated_at?: string
          year_of_study?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_college_id_fkey"
            columns: ["college_id"]
            isOneToOne: false
            referencedRelation: "colleges"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      complete_onboarding: {
        Args: {
          p_birth_year: number
          p_branch_id: number
          p_college_id: number
          p_college_other: string
          p_consent_version: string
          p_degree: Database["public"]["Enums"]["degree"]
          p_display_name: string
          p_graduation_year: number
          p_year_of_study: number
        }
        Returns: undefined
      }
    }
    Enums: {
      account_status: "active" | "suspended" | "banned"
      degree: "btech" | "be"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      account_status: ["active", "suspended", "banned"],
      degree: ["btech", "be"],
    },
  },
} as const
