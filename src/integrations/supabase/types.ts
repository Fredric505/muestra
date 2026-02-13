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
        }
        Insert: {
          business_name?: string
          created_at?: string
          id?: string
          logo_url?: string | null
          tagline?: string | null
          updated_at?: string
        }
        Update: {
          business_name?: string
          created_at?: string
          id?: string
          logo_url?: string | null
          tagline?: string | null
          updated_at?: string
        }
        Relationships: []
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
        }
        Relationships: [
          {
            foreignKeyName: "employee_loans_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
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
        }
        Relationships: [
          {
            foreignKeyName: "employees_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      repair_types: {
        Row: {
          created_at: string
          description: string | null
          estimated_price: number | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          estimated_price?: number | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          estimated_price?: number | null
          id?: string
          name?: string
        }
        Relationships: []
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
        }
        Relationships: [
          {
            foreignKeyName: "repairs_repair_type_id_fkey"
            columns: ["repair_type_id"]
            isOneToOne: false
            referencedRelation: "repair_types"
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
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
