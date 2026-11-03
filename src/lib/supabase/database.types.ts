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
      github_snapshots: {
        Row: {
          account_created_on: string | null
          calendar: Json
          contributions_total: number
          followers: number
          languages: Json
          login: string
          public_repos: number
          synced_at: string
          top_repos: Json
          user_id: string
        }
        Insert: {
          account_created_on?: string | null
          calendar: Json
          contributions_total: number
          followers: number
          languages: Json
          login: string
          public_repos: number
          synced_at?: string
          top_repos: Json
          user_id: string
        }
        Update: {
          account_created_on?: string | null
          calendar?: Json
          contributions_total?: number
          followers?: number
          languages?: Json
          login?: string
          public_repos?: number
          synced_at?: string
          top_repos?: Json
          user_id?: string
        }
        Relationships: []
      }
      hackathon_interest: {
        Row: {
          created_at: string
          hackathon_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          hackathon_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          hackathon_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hackathon_interest_hackathon_id_fkey"
            columns: ["hackathon_id"]
            isOneToOne: false
            referencedRelation: "hackathons"
            referencedColumns: ["id"]
          },
        ]
      }
      hackathons: {
        Row: {
          city: string | null
          created_at: string
          created_by: string | null
          ends_on: string
          id: string
          merged_into: string | null
          mode: Database["public"]["Enums"]["hackathon_mode"]
          name: string
          organizer: string | null
          starts_on: string
          status: Database["public"]["Enums"]["hackathon_status"]
          updated_at: string
          url: string | null
        }
        Insert: {
          city?: string | null
          created_at?: string
          created_by?: string | null
          ends_on: string
          id?: string
          merged_into?: string | null
          mode?: Database["public"]["Enums"]["hackathon_mode"]
          name: string
          organizer?: string | null
          starts_on: string
          status?: Database["public"]["Enums"]["hackathon_status"]
          updated_at?: string
          url?: string | null
        }
        Update: {
          city?: string | null
          created_at?: string
          created_by?: string | null
          ends_on?: string
          id?: string
          merged_into?: string | null
          mode?: Database["public"]["Enums"]["hackathon_mode"]
          name?: string
          organizer?: string | null
          starts_on?: string
          status?: Database["public"]["Enums"]["hackathon_status"]
          updated_at?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hackathons_merged_into_fkey"
            columns: ["merged_into"]
            isOneToOne: false
            referencedRelation: "hackathons"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_roles: {
        Row: {
          role_id: number
          user_id: string
        }
        Insert: {
          role_id: number
          user_id: string
        }
        Update: {
          role_id?: number
          user_id?: string
        }
        Relationships: []
      }
      profile_skills: {
        Row: {
          level: Database["public"]["Enums"]["skill_level"]
          skill_id: number
          user_id: string
        }
        Insert: {
          level?: Database["public"]["Enums"]["skill_level"]
          skill_id: number
          user_id: string
        }
        Update: {
          level?: Database["public"]["Enums"]["skill_level"]
          skill_id?: number
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          github_connected_at: string | null
          github_id: number | null
          bio: string | null
          github_username: string | null
          linkedin_url: string | null
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
          github_connected_at?: string | null
          github_id?: number | null
          bio?: string | null
          github_username?: string | null
          linkedin_url?: string | null
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
          github_connected_at?: string | null
          github_id?: number | null
          bio?: string | null
          github_username?: string | null
          linkedin_url?: string | null
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
      roles: {
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
      skills: {
        Row: {
          category: Database["public"]["Enums"]["skill_category"]
          id: number
          name: string
          slug: string
          sort_order: number
        }
        Insert: {
          category: Database["public"]["Enums"]["skill_category"]
          id?: never
          name: string
          slug: string
          sort_order?: number
        }
        Update: {
          category?: Database["public"]["Enums"]["skill_category"]
          id?: never
          name?: string
          slug?: string
          sort_order?: number
        }
        Relationships: []
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
      get_profile: {
        Args: { p_id: string }
        Returns: {
          bio: string
          branch_name: string
          college_name: string
          degree: Database["public"]["Enums"]["degree"]
          display_name: string
          github: Json
          github_username: string
          github_verified: boolean
          graduation_year: number
          id: string
          is_me: boolean
          linkedin_url: string
          roles: Json
          skills: Json
          year_of_study: number
        }[]
      }
      connect_github: { Args: { p_token: string }; Returns: undefined }
      disconnect_github: { Args: never; Returns: undefined }
      set_linkedin_url: { Args: { p_url: string }; Returns: undefined }
      save_profile: {
        Args: {
          p_bio: string
          p_branch_id: number
          p_display_name: string
          p_graduation_year: number
          p_linkedin_url: string
          p_role_ids: number[]
          p_skills: Json
          p_year_of_study: number
        }
        Returns: undefined
      }
      create_hackathon: {
        Args: {
          p_city: string
          p_ends_on: string
          p_mode: Database["public"]["Enums"]["hackathon_mode"]
          p_name: string
          p_organizer: string
          p_starts_on: string
          p_url: string
        }
        Returns: string
      }
      get_hackathon: {
        Args: { p_id: string }
        Returns: {
          city: string
          ends_on: string
          id: string
          interest_count: number
          is_interested: boolean
          mode: Database["public"]["Enums"]["hackathon_mode"]
          name: string
          organizer: string
          starts_on: string
          url: string
        }[]
      }
      list_hackathons: {
        Args: { p_include_past?: boolean; p_limit?: number; p_query?: string }
        Returns: {
          city: string
          ends_on: string
          id: string
          interest_count: number
          is_interested: boolean
          mode: Database["public"]["Enums"]["hackathon_mode"]
          name: string
          organizer: string
          starts_on: string
          url: string
        }[]
      }
      my_hackathon_interest_count: { Args: never; Returns: number }
      require_onboarded: { Args: never; Returns: string }
      set_hackathon_interest: {
        Args: { p_hackathon_id: string; p_interested: boolean }
        Returns: undefined
      }
      similar_hackathons: {
        Args: { p_name: string }
        Returns: {
          id: string
          name: string
          similarity: number
          starts_on: string
        }[]
      }
    }
    Enums: {
      account_status: "active" | "suspended" | "banned"
      degree: "btech" | "be"
      hackathon_mode: "online" | "in_person" | "hybrid"
      hackathon_status: "active" | "merged" | "removed"
      skill_category: "technical" | "non_technical"
      skill_level: "beginner" | "intermediate" | "advanced"
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
      hackathon_mode: ["online", "in_person", "hybrid"],
      hackathon_status: ["active", "merged", "removed"],
      skill_category: ["technical", "non_technical"],
      skill_level: ["beginner", "intermediate", "advanced"],
    },
  },
} as const
