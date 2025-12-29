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
      sb_actions: {
        Row: {
          action_type: string
          after_story_id: string | null
          before_story_id: string | null
          created_at: string
          error: string | null
          eval_result_id: string | null
          id: string
          inputs: Json
          model: string | null
          output_format: string
          output_raw: string | null
          prompt_version: string
          session_id: string
          suggestion_id: string | null
          temperature: number | null
        }
        Insert: {
          action_type: string
          after_story_id?: string | null
          before_story_id?: string | null
          created_at?: string
          error?: string | null
          eval_result_id?: string | null
          id?: string
          inputs?: Json
          model?: string | null
          output_format?: string
          output_raw?: string | null
          prompt_version: string
          session_id: string
          suggestion_id?: string | null
          temperature?: number | null
        }
        Update: {
          action_type?: string
          after_story_id?: string | null
          before_story_id?: string | null
          created_at?: string
          error?: string | null
          eval_result_id?: string | null
          id?: string
          inputs?: Json
          model?: string | null
          output_format?: string
          output_raw?: string | null
          prompt_version?: string
          session_id?: string
          suggestion_id?: string | null
          temperature?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sb_actions_after_story_id_fkey"
            columns: ["after_story_id"]
            isOneToOne: false
            referencedRelation: "sb_stories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sb_actions_before_story_id_fkey"
            columns: ["before_story_id"]
            isOneToOne: false
            referencedRelation: "sb_stories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sb_actions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sb_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      sb_eval_cases: {
        Row: {
          action_id: string | null
          created_at: string
          error: string | null
          eval_results: Json
          id: string
          input_data: Json
          output_story: Json | null
          passed: boolean
          run_id: string
          session_id: string | null
          story_id: string | null
        }
        Insert: {
          action_id?: string | null
          created_at?: string
          error?: string | null
          eval_results?: Json
          id?: string
          input_data: Json
          output_story?: Json | null
          passed?: boolean
          run_id: string
          session_id?: string | null
          story_id?: string | null
        }
        Update: {
          action_id?: string | null
          created_at?: string
          error?: string | null
          eval_results?: Json
          id?: string
          input_data?: Json
          output_story?: Json | null
          passed?: boolean
          run_id?: string
          session_id?: string | null
          story_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sb_eval_cases_action_id_fkey"
            columns: ["action_id"]
            isOneToOne: false
            referencedRelation: "sb_actions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sb_eval_cases_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "sb_eval_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sb_eval_cases_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sb_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sb_eval_cases_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "sb_stories"
            referencedColumns: ["id"]
          },
        ]
      }
      sb_eval_runs: {
        Row: {
          completed_at: string | null
          created_at: string
          dataset_version: string
          error: string | null
          failed_cases: number
          id: string
          model: string | null
          passed_cases: number
          prompt_version: string | null
          run_name: string | null
          status: string
          total_cases: number
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          dataset_version: string
          error?: string | null
          failed_cases?: number
          id?: string
          model?: string | null
          passed_cases?: number
          prompt_version?: string | null
          run_name?: string | null
          status?: string
          total_cases?: number
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          dataset_version?: string
          error?: string | null
          failed_cases?: number
          id?: string
          model?: string | null
          passed_cases?: number
          prompt_version?: string | null
          run_name?: string | null
          status?: string
          total_cases?: number
        }
        Relationships: []
      }
      sb_prompt_versions: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          status: string
          template: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          status?: string
          template: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          status?: string
          template?: string
        }
        Relationships: []
      }
      sb_sessions: {
        Row: {
          context_defaults: Json | null
          created_at: string
          current_story_id: string | null
          id: string
          status: string
          title: string | null
          updated_at: string
        }
        Insert: {
          context_defaults?: Json | null
          created_at?: string
          current_story_id?: string | null
          id?: string
          status?: string
          title?: string | null
          updated_at?: string
        }
        Update: {
          context_defaults?: Json | null
          created_at?: string
          current_story_id?: string | null
          id?: string
          status?: string
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_sb_sessions_current_story_id"
            columns: ["current_story_id"]
            isOneToOne: false
            referencedRelation: "sb_stories"
            referencedColumns: ["id"]
          },
        ]
      }
      sb_stories: {
        Row: {
          created_at: string
          id: string
          session_id: string
          source: string
          story: Json
        }
        Insert: {
          created_at?: string
          id?: string
          session_id: string
          source?: string
          story: Json
        }
        Update: {
          created_at?: string
          id?: string
          session_id?: string
          source?: string
          story?: Json
        }
        Relationships: [
          {
            foreignKeyName: "sb_stories_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sb_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
