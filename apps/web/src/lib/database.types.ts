// Types for the POS tables (pos_*) in the shared bom-system Supabase project (emkcwukiqxnvcbhkjiqz).
// That project also holds other apps' tables, so this file keeps only the pos_ objects.
// After a POS migration, regenerate with `npm run gen:types` and keep only the pos_ entries.

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
      pos_accounts: {
        Row: {
          code: string
          company_id: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          is_postable: boolean
          name: string
          normal_balance: Database["public"]["Enums"]["pos_balance_side"]
          parent_id: string | null
          type: Database["public"]["Enums"]["pos_account_type"]
        }
        Insert: {
          code: string
          company_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          is_postable?: boolean
          name: string
          normal_balance: Database["public"]["Enums"]["pos_balance_side"]
          parent_id?: string | null
          type: Database["public"]["Enums"]["pos_account_type"]
        }
        Update: {
          code?: string
          company_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          is_postable?: boolean
          name?: string
          normal_balance?: Database["public"]["Enums"]["pos_balance_side"]
          parent_id?: string | null
          type?: Database["public"]["Enums"]["pos_account_type"]
        }
        Relationships: [
          {
            foreignKeyName: "pos_accounts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "pos_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_accounts_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "pos_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      pos_audit_log: {
        Row: {
          action: string
          at: string
          company_id: string | null
          id: number
          new_data: Json | null
          old_data: Json | null
          row_id: string | null
          table_name: string
          user_id: string | null
        }
        Insert: {
          action: string
          at?: string
          company_id?: string | null
          id?: never
          new_data?: Json | null
          old_data?: Json | null
          row_id?: string | null
          table_name: string
          user_id?: string | null
        }
        Update: {
          action?: string
          at?: string
          company_id?: string | null
          id?: never
          new_data?: Json | null
          old_data?: Json | null
          row_id?: string | null
          table_name?: string
          user_id?: string | null
        }
        Relationships: []
      }
      pos_branches: {
        Row: {
          address: string | null
          code: string
          company_id: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          name: string
          type: Database["public"]["Enums"]["pos_branch_type"]
        }
        Insert: {
          address?: string | null
          code: string
          company_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name: string
          type?: Database["public"]["Enums"]["pos_branch_type"]
        }
        Update: {
          address?: string | null
          code?: string
          company_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name?: string
          type?: Database["public"]["Enums"]["pos_branch_type"]
        }
        Relationships: [
          {
            foreignKeyName: "pos_branches_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "pos_companies"
            referencedColumns: ["id"]
          },
        ]
      }
      pos_companies: {
        Row: {
          address: string | null
          created_at: string
          created_by: string | null
          id: string
          name: string
          tin: string | null
          vat_registered: boolean
        }
        Insert: {
          address?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          tin?: string | null
          vat_registered?: boolean
        }
        Update: {
          address?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          tin?: string | null
          vat_registered?: boolean
        }
        Relationships: []
      }
      pos_doc_sequences: {
        Row: {
          branch_id: string | null
          company_id: string
          created_at: string
          doc_type: string
          id: string
          next_no: number
          prefix: string
          terminal_id: string | null
        }
        Insert: {
          branch_id?: string | null
          company_id: string
          created_at?: string
          doc_type: string
          id?: string
          next_no?: number
          prefix?: string
          terminal_id?: string | null
        }
        Update: {
          branch_id?: string | null
          company_id?: string
          created_at?: string
          doc_type?: string
          id?: string
          next_no?: number
          prefix?: string
          terminal_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pos_doc_sequences_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "pos_branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_doc_sequences_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "pos_companies"
            referencedColumns: ["id"]
          },
        ]
      }
      pos_fiscal_periods: {
        Row: {
          closed_at: string | null
          closed_by: string | null
          company_id: string
          created_at: string
          id: string
          month: number
          status: Database["public"]["Enums"]["pos_period_status"]
          year: number
        }
        Insert: {
          closed_at?: string | null
          closed_by?: string | null
          company_id: string
          created_at?: string
          id?: string
          month: number
          status?: Database["public"]["Enums"]["pos_period_status"]
          year: number
        }
        Update: {
          closed_at?: string | null
          closed_by?: string | null
          company_id?: string
          created_at?: string
          id?: string
          month?: number
          status?: Database["public"]["Enums"]["pos_period_status"]
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "pos_fiscal_periods_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "pos_companies"
            referencedColumns: ["id"]
          },
        ]
      }
      pos_journal_entries: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          entry_date: string
          entry_no: number | null
          id: string
          memo: string | null
          period_id: string | null
          posted_at: string | null
          posted_by: string | null
          reversal_of: string | null
          reversed_by: string | null
          source_doc_id: string | null
          source_doc_type: string
          status: Database["public"]["Enums"]["pos_journal_status"]
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          entry_date: string
          entry_no?: number | null
          id?: string
          memo?: string | null
          period_id?: string | null
          posted_at?: string | null
          posted_by?: string | null
          reversal_of?: string | null
          reversed_by?: string | null
          source_doc_id?: string | null
          source_doc_type?: string
          status?: Database["public"]["Enums"]["pos_journal_status"]
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          entry_date?: string
          entry_no?: number | null
          id?: string
          memo?: string | null
          period_id?: string | null
          posted_at?: string | null
          posted_by?: string | null
          reversal_of?: string | null
          reversed_by?: string | null
          source_doc_id?: string | null
          source_doc_type?: string
          status?: Database["public"]["Enums"]["pos_journal_status"]
        }
        Relationships: [
          {
            foreignKeyName: "pos_journal_entries_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "pos_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_journal_entries_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "pos_fiscal_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_journal_entries_reversal_of_fkey"
            columns: ["reversal_of"]
            isOneToOne: false
            referencedRelation: "pos_journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_journal_entries_reversed_by_fkey"
            columns: ["reversed_by"]
            isOneToOne: false
            referencedRelation: "pos_journal_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      pos_journal_lines: {
        Row: {
          account_id: string
          branch_id: string | null
          company_id: string
          credit: number
          debit: number
          entry_id: string
          id: string
          line_no: number
          memo: string | null
          partner_id: string | null
        }
        Insert: {
          account_id: string
          branch_id?: string | null
          company_id: string
          credit?: number
          debit?: number
          entry_id: string
          id?: string
          line_no?: number
          memo?: string | null
          partner_id?: string | null
        }
        Update: {
          account_id?: string
          branch_id?: string | null
          company_id?: string
          credit?: number
          debit?: number
          entry_id?: string
          id?: string
          line_no?: number
          memo?: string | null
          partner_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pos_journal_lines_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "pos_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_journal_lines_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "pos_branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_journal_lines_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "pos_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_journal_lines_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "pos_journal_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      pos_tax_codes: {
        Row: {
          code: string
          company_id: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          name: string
          rate: number
          type: Database["public"]["Enums"]["pos_tax_type"]
        }
        Insert: {
          code: string
          company_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name: string
          rate?: number
          type: Database["public"]["Enums"]["pos_tax_type"]
        }
        Update: {
          code?: string
          company_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name?: string
          rate?: number
          type?: Database["public"]["Enums"]["pos_tax_type"]
        }
        Relationships: [
          {
            foreignKeyName: "pos_tax_codes_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "pos_companies"
            referencedColumns: ["id"]
          },
        ]
      }
      pos_user_roles: {
        Row: {
          branch_ids: string[]
          company_id: string
          created_at: string
          created_by: string | null
          id: string
          role: Database["public"]["Enums"]["pos_app_role"]
          user_id: string
        }
        Insert: {
          branch_ids?: string[]
          company_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          role: Database["public"]["Enums"]["pos_app_role"]
          user_id: string
        }
        Update: {
          branch_ids?: string[]
          company_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["pos_app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pos_user_roles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "pos_companies"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      pos_bootstrap_company: {
        Args: {
          p_branch_code?: string
          p_branch_name?: string
          p_name: string
          p_tin?: string
          p_vat_registered?: boolean
        }
        Returns: string
      }
    }
    Enums: {
      pos_account_type: "asset" | "liability" | "equity" | "revenue" | "expense"
      pos_app_role:
        | "owner"
        | "admin"
        | "accountant"
        | "branch_manager"
        | "cashier"
        | "warehouse"
        | "customer"
      pos_balance_side: "debit" | "credit"
      pos_branch_type: "store" | "warehouse" | "online_hub"
      pos_journal_status: "draft" | "posted" | "reversed"
      pos_period_status: "open" | "closed"
      pos_tax_type: "vatable" | "exempt" | "zero_rated"
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

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      pos_account_type: ["asset", "liability", "equity", "revenue", "expense"],
      pos_app_role: [
        "owner",
        "admin",
        "accountant",
        "branch_manager",
        "cashier",
        "warehouse",
        "customer",
      ],
      pos_balance_side: ["debit", "credit"],
      pos_branch_type: ["store", "warehouse", "online_hub"],
      pos_journal_status: ["draft", "posted", "reversed"],
      pos_period_status: ["open", "closed"],
      pos_tax_type: ["vatable", "exempt", "zero_rated"],
    },
  },
} as const
