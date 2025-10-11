export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5";
  };
  public: {
    Tables: {
      ai_insights: {
        Row: {
          content: Json;
          created_at: string;
          fingerprint: string | null;
          id: string;
          kind: string;
          model: string | null;
          subject_id: string | null;
          subject_type: string;
          user_id: string;
        };
        Insert: {
          content: Json;
          created_at?: string;
          fingerprint?: string | null;
          id?: string;
          kind: string;
          model?: string | null;
          subject_id?: string | null;
          subject_type: string;
          user_id: string;
        };
        Update: {
          content?: Json;
          created_at?: string;
          fingerprint?: string | null;
          id?: string;
          kind?: string;
          model?: string | null;
          subject_id?: string | null;
          subject_type?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      ai_quotas: {
        Row: {
          credits_left: number;
          period_start: string;
          user_id: string;
        };
        Insert: {
          credits_left: number;
          period_start: string;
          user_id: string;
        };
        Update: {
          credits_left?: number;
          period_start?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      ai_usage: {
        Row: {
          cost_usd: number;
          created_at: string;
          id: string;
          input_tokens: number;
          model: string;
          output_tokens: number;
          user_id: string;
        };
        Insert: {
          cost_usd?: number;
          created_at?: string;
          id?: string;
          input_tokens?: number;
          model: string;
          output_tokens?: number;
          user_id: string;
        };
        Update: {
          cost_usd?: number;
          created_at?: string;
          id?: string;
          input_tokens?: number;
          model?: string;
          output_tokens?: number;
          user_id?: string;
        };
        Relationships: [];
      };
      calendar_events: {
        Row: {
          attendees: Json | null;
          business_category: string | null;
          created_at: string;
          description: string | null;
          end_time: string;
          event_type: string | null;
          google_event_id: string;
          google_updated: string | null;
          id: string;
          is_all_day: boolean | null;
          keywords: Json | null;
          last_synced: string | null;
          location: string | null;
          start_time: string;
          status: string | null;
          time_zone: string | null;
          title: string;
          updated_at: string;
          user_id: string;
          visibility: string | null;
        };
        Insert: {
          attendees?: Json | null;
          business_category?: string | null;
          created_at?: string;
          description?: string | null;
          end_time: string;
          event_type?: string | null;
          google_event_id: string;
          google_updated?: string | null;
          id?: string;
          is_all_day?: boolean | null;
          keywords?: Json | null;
          last_synced?: string | null;
          location?: string | null;
          start_time: string;
          status?: string | null;
          time_zone?: string | null;
          title: string;
          updated_at?: string;
          user_id: string;
          visibility?: string | null;
        };
        Update: {
          attendees?: Json | null;
          business_category?: string | null;
          created_at?: string;
          description?: string | null;
          end_time?: string;
          event_type?: string | null;
          google_event_id?: string;
          google_updated?: string | null;
          id?: string;
          is_all_day?: boolean | null;
          keywords?: Json | null;
          last_synced?: string | null;
          location?: string | null;
          start_time?: string;
          status?: string | null;
          time_zone?: string | null;
          title?: string;
          updated_at?: string;
          user_id?: string;
          visibility?: string | null;
        };
        Relationships: [];
      };
      client_consents: {
        Row: {
          consent_text_version: string;
          consent_type: Database["public"]["Enums"]["consent_type"];
          contact_id: string;
          created_at: string;
          granted: boolean;
          granted_at: string;
          id: string;
          ip_address: unknown | null;
          signature_image_url: string | null;
          signature_svg: string | null;
          updated_at: string;
          user_agent: string | null;
          user_id: string;
        };
        Insert: {
          consent_text_version: string;
          consent_type: Database["public"]["Enums"]["consent_type"];
          contact_id: string;
          created_at?: string;
          granted?: boolean;
          granted_at?: string;
          id?: string;
          ip_address?: unknown | null;
          signature_image_url?: string | null;
          signature_svg?: string | null;
          updated_at?: string;
          user_agent?: string | null;
          user_id: string;
        };
        Update: {
          consent_text_version?: string;
          consent_type?: Database["public"]["Enums"]["consent_type"];
          contact_id?: string;
          created_at?: string;
          granted?: boolean;
          granted_at?: string;
          id?: string;
          ip_address?: unknown | null;
          signature_image_url?: string | null;
          signature_svg?: string | null;
          updated_at?: string;
          user_agent?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "client_consents_contact_id_fkey";
            columns: ["contact_id"];
            isOneToOne: false;
            referencedRelation: "contacts";
            referencedColumns: ["id"];
          },
        ];
      };
      client_files: {
        Row: {
          contact_id: string;
          created_at: string;
          file_path: string;
          file_size: number | null;
          file_type: Database["public"]["Enums"]["file_type"];
          id: string;
          mime_type: string | null;
          user_id: string;
        };
        Insert: {
          contact_id: string;
          created_at?: string;
          file_path: string;
          file_size?: number | null;
          file_type?: Database["public"]["Enums"]["file_type"];
          id?: string;
          mime_type?: string | null;
          user_id: string;
        };
        Update: {
          contact_id?: string;
          created_at?: string;
          file_path?: string;
          file_size?: number | null;
          file_type?: Database["public"]["Enums"]["file_type"];
          id?: string;
          mime_type?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "client_files_contact_id_fkey";
            columns: ["contact_id"];
            isOneToOne: false;
            referencedRelation: "contacts";
            referencedColumns: ["id"];
          },
        ];
      };
      contact_identities: {
        Row: {
          contact_id: string;
          created_at: string;
          id: string;
          kind: string;
          provider: string | null;
          user_id: string;
          value: string;
        };
        Insert: {
          contact_id: string;
          created_at?: string;
          id?: string;
          kind: string;
          provider?: string | null;
          user_id: string;
          value: string;
        };
        Update: {
          contact_id?: string;
          created_at?: string;
          id?: string;
          kind?: string;
          provider?: string | null;
          user_id?: string;
          value?: string;
        };
        Relationships: [
          {
            foreignKeyName: "contact_identities_contact_id_fkey";
            columns: ["contact_id"];
            isOneToOne: false;
            referencedRelation: "contacts";
            referencedColumns: ["id"];
          },
        ];
      };
      contact_timeline: {
        Row: {
          contact_id: string;
          created_at: string;
          description: string | null;
          event_data: Json | null;
          event_type: string;
          id: string;
          occurred_at: string;
          title: string;
          user_id: string;
        };
        Insert: {
          contact_id: string;
          created_at?: string;
          description?: string | null;
          event_data?: Json | null;
          event_type: string;
          id?: string;
          occurred_at: string;
          title: string;
          user_id: string;
        };
        Update: {
          contact_id?: string;
          created_at?: string;
          description?: string | null;
          event_data?: Json | null;
          event_type?: string;
          id?: string;
          occurred_at?: string;
          title?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "contact_timeline_contact_id_fkey";
            columns: ["contact_id"];
            isOneToOne: false;
            referencedRelation: "contacts";
            referencedColumns: ["id"];
          },
        ];
      };
      contacts: {
        Row: {
          address: Json | null;
          contact_status: string | null;
          confidence_score: string | null;
          created_at: string;
          date_of_birth: string | null;
          display_name: string;
          emergency_contact_name: string | null;
          emergency_contact_phone: string | null;
          health_context: Json | null;
          id: string;
          lifecycle_stage: string | null;
          photo_url: string | null;
          preferences: Json | null;
          primary_email: string | null;
          primary_phone: string | null;
          referral_source: string | null;
          source: string | null;
          tags: Json | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          address?: Json | null;
          contact_status?: string | null;
          confidence_score?: string | null;
          created_at?: string;
          date_of_birth?: string | null;
          display_name: string;
          emergency_contact_name?: string | null;
          emergency_contact_phone?: string | null;
          health_context?: Json | null;
          id?: string;
          lifecycle_stage?: string | null;
          photo_url?: string | null;
          preferences?: Json | null;
          primary_email?: string | null;
          primary_phone?: string | null;
          referral_source?: string | null;
          source?: string | null;
          tags?: Json | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          address?: Json | null;
          client_status?: string | null;
          confidence_score?: string | null;
          created_at?: string;
          date_of_birth?: string | null;
          display_name?: string;
          emergency_contact_name?: string | null;
          emergency_contact_phone?: string | null;
          health_context?: Json | null;
          id?: string;
          lifecycle_stage?: string | null;
          photo_url?: string | null;
          preferences?: Json | null;
          primary_email?: string | null;
          primary_phone?: string | null;
          referral_source?: string | null;
          source?: string | null;
          tags?: Json | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      daily_pulse_logs: {
        Row: {
          created_at: string;
          details: Json | null;
          id: string;
          log_date: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          details?: Json | null;
          id?: string;
          log_date: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          details?: Json | null;
          id?: string;
          log_date?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      documents: {
        Row: {
          created_at: string;
          id: string;
          meta: Json | null;
          mime: string | null;
          owner_contact_id: string | null;
          text: string | null;
          title: string | null;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          meta?: Json | null;
          mime?: string | null;
          owner_contact_id?: string | null;
          text?: string | null;
          title?: string | null;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          meta?: Json | null;
          mime?: string | null;
          owner_contact_id?: string | null;
          text?: string | null;
          title?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
      embeddings: {
        Row: {
          chunk_index: number | null;
          content_hash: string | null;
          created_at: string;
          embedding: string | null;
          embedding_v: string | null;
          id: string;
          meta: Json | null;
          owner_id: string;
          owner_type: string;
          user_id: string;
        };
        Insert: {
          chunk_index?: number | null;
          content_hash?: string | null;
          created_at?: string;
          embedding?: string | null;
          embedding_v?: string | null;
          id?: string;
          meta?: Json | null;
          owner_id: string;
          owner_type: string;
          user_id: string;
        };
        Update: {
          chunk_index?: number | null;
          content_hash?: string | null;
          created_at?: string;
          embedding?: string | null;
          embedding_v?: string | null;
          id?: string;
          meta?: Json | null;
          owner_id?: string;
          owner_type?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      goals: {
        Row: {
          contact_id: string | null;
          created_at: string;
          details: Json | null;
          goal_type: Database["public"]["Enums"]["goal_type"];
          id: string;
          name: string;
          status: Database["public"]["Enums"]["goal_status"];
          target_date: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          contact_id?: string | null;
          created_at?: string;
          details?: Json | null;
          goal_type: Database["public"]["Enums"]["goal_type"];
          id?: string;
          name: string;
          status?: Database["public"]["Enums"]["goal_status"];
          target_date?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          contact_id?: string | null;
          created_at?: string;
          details?: Json | null;
          goal_type?: Database["public"]["Enums"]["goal_type"];
          id?: string;
          name?: string;
          status?: Database["public"]["Enums"]["goal_status"];
          target_date?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "goals_contact_id_fkey";
            columns: ["contact_id"];
            isOneToOne: false;
            referencedRelation: "contacts";
            referencedColumns: ["id"];
          },
        ];
      };
      inbox_items: {
        Row: {
          created_at: string;
          created_task_id: string | null;
          id: string;
          processed_at: string | null;
          raw_text: string;
          status: Database["public"]["Enums"]["inbox_item_status"];
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          created_task_id?: string | null;
          id?: string;
          processed_at?: string | null;
          raw_text: string;
          status?: Database["public"]["Enums"]["inbox_item_status"];
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          created_task_id?: string | null;
          id?: string;
          processed_at?: string | null;
          raw_text?: string;
          status?: Database["public"]["Enums"]["inbox_item_status"];
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      interactions: {
        Row: {
          batch_id: string | null;
          body_raw: Json | null;
          body_text: string | null;
          contact_id: string | null;
          created_at: string;
          id: string;
          occurred_at: string;
          source: string | null;
          source_id: string | null;
          source_meta: Json | null;
          subject: string | null;
          type: string;
          user_id: string;
        };
        Insert: {
          batch_id?: string | null;
          body_raw?: Json | null;
          body_text?: string | null;
          contact_id?: string | null;
          created_at?: string;
          id?: string;
          occurred_at: string;
          source?: string | null;
          source_id?: string | null;
          source_meta?: Json | null;
          subject?: string | null;
          type: string;
          user_id: string;
        };
        Update: {
          batch_id?: string | null;
          body_raw?: Json | null;
          body_text?: string | null;
          contact_id?: string | null;
          created_at?: string;
          id?: string;
          occurred_at?: string;
          source?: string | null;
          source_id?: string | null;
          source_meta?: Json | null;
          subject?: string | null;
          type?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "interactions_contact_fk";
            columns: ["contact_id"];
            isOneToOne: false;
            referencedRelation: "contacts";
            referencedColumns: ["id"];
          },
        ];
      };
      jobs: {
        Row: {
          attempts: number;
          batch_id: string | null;
          created_at: string;
          id: string;
          kind: string;
          last_error: string | null;
          payload: Json;
          status: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          attempts?: number;
          batch_id?: string | null;
          created_at?: string;
          id?: string;
          kind: string;
          last_error?: string | null;
          payload: Json;
          status?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          attempts?: number;
          batch_id?: string | null;
          created_at?: string;
          id?: string;
          kind?: string;
          last_error?: string | null;
          payload?: Json;
          status?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      messages: {
        Row: {
          content: Json;
          created_at: string;
          id: string;
          role: string;
          thread_id: string;
          user_id: string;
        };
        Insert: {
          content: Json;
          created_at?: string;
          id?: string;
          role: string;
          thread_id: string;
          user_id: string;
        };
        Update: {
          content?: Json;
          created_at?: string;
          id?: string;
          role?: string;
          thread_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "messages_thread_id_fkey";
            columns: ["thread_id"];
            isOneToOne: false;
            referencedRelation: "threads";
            referencedColumns: ["id"];
          },
        ];
      };
      notes: {
        Row: {
          contact_id: string | null;
          content: string;
          created_at: string;
          id: string;
          title: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          contact_id?: string | null;
          content: string;
          created_at?: string;
          id?: string;
          title?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          contact_id?: string | null;
          content?: string;
          created_at?: string;
          id?: string;
          title?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "notes_contact_id_fkey";
            columns: ["contact_id"];
            isOneToOne: false;
            referencedRelation: "contacts";
            referencedColumns: ["id"];
          },
        ];
      };
      onboarding_tokens: {
        Row: {
          created_at: string;
          created_by: string;
          disabled: boolean;
          expires_at: string;
          id: string;
          label: string | null;
          max_uses: number;
          token: string;
          used_count: number;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          created_by: string;
          disabled?: boolean;
          expires_at: string;
          id?: string;
          label?: string | null;
          max_uses?: number;
          token: string;
          used_count?: number;
          user_id: string;
        };
        Update: {
          created_at?: string;
          created_by?: string;
          disabled?: boolean;
          expires_at?: string;
          id?: string;
          label?: string | null;
          max_uses?: number;
          token?: string;
          used_count?: number;
          user_id?: string;
        };
        Relationships: [];
      };
      projects: {
        Row: {
          created_at: string;
          details: Json | null;
          due_date: string | null;
          id: string;
          name: string;
          status: Database["public"]["Enums"]["project_status"];
          updated_at: string;
          user_id: string;
          zone_id: number | null;
        };
        Insert: {
          created_at?: string;
          details?: Json | null;
          due_date?: string | null;
          id?: string;
          name: string;
          status?: Database["public"]["Enums"]["project_status"];
          updated_at?: string;
          user_id: string;
          zone_id?: number | null;
        };
        Update: {
          created_at?: string;
          details?: Json | null;
          due_date?: string | null;
          id?: string;
          name?: string;
          status?: Database["public"]["Enums"]["project_status"];
          updated_at?: string;
          user_id?: string;
          zone_id?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "projects_zone_id_fkey";
            columns: ["zone_id"];
            isOneToOne: false;
            referencedRelation: "zones";
            referencedColumns: ["id"];
          },
        ];
      };
      raw_event_errors: {
        Row: {
          context: Json | null;
          error: string;
          error_at: string;
          id: string;
          provider: string;
          raw_event_id: string | null;
          stage: string;
          user_id: string;
        };
        Insert: {
          context?: Json | null;
          error: string;
          error_at?: string;
          id?: string;
          provider: string;
          raw_event_id?: string | null;
          stage: string;
          user_id: string;
        };
        Update: {
          context?: Json | null;
          error?: string;
          error_at?: string;
          id?: string;
          provider?: string;
          raw_event_id?: string | null;
          stage?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "raw_event_errors_raw_event_id_fkey";
            columns: ["raw_event_id"];
            isOneToOne: false;
            referencedRelation: "raw_events";
            referencedColumns: ["id"];
          },
        ];
      };
      raw_events: {
        Row: {
          batch_id: string | null;
          contact_id: string | null;
          created_at: string;
          id: string;
          occurred_at: string;
          payload: Json;
          provider: string;
          source_id: string | null;
          source_meta: Json | null;
          user_id: string;
        };
        Insert: {
          batch_id?: string | null;
          contact_id?: string | null;
          created_at?: string;
          id?: string;
          occurred_at: string;
          payload: Json;
          provider: string;
          source_id?: string | null;
          source_meta?: Json | null;
          user_id: string;
        };
        Update: {
          batch_id?: string | null;
          contact_id?: string | null;
          created_at?: string;
          id?: string;
          occurred_at?: string;
          payload?: Json;
          provider?: string;
          source_id?: string | null;
          source_meta?: Json | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "raw_events_contact_fk";
            columns: ["contact_id"];
            isOneToOne: false;
            referencedRelation: "contacts";
            referencedColumns: ["id"];
          },
        ];
      };
      sync_audit: {
        Row: {
          action: string;
          created_at: string;
          id: string;
          payload: Json | null;
          provider: string;
          user_id: string;
        };
        Insert: {
          action: string;
          created_at?: string;
          id?: string;
          payload?: Json | null;
          provider: string;
          user_id: string;
        };
        Update: {
          action?: string;
          created_at?: string;
          id?: string;
          payload?: Json | null;
          provider?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      sync_sessions: {
        Row: {
          completed_at: string | null;
          current_step: string | null;
          error_details: Json | null;
          failed_items: number | null;
          id: string;
          imported_items: number | null;
          preferences: Json | null;
          processed_items: number | null;
          progress_percentage: number | null;
          service: string;
          started_at: string | null;
          status: string;
          total_items: number | null;
          user_id: string;
        };
        Insert: {
          completed_at?: string | null;
          current_step?: string | null;
          error_details?: Json | null;
          failed_items?: number | null;
          id?: string;
          imported_items?: number | null;
          preferences?: Json | null;
          processed_items?: number | null;
          progress_percentage?: number | null;
          service: string;
          started_at?: string | null;
          status?: string;
          total_items?: number | null;
          user_id: string;
        };
        Update: {
          completed_at?: string | null;
          current_step?: string | null;
          error_details?: Json | null;
          failed_items?: number | null;
          id?: string;
          imported_items?: number | null;
          preferences?: Json | null;
          processed_items?: number | null;
          progress_percentage?: number | null;
          service?: string;
          started_at?: string | null;
          status?: string;
          total_items?: number | null;
          user_id?: string;
        };
        Relationships: [];
      };
      task_contact_tags: {
        Row: {
          contact_id: string;
          task_id: string;
        };
        Insert: {
          contact_id: string;
          task_id: string;
        };
        Update: {
          contact_id?: string;
          task_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "task_contact_tags_contact_id_fkey";
            columns: ["contact_id"];
            isOneToOne: false;
            referencedRelation: "contacts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "task_contact_tags_task_id_fkey";
            columns: ["task_id"];
            isOneToOne: false;
            referencedRelation: "tasks";
            referencedColumns: ["id"];
          },
        ];
      };
      tasks: {
        Row: {
          completed_at: string | null;
          created_at: string;
          details: Json | null;
          due_date: string | null;
          id: string;
          name: string;
          parent_task_id: string | null;
          priority: Database["public"]["Enums"]["task_priority"];
          project_id: string | null;
          status: Database["public"]["Enums"]["task_status"];
          updated_at: string;
          user_id: string;
        };
        Insert: {
          completed_at?: string | null;
          created_at?: string;
          details?: Json | null;
          due_date?: string | null;
          id?: string;
          name: string;
          parent_task_id?: string | null;
          priority?: Database["public"]["Enums"]["task_priority"];
          project_id?: string | null;
          status?: Database["public"]["Enums"]["task_status"];
          updated_at?: string;
          user_id: string;
        };
        Update: {
          completed_at?: string | null;
          created_at?: string;
          details?: Json | null;
          due_date?: string | null;
          id?: string;
          name?: string;
          parent_task_id?: string | null;
          priority?: Database["public"]["Enums"]["task_priority"];
          project_id?: string | null;
          status?: Database["public"]["Enums"]["task_status"];
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tasks_parent_task_id_fkey";
            columns: ["parent_task_id"];
            isOneToOne: false;
            referencedRelation: "tasks";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tasks_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      threads: {
        Row: {
          created_at: string;
          id: string;
          title: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          title?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          title?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      tool_invocations: {
        Row: {
          args: Json;
          created_at: string;
          id: string;
          latency_ms: number | null;
          message_id: string;
          result: Json | null;
          tool: string;
          user_id: string;
        };
        Insert: {
          args: Json;
          created_at?: string;
          id?: string;
          latency_ms?: number | null;
          message_id: string;
          result?: Json | null;
          tool: string;
          user_id: string;
        };
        Update: {
          args?: Json;
          created_at?: string;
          id?: string;
          latency_ms?: number | null;
          message_id?: string;
          result?: Json | null;
          tool?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tool_invocations_message_id_fkey";
            columns: ["message_id"];
            isOneToOne: false;
            referencedRelation: "messages";
            referencedColumns: ["id"];
          },
        ];
      };
      user_integrations: {
        Row: {
          access_token: string;
          created_at: string;
          expiry_date: string | null;
          provider: string;
          refresh_token: string | null;
          service: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          access_token: string;
          created_at?: string;
          expiry_date?: string | null;
          provider: string;
          refresh_token?: string | null;
          service?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          access_token?: string;
          created_at?: string;
          expiry_date?: string | null;
          provider?: string;
          refresh_token?: string | null;
          service?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      user_sync_prefs: {
        Row: {
          calendar_future_days: number | null;
          calendar_ids: string[] | null;
          calendar_include_organizer_self: boolean;
          calendar_include_private: boolean;
          calendar_time_window_days: number;
          created_at: string;
          drive_folder_ids: string[];
          drive_ingestion_mode: string;
          drive_max_size_mb: number | null;
          gmail_time_range_days: number | null;
          initial_sync_completed: boolean;
          initial_sync_date: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          calendar_future_days?: number | null;
          calendar_ids?: string[] | null;
          calendar_include_organizer_self?: boolean;
          calendar_include_private?: boolean;
          calendar_time_window_days?: number;
          created_at?: string;
          drive_folder_ids?: string[];
          drive_ingestion_mode?: string;
          drive_max_size_mb?: number | null;
          gmail_time_range_days?: number | null;
          initial_sync_completed?: boolean;
          initial_sync_date?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          calendar_future_days?: number | null;
          calendar_ids?: string[] | null;
          calendar_include_organizer_self?: boolean;
          calendar_include_private?: boolean;
          calendar_time_window_days?: number;
          created_at?: string;
          drive_folder_ids?: string[];
          drive_ingestion_mode?: string;
          drive_max_size_mb?: number | null;
          gmail_time_range_days?: number | null;
          initial_sync_completed?: boolean;
          initial_sync_date?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      zones: {
        Row: {
          color: string | null;
          icon_name: string | null;
          id: number;
          name: string;
        };
        Insert: {
          color?: string | null;
          icon_name?: string | null;
          id?: number;
          name: string;
        };
        Update: {
          color?: string | null;
          icon_name?: string | null;
          id?: number;
          name?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      check_client_consent: {
        Args: {
          p_consent_type: string;
          p_contact_id: string;
          p_user_id?: string;
        };
        Returns: boolean;
      };
      immutable_90_days_ago: {
        Args: Record<PropertyKey, never>;
        Returns: string;
      };
      onboard_client_with_token: {
        Args: {
          p_client: Json;
          p_consent: Json;
          p_photo_path?: string;
          p_token: string;
        };
        Returns: string;
      };
      stable_90_days_ago: {
        Args: Record<PropertyKey, never>;
        Returns: string;
      };
    };
    Enums: {
      consent_type: "data_processing" | "marketing" | "hipaa" | "photography";
      file_type: "photo" | "document" | "form";
      goal_status: "on_track" | "at_risk" | "achieved" | "abandoned";
      goal_type: "practitioner_business" | "practitioner_personal" | "client_wellness";
      inbox_item_status: "unprocessed" | "processed" | "archived";
      project_status: "active" | "on_hold" | "completed" | "archived";
      task_priority: "low" | "medium" | "high" | "urgent";
      task_status: "todo" | "in_progress" | "done" | "canceled";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      consent_type: ["data_processing", "marketing", "hipaa", "photography"],
      file_type: ["photo", "document", "form"],
      goal_status: ["on_track", "at_risk", "achieved", "abandoned"],
      goal_type: ["practitioner_business", "practitioner_personal", "client_wellness"],
      inbox_item_status: ["unprocessed", "processed", "archived"],
      project_status: ["active", "on_hold", "completed", "archived"],
      task_priority: ["low", "medium", "high", "urgent"],
      task_status: ["todo", "in_progress", "done", "canceled"],
    },
  },
} as const;
