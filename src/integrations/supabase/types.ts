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
      brand_settings: {
        Row: {
          business_name: string
          created_at: string
          id: string
          logo_url: string | null
          tagline: string | null
          updated_at: string
          workshop_id: string | null
        }
        Insert: {
          business_name?: string
          created_at?: string
          id?: string
          logo_url?: string | null
          tagline?: string | null
          updated_at?: string
          workshop_id?: string | null
        }
        Update: {
          business_name?: string
          created_at?: string
          id?: string
          logo_url?: string | null
          tagline?: string | null
          updated_at?: string
          workshop_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "brand_settings_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshops"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_earnings: {
        Row: {
          commission_earned: number
          created_at: string
          currency: string
          earnings_date: string
          employee_id: string
          gross_income: number
          id: string
          net_profit: number
          parts_cost: number
          repair_id: string
          workshop_id: string | null
        }
        Insert: {
          commission_earned?: number
          created_at?: string
          currency?: string
          earnings_date?: string
          employee_id: string
          gross_income?: number
          id?: string
          net_profit?: number
          parts_cost?: number
          repair_id: string
          workshop_id?: string | null
        }
        Update: {
          commission_earned?: number
          created_at?: string
          currency?: string
          earnings_date?: string
          employee_id?: string
          gross_income?: number
          id?: string
          net_profit?: number
          parts_cost?: number
          repair_id?: string
          workshop_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_earnings_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_earnings_repair_id_fkey"
            columns: ["repair_id"]
            isOneToOne: true
            referencedRelation: "repairs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_earnings_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshops"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_loans: {
        Row: {
          amount: number
          created_at: string
          created_by: string
          description: string | null
          employee_id: string
          id: string
          is_paid: boolean | null
          loan_date: string
          paid_at: string | null
          workshop_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          created_by: string
          description?: string | null
          employee_id: string
          id?: string
          is_paid?: boolean | null
          loan_date?: string
          paid_at?: string | null
          workshop_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string
          description?: string | null
          employee_id?: string
          id?: string
          is_paid?: boolean | null
          loan_date?: string
          paid_at?: string | null
          workshop_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_loans_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_loans_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshops"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          base_salary: number | null
          created_at: string
          hired_at: string | null
          id: string
          is_active: boolean | null
          monthly_commission_rate: number
          profile_id: string | null
          updated_at: string
          user_id: string
          workshop_id: string | null
        }
        Insert: {
          base_salary?: number | null
          created_at?: string
          hired_at?: string | null
          id?: string
          is_active?: boolean | null
          monthly_commission_rate?: number
          profile_id?: string | null
          updated_at?: string
          user_id: string
          workshop_id?: string | null
        }
        Update: {
          base_salary?: number | null
          created_at?: string
          hired_at?: string | null
          id?: string
          is_active?: boolean | null
          monthly_commission_rate?: number
          profile_id?: string | null
          updated_at?: string
          user_id?: string
          workshop_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employees_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshops"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_methods: {
        Row: {
          account_holder: string | null
          account_number: string | null
          bank_name: string | null
          binance_id: string | null
          created_at: string
          display_order: number | null
          id: string
          instructions: string | null
          is_active: boolean | null
          label: string
          type: string
        }
        Insert: {
          account_holder?: string | null
          account_number?: string | null
          bank_name?: string | null
          binance_id?: string | null
          created_at?: string
          display_order?: number | null
          id?: string
          instructions?: string | null
          is_active?: boolean | null
          label: string
          type: string
        }
        Update: {
          account_holder?: string | null
          account_number?: string | null
          bank_name?: string | null
          binance_id?: string | null
          created_at?: string
          display_order?: number | null
          id?: string
          instructions?: string | null
          is_active?: boolean | null
          label?: string
          type?: string
        }
        Relationships: []
      }
      payment_requests: {
        Row: {
          admin_notes: string | null
          amount: number
          billing_period: string | null
          created_at: string
          currency: string
          id: string
          notes: string | null
          payment_method_id: string | null
          plan_id: string
          receipt_url: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          workshop_id: string
        }
        Insert: {
          admin_notes?: string | null
          amount: number
          billing_period?: string | null
          created_at?: string
          currency?: string
          id?: string
          notes?: string | null
          payment_method_id?: string | null
          plan_id: string
          receipt_url?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          workshop_id: string
        }
        Update: {
          admin_notes?: string | null
          amount?: number
          billing_period?: string | null
          created_at?: string
          currency?: string
          id?: string
          notes?: string | null
          payment_method_id?: string | null
          plan_id?: string
          receipt_url?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          workshop_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_requests_payment_method_id_fkey"
            columns: ["payment_method_id"]
            isOneToOne: false
            referencedRelation: "payment_methods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_requests_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_requests_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshops"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          annual_price: number
          created_at: string
          currency: string
          description: string | null
          display_order: number | null
          features: Json | null
          has_free_trial: boolean | null
          id: string
          is_active: boolean | null
          monthly_price: number
          name: string
          trial_days: number | null
          updated_at: string
        }
        Insert: {
          annual_price?: number
          created_at?: string
          currency?: string
          description?: string | null
          display_order?: number | null
          features?: Json | null
          has_free_trial?: boolean | null
          id?: string
          is_active?: boolean | null
          monthly_price?: number
          name: string
          trial_days?: number | null
          updated_at?: string
        }
        Update: {
          annual_price?: number
          created_at?: string
          currency?: string
          description?: string | null
          display_order?: number | null
          features?: Json | null
          has_free_trial?: boolean | null
          id?: string
          is_active?: boolean | null
          monthly_price?: number
          name?: string
          trial_days?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      platform_settings: {
        Row: {
          created_at: string
          id: string
          platform_name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          platform_name?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          platform_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string
          id: string
          updated_at: string
          user_id: string
          workshop_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name: string
          id?: string
          updated_at?: string
          user_id: string
          workshop_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string
          id?: string
          updated_at?: string
          user_id?: string
          workshop_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshops"
            referencedColumns: ["id"]
          },
        ]
      }
      repair_types: {
        Row: {
          created_at: string
          description: string | null
          estimated_price: number | null
          id: string
          name: string
          workshop_id: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          estimated_price?: number | null
          id?: string
          name: string
          workshop_id?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          estimated_price?: number | null
          id?: string
          name?: string
          workshop_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "repair_types_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshops"
            referencedColumns: ["id"]
          },
        ]
      }
      repairs: {
        Row: {
          completed_at: string | null
          created_at: string
          created_by: string
          currency: string
          customer_name: string
          customer_phone: string
          delivery_date: string | null
          delivery_time: string | null
          deposit: number | null
          device_brand: string
          device_imei: string | null
          device_model: string
          estimated_price: number
          failure_reason: string | null
          final_price: number | null
          id: string
          parts_cost: number | null
          repair_description: string | null
          repair_type_id: string | null
          status: Database["public"]["Enums"]["repair_status"]
          technical_notes: string | null
          technician_id: string | null
          updated_at: string
          warranty_days: number | null
          workshop_id: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          created_by: string
          currency?: string
          customer_name: string
          customer_phone: string
          delivery_date?: string | null
          delivery_time?: string | null
          deposit?: number | null
          device_brand: string
          device_imei?: string | null
          device_model: string
          estimated_price?: number
          failure_reason?: string | null
          final_price?: number | null
          id?: string
          parts_cost?: number | null
          repair_description?: string | null
          repair_type_id?: string | null
          status?: Database["public"]["Enums"]["repair_status"]
          technical_notes?: string | null
          technician_id?: string | null
          updated_at?: string
          warranty_days?: number | null
          workshop_id?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          created_by?: string
          currency?: string
          customer_name?: string
          customer_phone?: string
          delivery_date?: string | null
          delivery_time?: string | null
          deposit?: number | null
          device_brand?: string
          device_imei?: string | null
          device_model?: string
          estimated_price?: number
          failure_reason?: string | null
          final_price?: number | null
          id?: string
          parts_cost?: number | null
          repair_description?: string | null
          repair_type_id?: string | null
          status?: Database["public"]["Enums"]["repair_status"]
          technical_notes?: string | null
          technician_id?: string | null
          updated_at?: string
          warranty_days?: number | null
          workshop_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "repairs_repair_type_id_fkey"
            columns: ["repair_type_id"]
            isOneToOne: false
            referencedRelation: "repair_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "repairs_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshops"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      workshops: {
        Row: {
          address: string | null
          created_at: string
          email: string | null
          id: string
          is_active: boolean | null
          logo_url: string | null
          name: string
          owner_id: string
          phone: string | null
          plan_id: string | null
          subscription_ends_at: string | null
          subscription_status: string
          trial_ends_at: string | null
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name: string
          owner_id: string
          phone?: string | null
          plan_id?: string | null
          subscription_ends_at?: string | null
          subscription_status?: string
          trial_ends_at?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name?: string
          owner_id?: string
          phone?: string | null
          plan_id?: string | null
          subscription_ends_at?: string | null
          subscription_status?: string
          trial_ends_at?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workshops_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cleanup_employee: { Args: { p_employee_id: string }; Returns: undefined }
      get_user_workshop_id: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "technician" | "super_admin"
      repair_status:
        | "received"
        | "in_progress"
        | "ready"
        | "delivered"
        | "failed"
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
      app_role: ["admin", "technician", "super_admin"],
      repair_status: [
        "received",
        "in_progress",
        "ready",
        "delivered",
        "failed",
      ],
    },
  },
} as const
