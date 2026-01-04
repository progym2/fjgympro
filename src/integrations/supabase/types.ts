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
      access_logs: {
        Row: {
          access_method: string | null
          check_in_at: string
          check_out_at: string | null
          id: string
          notes: string | null
          profile_id: string
          registered_by: string | null
        }
        Insert: {
          access_method?: string | null
          check_in_at?: string
          check_out_at?: string | null
          id?: string
          notes?: string | null
          profile_id: string
          registered_by?: string | null
        }
        Update: {
          access_method?: string | null
          check_in_at?: string
          check_out_at?: string | null
          id?: string
          notes?: string | null
          profile_id?: string
          registered_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "access_logs_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "access_logs_registered_by_fkey"
            columns: ["registered_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      active_sessions: {
        Row: {
          created_at: string
          device_info: string | null
          id: string
          ip_address: string | null
          is_valid: boolean
          last_activity: string
          profile_id: string
          session_token: string
        }
        Insert: {
          created_at?: string
          device_info?: string | null
          id?: string
          ip_address?: string | null
          is_valid?: boolean
          last_activity?: string
          profile_id: string
          session_token: string
        }
        Update: {
          created_at?: string
          device_info?: string | null
          id?: string
          ip_address?: string | null
          is_valid?: boolean
          last_activity?: string
          profile_id?: string
          session_token?: string
        }
        Relationships: [
          {
            foreignKeyName: "active_sessions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      exercise_favorites: {
        Row: {
          created_at: string
          exercise_id: string
          id: string
          profile_id: string
        }
        Insert: {
          created_at?: string
          exercise_id: string
          id?: string
          profile_id: string
        }
        Update: {
          created_at?: string
          exercise_id?: string
          id?: string
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exercise_favorites_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exercise_favorites_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      exercises: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          difficulty: string | null
          equipment: string | null
          id: string
          instructions: string | null
          is_system: boolean | null
          muscle_group: string | null
          name: string
          tenant_id: string | null
          video_url: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          difficulty?: string | null
          equipment?: string | null
          id?: string
          instructions?: string | null
          is_system?: boolean | null
          muscle_group?: string | null
          name: string
          tenant_id?: string | null
          video_url?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          difficulty?: string | null
          equipment?: string | null
          id?: string
          instructions?: string | null
          is_system?: boolean | null
          muscle_group?: string | null
          name?: string
          tenant_id?: string | null
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exercises_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exercises_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      hydration_records: {
        Row: {
          amount_ml: number
          id: string
          profile_id: string
          recorded_at: string | null
        }
        Insert: {
          amount_ml: number
          id?: string
          profile_id: string
          recorded_at?: string | null
        }
        Update: {
          amount_ml?: number
          id?: string
          profile_id?: string
          recorded_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hydration_records_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      hydration_settings: {
        Row: {
          daily_goal_ml: number | null
          end_hour: number | null
          id: string
          profile_id: string
          reminder_enabled: boolean | null
          reminder_interval_minutes: number | null
          start_hour: number | null
        }
        Insert: {
          daily_goal_ml?: number | null
          end_hour?: number | null
          id?: string
          profile_id: string
          reminder_enabled?: boolean | null
          reminder_interval_minutes?: number | null
          start_hour?: number | null
        }
        Update: {
          daily_goal_ml?: number | null
          end_hour?: number | null
          id?: string
          profile_id?: string
          reminder_enabled?: boolean | null
          reminder_interval_minutes?: number | null
          start_hour?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "hydration_settings_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      instructor_clients: {
        Row: {
          client_id: string
          fitness_level_by_instructor: string | null
          id: string
          instructor_id: string
          is_active: boolean | null
          link_status: string
          linked_at: string | null
          responded_at: string | null
          unlinked_at: string | null
        }
        Insert: {
          client_id: string
          fitness_level_by_instructor?: string | null
          id?: string
          instructor_id: string
          is_active?: boolean | null
          link_status?: string
          linked_at?: string | null
          responded_at?: string | null
          unlinked_at?: string | null
        }
        Update: {
          client_id?: string
          fitness_level_by_instructor?: string | null
          id?: string
          instructor_id?: string
          is_active?: boolean | null
          link_status?: string
          linked_at?: string | null
          responded_at?: string | null
          unlinked_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "instructor_clients_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "instructor_clients_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      licenses: {
        Row: {
          created_at: string | null
          created_by: string | null
          demo_started_at: string | null
          expires_at: string | null
          id: string
          license_key: string
          license_type: Database["public"]["Enums"]["license_type"]
          profile_id: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["license_status"]
          tenant_id: string | null
          trial_started_at: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          demo_started_at?: string | null
          expires_at?: string | null
          id?: string
          license_key: string
          license_type?: Database["public"]["Enums"]["license_type"]
          profile_id?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["license_status"]
          tenant_id?: string | null
          trial_started_at?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          demo_started_at?: string | null
          expires_at?: string | null
          id?: string
          license_key?: string
          license_type?: Database["public"]["Enums"]["license_type"]
          profile_id?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["license_status"]
          tenant_id?: string | null
          trial_started_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "licenses_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "licenses_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "licenses_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      master_credentials: {
        Row: {
          created_at: string | null
          created_by: string | null
          full_name: string | null
          id: string
          is_active: boolean
          password: string
          updated_at: string | null
          username: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          full_name?: string | null
          id?: string
          is_active?: boolean
          password: string
          updated_at?: string | null
          username: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          full_name?: string | null
          id?: string
          is_active?: boolean
          password?: string
          updated_at?: string | null
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "master_credentials_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      meal_plans: {
        Row: {
          assigned_to: string | null
          carbs_grams: number | null
          created_at: string | null
          created_by: string
          description: string | null
          fat_grams: number | null
          id: string
          is_active: boolean | null
          is_instructor_plan: boolean | null
          name: string
          protein_grams: number | null
          total_calories: number | null
        }
        Insert: {
          assigned_to?: string | null
          carbs_grams?: number | null
          created_at?: string | null
          created_by: string
          description?: string | null
          fat_grams?: number | null
          id?: string
          is_active?: boolean | null
          is_instructor_plan?: boolean | null
          name: string
          protein_grams?: number | null
          total_calories?: number | null
        }
        Update: {
          assigned_to?: string | null
          carbs_grams?: number | null
          created_at?: string | null
          created_by?: string
          description?: string | null
          fat_grams?: number | null
          id?: string
          is_active?: boolean | null
          is_instructor_plan?: boolean | null
          name?: string
          protein_grams?: number | null
          total_calories?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "meal_plans_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meal_plans_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string | null
          id: string
          is_read: boolean | null
          message: string
          profile_id: string
          tenant_id: string | null
          title: string
          type: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message: string
          profile_id: string
          tenant_id?: string | null
          title: string
          type?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string
          profile_id?: string
          tenant_id?: string | null
          title?: string
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      password_reset_codes: {
        Row: {
          attempts: number
          code: string
          created_at: string
          expires_at: string
          id: string
          ip_address: string | null
          used_at: string | null
          username: string
        }
        Insert: {
          attempts?: number
          code: string
          created_at?: string
          expires_at: string
          id?: string
          ip_address?: string | null
          used_at?: string | null
          username: string
        }
        Update: {
          attempts?: number
          code?: string
          created_at?: string
          expires_at?: string
          id?: string
          ip_address?: string | null
          used_at?: string | null
          username?: string
        }
        Relationships: []
      }
      payment_plans: {
        Row: {
          client_id: string
          created_at: string | null
          created_by: string
          description: string | null
          discount_percentage: number | null
          id: string
          installment_amount: number
          installments: number
          instructor_id: string | null
          start_date: string
          status: string | null
          tenant_id: string | null
          total_amount: number
          updated_at: string | null
        }
        Insert: {
          client_id: string
          created_at?: string | null
          created_by: string
          description?: string | null
          discount_percentage?: number | null
          id?: string
          installment_amount: number
          installments?: number
          instructor_id?: string | null
          start_date?: string
          status?: string | null
          tenant_id?: string | null
          total_amount: number
          updated_at?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string | null
          created_by?: string
          description?: string | null
          discount_percentage?: number | null
          id?: string
          installment_amount?: number
          installments?: number
          instructor_id?: string | null
          start_date?: string
          status?: string | null
          tenant_id?: string | null
          total_amount?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_plans_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_plans_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_plans_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_plans_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          client_id: string
          created_at: string | null
          description: string | null
          discount_percentage: number | null
          due_date: string | null
          id: string
          installment_number: number | null
          instructor_id: string | null
          late_fee: number | null
          paid_at: string | null
          payment_method: string | null
          plan_id: string | null
          receipt_number: string | null
          status: string | null
          tenant_id: string | null
          total_installments: number | null
        }
        Insert: {
          amount: number
          client_id: string
          created_at?: string | null
          description?: string | null
          discount_percentage?: number | null
          due_date?: string | null
          id?: string
          installment_number?: number | null
          instructor_id?: string | null
          late_fee?: number | null
          paid_at?: string | null
          payment_method?: string | null
          plan_id?: string | null
          receipt_number?: string | null
          status?: string | null
          tenant_id?: string | null
          total_installments?: number | null
        }
        Update: {
          amount?: number
          client_id?: string
          created_at?: string | null
          description?: string | null
          discount_percentage?: number | null
          due_date?: string | null
          id?: string
          installment_number?: number | null
          instructor_id?: string | null
          late_fee?: number | null
          paid_at?: string | null
          payment_method?: string | null
          plan_id?: string | null
          receipt_number?: string | null
          status?: string | null
          tenant_id?: string | null
          total_installments?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_payments_plan_id"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "payment_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      personal_records: {
        Row: {
          achieved_at: string
          created_at: string
          exercise_id: string
          id: string
          notes: string | null
          profile_id: string
          record_type: string
          unit: string
          value: number
          workout_log_id: string | null
        }
        Insert: {
          achieved_at?: string
          created_at?: string
          exercise_id: string
          id?: string
          notes?: string | null
          profile_id: string
          record_type: string
          unit?: string
          value: number
          workout_log_id?: string | null
        }
        Update: {
          achieved_at?: string
          created_at?: string
          exercise_id?: string
          id?: string
          notes?: string | null
          profile_id?: string
          record_type?: string
          unit?: string
          value?: number
          workout_log_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "personal_records_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "personal_records_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "personal_records_workout_log_id_fkey"
            columns: ["workout_log_id"]
            isOneToOne: false
            referencedRelation: "workout_logs"
            referencedColumns: ["id"]
          },
        ]
      }
      pre_generated_accounts: {
        Row: {
          account_type: string
          created_at: string
          created_by: string | null
          id: string
          is_used: boolean
          license_duration_days: number
          license_key: string
          tenant_id: string | null
          used_at: string | null
          used_by_profile_id: string | null
          username: string
        }
        Insert: {
          account_type: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_used?: boolean
          license_duration_days: number
          license_key: string
          tenant_id?: string | null
          used_at?: string | null
          used_by_profile_id?: string | null
          username: string
        }
        Update: {
          account_type?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_used?: boolean
          license_duration_days?: number
          license_key?: string
          tenant_id?: string | null
          used_at?: string | null
          used_by_profile_id?: string | null
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "pre_generated_accounts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pre_generated_accounts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pre_generated_accounts_used_by_profile_id_fkey"
            columns: ["used_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          birth_date: string | null
          city: string | null
          cpf: string | null
          created_at: string | null
          created_by_admin: string | null
          cref: string | null
          email: string | null
          enrollment_date: string | null
          enrollment_status: string | null
          fitness_goal: Database["public"]["Enums"]["fitness_goal"] | null
          fitness_level: string | null
          freeze_end_date: string | null
          freeze_start_date: string | null
          full_name: string | null
          gender: string | null
          height_cm: number | null
          id: string
          monthly_fee: number | null
          notes: string | null
          phone: string | null
          tenant_id: string | null
          updated_at: string | null
          user_id: string | null
          username: string
          weight_kg: number | null
        }
        Insert: {
          avatar_url?: string | null
          birth_date?: string | null
          city?: string | null
          cpf?: string | null
          created_at?: string | null
          created_by_admin?: string | null
          cref?: string | null
          email?: string | null
          enrollment_date?: string | null
          enrollment_status?: string | null
          fitness_goal?: Database["public"]["Enums"]["fitness_goal"] | null
          fitness_level?: string | null
          freeze_end_date?: string | null
          freeze_start_date?: string | null
          full_name?: string | null
          gender?: string | null
          height_cm?: number | null
          id?: string
          monthly_fee?: number | null
          notes?: string | null
          phone?: string | null
          tenant_id?: string | null
          updated_at?: string | null
          user_id?: string | null
          username: string
          weight_kg?: number | null
        }
        Update: {
          avatar_url?: string | null
          birth_date?: string | null
          city?: string | null
          cpf?: string | null
          created_at?: string | null
          created_by_admin?: string | null
          cref?: string | null
          email?: string | null
          enrollment_date?: string | null
          enrollment_status?: string | null
          fitness_goal?: Database["public"]["Enums"]["fitness_goal"] | null
          fitness_level?: string | null
          freeze_end_date?: string | null
          freeze_start_date?: string | null
          full_name?: string | null
          gender?: string | null
          height_cm?: number | null
          id?: string
          monthly_fee?: number | null
          notes?: string | null
          phone?: string | null
          tenant_id?: string | null
          updated_at?: string | null
          user_id?: string | null
          username?: string
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_created_by_admin_fkey"
            columns: ["created_by_admin"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_tenant_id_fkey"
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
          id: string
          is_active: boolean | null
          logo_url: string | null
          name: string
          primary_color: string | null
          settings: Json | null
          slug: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name: string
          primary_color?: string | null
          settings?: Json | null
          slug: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name?: string
          primary_color?: string | null
          settings?: Json | null
          slug?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_theme_preferences: {
        Row: {
          created_at: string | null
          custom_accent_hsl: string | null
          custom_primary_hsl: string | null
          id: string
          profile_id: string
          theme: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          custom_accent_hsl?: string | null
          custom_primary_hsl?: string | null
          id?: string
          profile_id: string
          theme?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          custom_accent_hsl?: string | null
          custom_primary_hsl?: string | null
          id?: string
          profile_id?: string
          theme?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_theme_preferences_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      weight_records: {
        Row: {
          body_fat_percentage: number | null
          id: string
          muscle_mass_kg: number | null
          notes: string | null
          profile_id: string
          recorded_at: string | null
          weight_kg: number
        }
        Insert: {
          body_fat_percentage?: number | null
          id?: string
          muscle_mass_kg?: number | null
          notes?: string | null
          profile_id: string
          recorded_at?: string | null
          weight_kg: number
        }
        Update: {
          body_fat_percentage?: number | null
          id?: string
          muscle_mass_kg?: number | null
          notes?: string | null
          profile_id?: string
          recorded_at?: string | null
          weight_kg?: number
        }
        Relationships: [
          {
            foreignKeyName: "weight_records_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_exercise_logs: {
        Row: {
          completed_at: string
          created_at: string
          id: string
          notes: string | null
          reps_completed: number | null
          sets_completed: number
          weight_used_kg: number | null
          workout_log_id: string
          workout_plan_exercise_id: string
        }
        Insert: {
          completed_at?: string
          created_at?: string
          id?: string
          notes?: string | null
          reps_completed?: number | null
          sets_completed?: number
          weight_used_kg?: number | null
          workout_log_id: string
          workout_plan_exercise_id: string
        }
        Update: {
          completed_at?: string
          created_at?: string
          id?: string
          notes?: string | null
          reps_completed?: number | null
          sets_completed?: number
          weight_used_kg?: number | null
          workout_log_id?: string
          workout_plan_exercise_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_exercise_logs_workout_log_id_fkey"
            columns: ["workout_log_id"]
            isOneToOne: false
            referencedRelation: "workout_logs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_exercise_logs_workout_plan_exercise_id_fkey"
            columns: ["workout_plan_exercise_id"]
            isOneToOne: false
            referencedRelation: "workout_plan_exercises"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_logs: {
        Row: {
          completed_at: string | null
          created_at: string | null
          id: string
          notes: string | null
          profile_id: string
          started_at: string | null
          workout_date: string
          workout_plan_id: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          profile_id: string
          started_at?: string | null
          workout_date: string
          workout_plan_id?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          profile_id?: string
          started_at?: string | null
          workout_date?: string
          workout_plan_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workout_logs_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_logs_workout_plan_id_fkey"
            columns: ["workout_plan_id"]
            isOneToOne: false
            referencedRelation: "workout_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_plan_exercises: {
        Row: {
          day_of_week: number | null
          exercise_id: string
          id: string
          notes: string | null
          order_index: number | null
          reps: number | null
          rest_seconds: number | null
          sets: number | null
          weight_kg: number | null
          workout_plan_id: string
        }
        Insert: {
          day_of_week?: number | null
          exercise_id: string
          id?: string
          notes?: string | null
          order_index?: number | null
          reps?: number | null
          rest_seconds?: number | null
          sets?: number | null
          weight_kg?: number | null
          workout_plan_id: string
        }
        Update: {
          day_of_week?: number | null
          exercise_id?: string
          id?: string
          notes?: string | null
          order_index?: number | null
          reps?: number | null
          rest_seconds?: number | null
          sets?: number | null
          weight_kg?: number | null
          workout_plan_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_plan_exercises_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_plan_exercises_workout_plan_id_fkey"
            columns: ["workout_plan_id"]
            isOneToOne: false
            referencedRelation: "workout_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_plans: {
        Row: {
          assigned_to: string | null
          created_at: string | null
          created_by: string
          description: string | null
          end_date: string | null
          id: string
          is_active: boolean | null
          is_instructor_plan: boolean | null
          name: string
          scheduled_date: string | null
          scheduled_time: string | null
          start_date: string | null
          updated_at: string | null
          weekdays: number[] | null
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string | null
          created_by: string
          description?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          is_instructor_plan?: boolean | null
          name: string
          scheduled_date?: string | null
          scheduled_time?: string | null
          start_date?: string | null
          updated_at?: string | null
          weekdays?: number[] | null
        }
        Update: {
          assigned_to?: string | null
          created_at?: string | null
          created_by?: string
          description?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          is_instructor_plan?: boolean | null
          name?: string
          scheduled_date?: string | null
          scheduled_time?: string | null
          start_date?: string | null
          updated_at?: string | null
          weekdays?: number[] | null
        }
        Relationships: [
          {
            foreignKeyName: "workout_plans_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_plans_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      belongs_to_tenant: { Args: { check_tenant_id: string }; Returns: boolean }
      can_insert_profile: { Args: { _user_id: string }; Returns: boolean }
      generate_license_key: { Args: { prefix?: string }; Returns: string }
      get_current_profile_id: { Args: never; Returns: string }
      get_current_tenant_id: { Args: never; Returns: string }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin_or_higher: { Args: { _user_id: string }; Returns: boolean }
      is_master: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "master" | "admin" | "instructor" | "client"
      fitness_goal:
        | "muscle_gain"
        | "weight_loss"
        | "hypertrophy"
        | "conditioning"
        | "maintenance"
      license_status: "active" | "expired" | "blocked"
      license_type: "demo" | "trial" | "full" | "master"
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
      app_role: ["master", "admin", "instructor", "client"],
      fitness_goal: [
        "muscle_gain",
        "weight_loss",
        "hypertrophy",
        "conditioning",
        "maintenance",
      ],
      license_status: ["active", "expired", "blocked"],
      license_type: ["demo", "trial", "full", "master"],
    },
  },
} as const
