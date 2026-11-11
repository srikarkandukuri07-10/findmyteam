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
      conversations: {
        Row: {
          id: string
          user_a: string | null
          user_b: string | null
          team_id: string | null
          created_at: string
          last_message_at: string | null
        }
        Insert: {
          id?: string
          user_a?: string | null
          user_b?: string | null
          team_id?: string | null
          created_at?: string
          last_message_at?: string | null
        }
        Update: {
          id?: string
          user_a?: string | null
          user_b?: string | null
          team_id?: string | null
          created_at?: string
          last_message_at?: string | null
        }
        Relationships: []
      }
      conversation_members: {
        Row: { conversation_id: string; user_id: string; last_read_at: string; muted: boolean }
        Insert: { conversation_id: string; user_id: string; last_read_at?: string; muted?: boolean }
        Update: { conversation_id?: string; user_id?: string; last_read_at?: string; muted?: boolean }
        Relationships: []
      }
      messages: {
        Row: { id: number; conversation_id: string; sender_id: string; body: string; kind: string; created_at: string }
        Insert: { id?: never; conversation_id: string; sender_id: string; body: string; kind?: string; created_at?: string }
        Update: {
          id?: never
          conversation_id?: string
          sender_id?: string
          body?: string
          kind?: string
          created_at?: string
        }
        Relationships: []
      }
      team_join_requests: {
        Row: {
          id: string
          team_id: string
          user_id: string
          note: string | null
          status: string
          created_at: string
          decided_at: string | null
          decided_by: string | null
        }
        Insert: never
        Update: never
        Relationships: []
      }
      blocks: {
        Row: { blocker_id: string; blocked_id: string; created_at: string }
        Insert: { blocker_id: string; blocked_id: string; created_at?: string }
        Update: { blocker_id?: string; blocked_id?: string; created_at?: string }
        Relationships: []
      }
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
      college_email_domains: {
        Row: {
          approved: boolean
          decided_at: string | null
          decided_by: string | null
          domain: string
          first_seen_at: string
        }
        Insert: {
          approved?: boolean
          decided_at?: string | null
          decided_by?: string | null
          domain: string
          first_seen_at?: string
        }
        Update: {
          approved?: boolean
          decided_at?: string | null
          decided_by?: string | null
          domain?: string
          first_seen_at?: string
        }
        Relationships: []
      }
      college_email_sends: {
        Row: { day: string; sent: number }
        Insert: { day: string; sent?: number }
        Update: { day?: string; sent?: number }
        Relationships: []
      }
      college_verifications: {
        Row: {
          attempts: number
          code_expires_at: string | null
          code_hash: string | null
          domain: string | null
          email: string | null
          pending_domain: string | null
          pending_email: string | null
          sends: number
          sends_window_start: string
          updated_at: string
          user_id: string
          verified_at: string | null
        }
        Insert: {
          attempts?: number
          code_expires_at?: string | null
          code_hash?: string | null
          domain?: string | null
          email?: string | null
          pending_domain?: string | null
          pending_email?: string | null
          sends?: number
          sends_window_start?: string
          updated_at?: string
          user_id: string
          verified_at?: string | null
        }
        Update: {
          attempts?: number
          code_expires_at?: string | null
          code_hash?: string | null
          domain?: string | null
          email?: string | null
          pending_domain?: string | null
          pending_email?: string | null
          sends?: number
          sends_window_start?: string
          updated_at?: string
          user_id?: string
          verified_at?: string | null
        }
        Relationships: []
      }
      colleges: {
        Row: {
          added_by: string | null
          aishe_code: string | null
          city: string | null
          created_at: string
          district: string | null
          email_domain: string | null
          featured: boolean
          id: number
          kind: string
          name: string
          source: string
          state: string | null
          status: string
          university: string | null
        }
        Insert: {
          added_by?: string | null
          aishe_code?: string | null
          city?: string | null
          district?: string | null
          email_domain?: string | null
          featured?: boolean
          id?: never
          kind?: string
          name: string
          source?: string
          state?: string | null
          status?: string
          university?: string | null
        }
        Update: {
          added_by?: string | null
          aishe_code?: string | null
          city?: string | null
          district?: string | null
          email_domain?: string | null
          featured?: boolean
          id?: never
          kind?: string
          name?: string
          source?: string
          state?: string | null
          status?: string
          university?: string | null
        }
        Relationships: []
      }
      past_hackathons: {
        Row: {
          created_at: string
          demo_url: string | null
          id: string
          idea: string | null
          live_url: string | null
          name: string
          result: Database["public"]["Enums"]["hackathon_result"]
          user_id: string
          year: number
        }
        Insert: {
          demo_url?: string | null
          id?: string
          idea?: string | null
          live_url?: string | null
          name: string
          result: Database["public"]["Enums"]["hackathon_result"]
          user_id: string
          year: number
        }
        Update: {
          demo_url?: string | null
          idea?: string | null
          live_url?: string | null
          name?: string
          result?: Database["public"]["Enums"]["hackathon_result"]
          year?: number
        }
        Relationships: []
      }
      profile_private: {
        Row: { phone: string; updated_at: string; user_id: string }
        Insert: { phone: string; updated_at?: string; user_id: string }
        Update: { phone?: string; updated_at?: string; user_id?: string }
        Relationships: []
      }
      connection_requests: {
        Row: {
          created_at: string
          id: string
          note: string | null
          recipient_id: string
          responded_at: string | null
          sender_id: string
          status: Database["public"]["Enums"]["request_status"]
        }
        Insert: {
          created_at?: string
          id?: string
          note?: string | null
          recipient_id: string
          responded_at?: string | null
          sender_id: string
          status?: Database["public"]["Enums"]["request_status"]
        }
        Update: {
          created_at?: string
          id?: string
          note?: string | null
          recipient_id?: string
          responded_at?: string | null
          sender_id?: string
          status?: Database["public"]["Enums"]["request_status"]
        }
        Relationships: []
      }
      swipes: {
        Row: {
          action: Database["public"]["Enums"]["swipe_action"]
          actor_id: string
          created_at: string
          target_id: string
        }
        Insert: {
          action: Database["public"]["Enums"]["swipe_action"]
          actor_id: string
          created_at?: string
          target_id: string
        }
        Update: {
          action?: Database["public"]["Enums"]["swipe_action"]
          actor_id?: string
          created_at?: string
          target_id?: string
        }
        Relationships: []
      }
      team_members: {
        Row: {
          is_owner: boolean
          joined_at: string
          team_id: string
          user_id: string
        }
        Insert: {
          is_owner?: boolean
          joined_at?: string
          team_id: string
          user_id: string
        }
        Update: {
          is_owner?: boolean
          joined_at?: string
          team_id?: string
          user_id?: string
        }
        Relationships: []
      }
      team_positions: {
        Row: {
          id: string
          role_id: number
          spots: number
          team_id: string
        }
        Insert: {
          id?: string
          role_id: number
          spots: number
          team_id: string
        }
        Update: {
          id?: string
          role_id?: number
          spots?: number
          team_id?: string
        }
        Relationships: []
      }
      teams: {
        Row: {
          created_at: string
          description: string | null
          hackathon_id: string | null
          id: string
          idea: string | null
          is_demo: boolean
          name: string
          owner_id: string | null
          recruit_status: Database["public"]["Enums"]["recruit_status"]
          hackathon_name: string
          hackathon_url: string | null
          mode: string
          team_size: number
          about: string
          looking_for: string
          status: string
          completed_at: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          hackathon_id?: string | null
          id?: string
          idea?: string | null
          is_demo?: boolean
          name: string
          owner_id?: string | null
          recruit_status?: Database["public"]["Enums"]["recruit_status"]
        }
        Update: {
          created_at?: string
          description?: string | null
          hackathon_id?: string | null
          id?: string
          idea?: string | null
          is_demo?: boolean
          name?: string
          owner_id?: string | null
          recruit_status?: Database["public"]["Enums"]["recruit_status"]
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
          is_demo: boolean
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
          is_demo?: boolean
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
          is_demo?: boolean
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
          is_demo: boolean
          github_connected_at: string | null
          github_id: number | null
          bio: string | null
          github_username: string | null
          linkedin_url: string | null
          birth_year: number | null
          branch_id: number | null
          college_id: number | null
          college_other: string | null
          college_verified_at: string | null
          details_saved_at: string | null
          interests: string[]
          consent_version: string | null
          consented_at: string | null
          created_at: string
          degree: Database["public"]["Enums"]["degree"] | null
          display_name: string | null
          graduation_year: number | null
          id: string
          onboarded_at: string | null
          role: Database["public"]["Enums"]["user_role"]
          avatar_path: string | null
          status: Database["public"]["Enums"]["account_status"]
          updated_at: string
          year_of_study: number | null
        }
        Insert: {
          is_demo?: boolean
          github_connected_at?: string | null
          github_id?: number | null
          bio?: string | null
          github_username?: string | null
          linkedin_url?: string | null
          birth_year?: number | null
          branch_id?: number | null
          college_id?: number | null
          college_other?: string | null
          college_verified_at?: string | null
          details_saved_at?: string | null
          interests?: string[]
          consent_version?: string | null
          consented_at?: string | null
          created_at?: string
          degree?: Database["public"]["Enums"]["degree"] | null
          display_name?: string | null
          graduation_year?: number | null
          id: string
          onboarded_at?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          avatar_path?: string | null
          status?: Database["public"]["Enums"]["account_status"]
          updated_at?: string
          year_of_study?: number | null
        }
        Update: {
          is_demo?: boolean
          github_connected_at?: string | null
          github_id?: number | null
          bio?: string | null
          github_username?: string | null
          linkedin_url?: string | null
          birth_year?: number | null
          branch_id?: number | null
          college_id?: number | null
          college_other?: string | null
          college_verified_at?: string | null
          details_saved_at?: string | null
          interests?: string[]
          consent_version?: string | null
          consented_at?: string | null
          created_at?: string
          degree?: Database["public"]["Enums"]["degree"] | null
          display_name?: string | null
          graduation_year?: number | null
          id?: string
          onboarded_at?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          avatar_path?: string | null
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
      add_college: { Args: { p_district: string; p_name: string; p_state: string }; Returns: number }
      add_past_hackathon: {
        Args: {
          p_demo_url: string | null
          p_idea: string | null
          p_live_url: string | null
          p_name: string
          p_result: Database["public"]["Enums"]["hackathon_result"]
          p_year: number
        }
        Returns: string
      }
      admin_list_pending_colleges: {
        Args: never
        Returns: { created_at: string; district: string | null; id: number; name: string; state: string | null; students: number }[]
      }
      admin_set_college_status: { Args: { p_approved: boolean; p_id: number }; Returns: undefined }
      confirm_email_code: { Args: never; Returns: boolean }
      complete_onboarding_profile: {
        Args: { p_bio: string; p_interests: string[]; p_role_ids: number[]; p_skills: Json }
        Returns: undefined
      }
      delete_past_hackathon: { Args: { p_id: string }; Returns: undefined }
      list_past_hackathons: {
        Args: { p_user: string }
        Returns: {
          demo_url: string | null
          id: string
          idea: string | null
          live_url: string | null
          name: string
          result: Database["public"]["Enums"]["hackathon_result"]
          year: number
        }[]
      }
      my_onboarding: {
        Args: never
        Returns: {
          birth_year: number | null
          branch_id: number | null
          college_id: number | null
          college_name: string | null
          college_place: string | null
          college_verified: boolean
          degree: Database["public"]["Enums"]["degree"] | null
          details_saved: boolean
          display_name: string | null
          email: string
          github_connected: boolean
          graduation_year: number | null
          interests: string[]
          linkedin_url: string | null
          onboarded: boolean
          past_hackathons: number
          phone: string | null
          year_of_study: number | null
        }[]
      }
      save_onboarding_details: {
        Args: {
          p_birth_year: number
          p_branch_id: number
          p_college: string
          p_consent_version: string
          p_degree: Database["public"]["Enums"]["degree"]
          p_display_name: string
          p_graduation_year: number
          p_phone: string
          p_year_of_study: number
        }
        Returns: undefined
      }
      search_colleges: {
        Args: { p_query: string }
        Returns: { id: number; kind: string; name: string; pending: boolean; place: string | null }[]
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
          avatar_path: string | null
          is_demo: boolean
          linkedin_url: string
          roles: Json
          skills: Json
          year_of_study: number
        }[]
      }
      cancel_request: { Args: { p_id: string }; Returns: undefined }
      respond_request: {
        Args: { p_accept: boolean; p_id: string }
        Returns: undefined
      }
      my_connects_left: { Args: never; Returns: number }
      join_waitlist: {
        Args: {
          p_college_id: number | null
          p_college_other: string | null
          p_consent_version: string
          p_email: string
          p_ip_hash: string | null
          p_name: string
          p_pain_point: string | null
          p_ref: string | null
          p_role_ids: number[]
          p_source: string | null
          p_branch_id: number | null
          p_year: number
        }
        Returns: Json
      }
      waitlist_options: { Args: never; Returns: Json }
      is_admin: { Args: never; Returns: boolean }
      admin_list_early_access: {
        Args: never
        Returns: {
          id: string
          display_name: string | null
          onboarded: boolean
          role: Database["public"]["Enums"]["user_role"]
          granted_at: string
        }[]
      }
      admin_grant_early_access: { Args: { p_email: string }; Returns: string }
      admin_list_college_domains: {
        Args: never
        Returns: {
          approved: boolean
          decided_at: string | null
          domain: string
          first_seen_at: string
          students: number
        }[]
      }
      admin_set_college_domain: { Args: { p_approved: boolean; p_domain: string }; Returns: undefined }
      college_verified_ids: { Args: { p_ids: string[] }; Returns: string[] }
      confirm_college_verification: { Args: { p_code: string }; Returns: string }
      is_personal_email_domain: { Args: { p_domain: string }; Returns: boolean }
      my_college_verification: {
        Args: never
        Returns: {
          attempts_left: number | null
          badge: boolean
          code_expires_at: string | null
          domain_approved: boolean
          email: string | null
          pending_email: string | null
          verified_at: string | null
        }[]
      }
      remove_college_verification: { Args: never; Returns: undefined }
      send_college_code: { Args: { p_code: string; p_email: string }; Returns: boolean }
      start_college_verification: { Args: { p_email: string }; Returns: string }
      admin_revoke_early_access: { Args: { p_user: string }; Returns: undefined }
      open_conversation: { Args: { p_other: string }; Returns: string }
      send_message: {
        Args: { p_conversation: string; p_body: string }
        Returns: { id: number; created_at: string }[]
      }
      mark_conversation_read: { Args: { p_conversation: string }; Returns: undefined }
      set_conversation_muted: { Args: { p_conversation: string; p_muted: boolean }; Returns: undefined }
      block_user: { Args: { p_other: string }; Returns: undefined }
      report_user: {
        Args: {
          p_other: string
          p_reason: Database["public"]["Enums"]["report_reason"]
          p_details: string | null
          p_conversation: string | null
        }
        Returns: undefined
      }
      list_conversations: {
        Args: never
        Returns: {
          id: string
          is_team: boolean
          team_id: string | null
          other_id: string | null
          other_name: string
          other_avatar_path: string | null
          other_is_demo: boolean
          member_count: number
          last_body: string | null
          last_kind: string | null
          last_sender_name: string | null
          last_sender_is_me: boolean | null
          last_at: string
          unread: number
          muted: boolean
          blocked: boolean
        }[]
      }
      my_unread_total: { Args: never; Returns: number }
      set_avatar: { Args: { p_path: string | null }; Returns: undefined }
      connection_state: {
        Args: { p_other: string }
        Returns: { state: string; request_id: string | null }[]
      }
      search_everything: { Args: { p_query: string }; Returns: Json }
      waitlist_stats: { Args: never; Returns: Json }
      waitlist_standing: { Args: { p_code: string }; Returns: Json }
      swipe_person: {
        Args: {
          p_action: Database["public"]["Enums"]["swipe_action"]
          p_target: string
        }
        Returns: string
      }
      discover_people: {
        Args: { p_limit?: number }
        Returns: {
          bio: string
          branch_name: string
          college_name: string
          degree: Database["public"]["Enums"]["degree"]
          display_name: string
          github: Json
          github_verified: boolean
          graduation_year: number
          id: string
          is_demo: boolean
          reason: string
          avatar_path: string | null
          roles: Json
          skills: Json
          year_of_study: number
        }[]
      }
      list_requests: {
        Args: { p_direction: string }
        Returns: {
          created_at: string
          id: string
          note: string
          other_branch: string
          other_college: string
          other_id: string
          other_is_demo: boolean
          other_avatar_path: string | null
          other_name: string
          other_roles: Json
          other_year: number
          responded_at: string
          status: Database["public"]["Enums"]["request_status"]
        }[]
      }
      list_teams: {
        Args: never
        Returns: {
          id: string
          hackathon_name: string
          hackathon_url: string | null
          mode: string
          team_size: number
          about: string
          looking_for: string
          recruit_status: Database["public"]["Enums"]["recruit_status"]
          owner_id: string | null
          owner_name: string | null
          member_count: number
          members: Json
          is_demo: boolean
          my_request: string | null
          created_at: string
        }[]
      }
      list_my_teams: {
        Args: never
        Returns: {
          id: string
          hackathon_name: string
          hackathon_url: string | null
          mode: string
          team_size: number
          about: string
          recruit_status: Database["public"]["Enums"]["recruit_status"]
          status: string
          is_owner: boolean
          member_count: number
          members: Json
          pending_count: number
          conversation_id: string | null
          unread: number | null
          created_at: string
        }[]
      }
      list_my_join_requests: {
        Args: never
        Returns: { team_id: string; hackathon_name: string; owner_name: string | null; status: string; created_at: string }[]
      }
      get_team: {
        Args: { p_id: string }
        Returns: {
          id: string
          hackathon_name: string
          hackathon_url: string | null
          mode: string
          team_size: number
          about: string
          looking_for: string
          recruit_status: Database["public"]["Enums"]["recruit_status"]
          status: string
          owner_id: string | null
          is_demo: boolean
          created_at: string
          members: Json
          is_member: boolean
          is_owner: boolean | null
          my_request: string | null
          conversation_id: string | null
          requests: Json
        }[]
      }
      create_team: {
        Args: {
          p_hackathon_name: string
          p_hackathon_url: string
          p_mode: string
          p_team_size: number
          p_about: string
          p_looking_for: string
        }
        Returns: string
      }
      request_to_join: { Args: { p_team: string; p_note: string | null }; Returns: string }
      withdraw_join_request: { Args: { p_team: string }; Returns: undefined }
      decide_join_request: { Args: { p_request: string; p_accept: boolean }; Returns: undefined }
      remove_team_member: { Args: { p_team: string; p_user: string }; Returns: undefined }
      leave_team: { Args: { p_team: string }; Returns: undefined }
      set_team_recruiting: { Args: { p_team: string; p_open: boolean }; Returns: undefined }
      complete_team: { Args: { p_team: string }; Returns: undefined }
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
      hackathon_result: "participated" | "finalist" | "winner"
      account_status: "active" | "suspended" | "banned"
      degree: "btech" | "be"
      hackathon_mode: "online" | "in_person" | "hybrid"
      hackathon_status: "active" | "merged" | "removed"
      recruit_status: "open" | "partially_filled" | "full" | "closed"
      request_status: "pending" | "accepted" | "rejected" | "cancelled" | "expired"
      waitlist_status: "waiting" | "invited" | "joined"
      user_role: "student" | "investor" | "admin"
      report_reason: "spam" | "harassment" | "fake_profile" | "inappropriate" | "other"
      swipe_action: "connect" | "skip"
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
      hackathon_result: ["participated", "finalist", "winner"],
      account_status: ["active", "suspended", "banned"],
      degree: ["btech", "be"],
      hackathon_mode: ["online", "in_person", "hybrid"],
      hackathon_status: ["active", "merged", "removed"],
      recruit_status: ["open", "partially_filled", "full", "closed"],
      request_status: ["pending", "accepted", "rejected", "cancelled", "expired"],
      waitlist_status: ["waiting", "invited", "joined"],
      user_role: ["student", "investor", "admin"],
      report_reason: ["spam", "harassment", "fake_profile", "inappropriate", "other"],
      swipe_action: ["connect", "skip"],
      skill_category: ["technical", "non_technical"],
      skill_level: ["beginner", "intermediate", "advanced"],
    },
  },
} as const
