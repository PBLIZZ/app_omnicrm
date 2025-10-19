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
    PostgrestVersion: "13.0.5"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      ai_insights: {
        Row: {
          content: Json
          created_at: string
          fingerprint: string | null
          id: string
          kind: string
          model: string | null
          subject_id: string | null
          subject_type: string
          user_id: string
        }
        Insert: {
          content: Json
          created_at?: string
          fingerprint?: string | null
          id?: string
          kind: string
          model?: string | null
          subject_id?: string | null
          subject_type: string
          user_id: string
        }
        Update: {
          content?: Json
          created_at?: string
          fingerprint?: string | null
          id?: string
          kind?: string
          model?: string | null
          subject_id?: string | null
          subject_type?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_quotas: {
        Row: {
          credits_left: number
          period_start: string
          user_id: string
        }
        Insert: {
          credits_left: number
          period_start: string
          user_id: string
        }
        Update: {
          credits_left?: number
          period_start?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_usage: {
        Row: {
          cost_usd: number
          created_at: string
          id: string
          input_tokens: number
          model: string
          output_tokens: number
          user_id: string
        }
        Insert: {
          cost_usd?: number
          created_at?: string
          id?: string
          input_tokens?: number
          model: string
          output_tokens?: number
          user_id: string
        }
        Update: {
          cost_usd?: number
          created_at?: string
          id?: string
          input_tokens?: number
          model?: string
          output_tokens?: number
          user_id?: string
        }
        Relationships: []
      }
      client_consents: {
        Row: {
          consent_text_version: string
          consent_type: Database["public"]["Enums"]["consent_type"]
          contact_id: string
          created_at: string
          granted: boolean
          granted_at: string
          id: string
          ip_address: unknown | null
          signature_image_url: string | null
          signature_svg: string | null
          updated_at: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          consent_text_version: string
          consent_type: Database["public"]["Enums"]["consent_type"]
          contact_id: string
          created_at?: string
          granted?: boolean
          granted_at?: string
          id?: string
          ip_address?: unknown | null
          signature_image_url?: string | null
          signature_svg?: string | null
          updated_at?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          consent_text_version?: string
          consent_type?: Database["public"]["Enums"]["consent_type"]
          contact_id?: string
          created_at?: string
          granted?: boolean
          granted_at?: string
          id?: string
          ip_address?: unknown | null
          signature_image_url?: string | null
          signature_svg?: string | null
          updated_at?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_consents_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      client_files: {
        Row: {
          contact_id: string
          created_at: string
          file_path: string
          file_size: number | null
          file_type: Database["public"]["Enums"]["file_type"]
          id: string
          mime_type: string | null
          user_id: string
        }
        Insert: {
          contact_id: string
          created_at?: string
          file_path: string
          file_size?: number | null
          file_type?: Database["public"]["Enums"]["file_type"]
          id?: string
          mime_type?: string | null
          user_id: string
        }
        Update: {
          contact_id?: string
          created_at?: string
          file_path?: string
          file_size?: number | null
          file_type?: Database["public"]["Enums"]["file_type"]
          id?: string
          mime_type?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_files_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_identities: {
        Row: {
          contact_id: string
          created_at: string
          id: string
          kind: string
          provider: string | null
          user_id: string
          value: string
        }
        Insert: {
          contact_id: string
          created_at?: string
          id?: string
          kind: string
          provider?: string | null
          user_id: string
          value: string
        }
        Update: {
          contact_id?: string
          created_at?: string
          id?: string
          kind?: string
          provider?: string | null
          user_id?: string
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_identities_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          address: Json | null
          client_status: string | null
          confidence_score: string | null
          created_at: string
          date_of_birth: string | null
          display_name: string
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          health_context: Json | null
          id: string
          lifecycle_stage: string | null
          photo_url: string | null
          preferences: Json | null
          primary_email: string | null
          primary_phone: string | null
          referral_source: string | null
          source: string | null
          tags: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: Json | null
          client_status?: string | null
          confidence_score?: string | null
          created_at?: string
          date_of_birth?: string | null
          display_name: string
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          health_context?: Json | null
          id?: string
          lifecycle_stage?: string | null
          photo_url?: string | null
          preferences?: Json | null
          primary_email?: string | null
          primary_phone?: string | null
          referral_source?: string | null
          source?: string | null
          tags?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: Json | null
          client_status?: string | null
          confidence_score?: string | null
          created_at?: string
          date_of_birth?: string | null
          display_name?: string
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          health_context?: Json | null
          id?: string
          lifecycle_stage?: string | null
          photo_url?: string | null
          preferences?: Json | null
          primary_email?: string | null
          primary_phone?: string | null
          referral_source?: string | null
          source?: string | null
          tags?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      daily_pulse_logs: {
        Row: {
          created_at: string
          details: Json | null
          id: string
          log_date: string
          user_id: string
        }
        Insert: {
          created_at?: string
          details?: Json | null
          id?: string
          log_date: string
          user_id: string
        }
        Update: {
          created_at?: string
          details?: Json | null
          id?: string
          log_date?: string
          user_id?: string
        }
        Relationships: []
      }
      documents: {
        Row: {
          created_at: string
          id: string
          meta: Json | null
          mime: string | null
          owner_contact_id: string | null
          text: string | null
          title: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          meta?: Json | null
          mime?: string | null
          owner_contact_id?: string | null
          text?: string | null
          title?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          meta?: Json | null
          mime?: string | null
          owner_contact_id?: string | null
          text?: string | null
          title?: string | null
          user_id?: string
        }
        Relationships: []
      }
      embeddings: {
        Row: {
          chunk_index: number | null
          content_hash: string | null
          created_at: string
          embedding: string | null
          embedding_v: string | null
          id: string
          meta: Json | null
          owner_id: string
          owner_type: string
          user_id: string
        }
        Insert: {
          chunk_index?: number | null
          content_hash?: string | null
          created_at?: string
          embedding?: string | null
          embedding_v?: string | null
          id?: string
          meta?: Json | null
          owner_id: string
          owner_type: string
          user_id: string
        }
        Update: {
          chunk_index?: number | null
          content_hash?: string | null
          created_at?: string
          embedding?: string | null
          embedding_v?: string | null
          id?: string
          meta?: Json | null
          owner_id?: string
          owner_type?: string
          user_id?: string
        }
        Relationships: []
      }
      goals: {
        Row: {
          contact_id: string | null
          created_at: string
          details: Json | null
          goal_type: Database["public"]["Enums"]["goal_type"]
          id: string
          name: string
          status: Database["public"]["Enums"]["goal_status"]
          target_date: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          contact_id?: string | null
          created_at?: string
          details?: Json | null
          goal_type: Database["public"]["Enums"]["goal_type"]
          id?: string
          name: string
          status?: Database["public"]["Enums"]["goal_status"]
          target_date?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          contact_id?: string | null
          created_at?: string
          details?: Json | null
          goal_type?: Database["public"]["Enums"]["goal_type"]
          id?: string
          name?: string
          status?: Database["public"]["Enums"]["goal_status"]
          target_date?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "goals_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      habit_completions: {
        Row: {
          completed_date: string
          created_at: string
          habit_id: string
          id: string
          notes: string | null
          user_id: string
        }
        Insert: {
          completed_date: string
          created_at?: string
          habit_id: string
          id?: string
          notes?: string | null
          user_id: string
        }
        Update: {
          completed_date?: string
          created_at?: string
          habit_id?: string
          id?: string
          notes?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "habit_completions_habit_id_fkey"
            columns: ["habit_id"]
            isOneToOne: false
            referencedRelation: "habits"
            referencedColumns: ["id"]
          },
        ]
      }
      habits: {
        Row: {
          color: string | null
          created_at: string
          description: string | null
          icon_name: string | null
          id: string
          is_active: boolean | null
          name: string
          target_frequency: string
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          description?: string | null
          icon_name?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          target_frequency?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          description?: string | null
          icon_name?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          target_frequency?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ignored_identifiers: {
        Row: {
          created_at: string
          id: string
          kind: string
          reason: string | null
          user_id: string
          value: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind: string
          reason?: string | null
          user_id: string
          value: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          reason?: string | null
          user_id?: string
          value?: string
        }
        Relationships: []
      }
      inbox_items: {
        Row: {
          created_at: string
          created_task_id: string | null
          id: string
          processed_at: string | null
          raw_text: string
          status: Database["public"]["Enums"]["inbox_item_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          created_task_id?: string | null
          id?: string
          processed_at?: string | null
          raw_text: string
          status?: Database["public"]["Enums"]["inbox_item_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          created_task_id?: string | null
          id?: string
          processed_at?: string | null
          raw_text?: string
          status?: Database["public"]["Enums"]["inbox_item_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      interactions: {
        Row: {
          batch_id: string | null
          body_text: string | null
          contact_id: string
          created_at: string
          id: string
          occurred_at: string
          source: string | null
          source_id: string
          source_meta: Json | null
          subject: string | null
          type: string
          user_id: string
        }
        Insert: {
          batch_id?: string | null
          body_text?: string | null
          contact_id: string
          created_at?: string
          id?: string
          occurred_at: string
          source?: string | null
          source_id: string
          source_meta?: Json | null
          subject?: string | null
          type: string
          user_id: string
        }
        Update: {
          batch_id?: string | null
          body_text?: string | null
          contact_id?: string
          created_at?: string
          id?: string
          occurred_at?: string
          source?: string | null
          source_id?: string
          source_meta?: Json | null
          subject?: string | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "interactions_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          attempts: number
          batch_id: string | null
          created_at: string
          id: string
          kind: string
          last_error: string | null
          payload: Json | null
          result: Json | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          attempts?: number
          batch_id?: string | null
          created_at?: string
          id?: string
          kind: string
          last_error?: string | null
          payload?: Json | null
          result?: Json | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          attempts?: number
          batch_id?: string | null
          created_at?: string
          id?: string
          kind?: string
          last_error?: string | null
          payload?: Json | null
          result?: Json | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: Json
          created_at: string
          id: string
          role: string
          thread_id: string
          user_id: string
        }
        Insert: {
          content: Json
          created_at?: string
          id?: string
          role: string
          thread_id: string
          user_id: string
        }
        Update: {
          content?: Json
          created_at?: string
          id?: string
          role?: string
          thread_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "threads"
            referencedColumns: ["id"]
          },
        ]
      }
      note_goals: {
        Row: {
          goal_id: string
          note_id: string
        }
        Insert: {
          goal_id: string
          note_id: string
        }
        Update: {
          goal_id?: string
          note_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "note_goals_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "note_goals_note_id_fkey"
            columns: ["note_id"]
            isOneToOne: false
            referencedRelation: "notes"
            referencedColumns: ["id"]
          },
        ]
      }
      notes: {
        Row: {
          contact_id: string | null
          content_plain: string
          content_rich: Json
          created_at: string
          id: string
          pii_entities: Json
          source_type: Database["public"]["Enums"]["note_source_type"]
          tags: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          contact_id?: string | null
          content_plain?: string
          content_rich?: Json
          created_at?: string
          id?: string
          pii_entities?: Json
          source_type?: Database["public"]["Enums"]["note_source_type"]
          tags?: string[]
          updated_at?: string
          user_id: string
        }
        Update: {
          contact_id?: string | null
          content_plain?: string
          content_rich?: Json
          created_at?: string
          id?: string
          pii_entities?: Json
          source_type?: Database["public"]["Enums"]["note_source_type"]
          tags?: string[]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notes_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_tokens: {
        Row: {
          created_at: string
          created_by: string
          disabled: boolean
          expires_at: string
          id: string
          label: string | null
          max_uses: number
          token: string
          used_count: number
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by: string
          disabled?: boolean
          expires_at: string
          id?: string
          label?: string | null
          max_uses?: number
          token: string
          used_count?: number
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string
          disabled?: boolean
          expires_at?: string
          id?: string
          label?: string | null
          max_uses?: number
          token?: string
          used_count?: number
          user_id?: string
        }
        Relationships: []
      }
      photo_access_audit: {
        Row: {
          accessed_at: string
          contact_id: string
          created_at: string | null
          id: string
          ip_address: unknown | null
          photo_path: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          accessed_at?: string
          contact_id: string
          created_at?: string | null
          id?: string
          ip_address?: unknown | null
          photo_path: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          accessed_at?: string
          contact_id?: string
          created_at?: string | null
          id?: string
          ip_address?: unknown | null
          photo_path?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          created_at: string
          details: Json | null
          due_date: string | null
          id: string
          name: string
          status: Database["public"]["Enums"]["project_status"]
          updated_at: string
          user_id: string
          zone_id: number | null
        }
        Insert: {
          created_at?: string
          details?: Json | null
          due_date?: string | null
          id?: string
          name: string
          status?: Database["public"]["Enums"]["project_status"]
          updated_at?: string
          user_id: string
          zone_id?: number | null
        }
        Update: {
          created_at?: string
          details?: Json | null
          due_date?: string | null
          id?: string
          name?: string
          status?: Database["public"]["Enums"]["project_status"]
          updated_at?: string
          user_id?: string
          zone_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "zones"
            referencedColumns: ["id"]
          },
        ]
      }
      raw_events: {
        Row: {
          batch_id: string | null
          contact_extraction_status: string | null
          created_at: string
          extracted_at: string | null
          id: string
          occurred_at: string
          payload: Json
          processed_at: string | null
          processing_attempts: number | null
          processing_error: string | null
          processing_status: string | null
          provider: Database["public"]["Enums"]["provider_type"]
          source_id: string
          source_meta: Json | null
          user_id: string
        }
        Insert: {
          batch_id?: string | null
          contact_extraction_status?: string | null
          created_at?: string
          extracted_at?: string | null
          id?: string
          occurred_at: string
          payload: Json
          processed_at?: string | null
          processing_attempts?: number | null
          processing_error?: string | null
          processing_status?: string | null
          provider: Database["public"]["Enums"]["provider_type"]
          source_id: string
          source_meta?: Json | null
          user_id: string
        }
        Update: {
          batch_id?: string | null
          contact_extraction_status?: string | null
          created_at?: string
          extracted_at?: string | null
          id?: string
          occurred_at?: string
          payload?: Json
          processed_at?: string | null
          processing_attempts?: number | null
          processing_error?: string | null
          processing_status?: string | null
          provider?: Database["public"]["Enums"]["provider_type"]
          source_id?: string
          source_meta?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      task_contact_tags: {
        Row: {
          contact_id: string
          task_id: string
        }
        Insert: {
          contact_id: string
          task_id: string
        }
        Update: {
          contact_id?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_contact_tags_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_contact_tags_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          completed_at: string | null
          created_at: string
          details: Json | null
          due_date: string | null
          id: string
          name: string
          parent_task_id: string | null
          priority: Database["public"]["Enums"]["task_priority"]
          project_id: string | null
          status: Database["public"]["Enums"]["task_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          details?: Json | null
          due_date?: string | null
          id?: string
          name: string
          parent_task_id?: string | null
          priority?: Database["public"]["Enums"]["task_priority"]
          project_id?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          details?: Json | null
          due_date?: string | null
          id?: string
          name?: string
          parent_task_id?: string | null
          priority?: Database["public"]["Enums"]["task_priority"]
          project_id?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_parent_task_id_fkey"
            columns: ["parent_task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      threads: {
        Row: {
          created_at: string
          id: string
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tool_invocations: {
        Row: {
          args: Json
          created_at: string
          id: string
          latency_ms: number | null
          message_id: string
          result: Json | null
          tool: string
          user_id: string
        }
        Insert: {
          args: Json
          created_at?: string
          id?: string
          latency_ms?: number | null
          message_id: string
          result?: Json | null
          tool: string
          user_id: string
        }
        Update: {
          args?: Json
          created_at?: string
          id?: string
          latency_ms?: number | null
          message_id?: string
          result?: Json | null
          tool?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tool_invocations_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      user_integrations: {
        Row: {
          access_token: string
          config: Json | null
          created_at: string
          expiry_date: string | null
          provider: string
          refresh_token: string | null
          service: string
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token: string
          config?: Json | null
          created_at?: string
          expiry_date?: string | null
          provider: string
          refresh_token?: string | null
          service?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string
          config?: Json | null
          created_at?: string
          expiry_date?: string | null
          provider?: string
          refresh_token?: string | null
          service?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      zones: {
        Row: {
          color: string | null
          icon_name: string | null
          id: number
          name: string
        }
        Insert: {
          color?: string | null
          icon_name?: string | null
          id?: number
          name: string
        }
        Update: {
          color?: string | null
          icon_name?: string | null
          id?: number
          name?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_client_consent: {
        Args: {
          p_consent_type: string
          p_contact_id: string
          p_user_id?: string
        }
        Returns: boolean
      }
      gtrgm_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_decompress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_in: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_options: {
        Args: { "": unknown }
        Returns: undefined
      }
      gtrgm_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      immutable_90_days_ago: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      onboard_client_with_token: {
        Args: {
          p_client: Json
          p_consent: Json
          p_photo_path?: string
          p_token: string
        }
        Returns: string
      }
      set_limit: {
        Args: { "": number }
        Returns: number
      }
      show_limit: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      show_trgm: {
        Args: { "": string }
        Returns: string[]
      }
      stable_90_days_ago: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
    }
    Enums: {
      consent_type: "data_processing" | "marketing" | "hipaa" | "photography"
      file_type: "photo" | "document" | "form"
      goal_status: "on_track" | "at_risk" | "achieved" | "abandoned"
      goal_type:
        | "practitioner_business"
        | "practitioner_personal"
        | "client_wellness"
      inbox_item_status: "unprocessed" | "processed" | "archived"
      note_source_type: "typed" | "voice" | "upload"
      project_status: "active" | "on_hold" | "completed" | "archived"
      provider_type: "gmail" | "calendar" | "drive" | "upload"
      task_priority: "low" | "medium" | "high" | "urgent"
      task_status: "todo" | "in_progress" | "done" | "canceled"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      consent_type: ["data_processing", "marketing", "hipaa", "photography"],
      file_type: ["photo", "document", "form"],
      goal_status: ["on_track", "at_risk", "achieved", "abandoned"],
      goal_type: [
        "practitioner_business",
        "practitioner_personal",
        "client_wellness",
      ],
      inbox_item_status: ["unprocessed", "processed", "archived"],
      note_source_type: ["typed", "voice", "upload"],
      project_status: ["active", "on_hold", "completed", "archived"],
      provider_type: ["gmail", "calendar", "drive", "upload"],
      task_priority: ["low", "medium", "high", "urgent"],
      task_status: ["todo", "in_progress", "done", "canceled"],
    },
  },
} as const
