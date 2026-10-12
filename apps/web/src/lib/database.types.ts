// Types for the POS objects (pos_*) in the shared bom-system Supabase project (emkcwukiqxnvcbhkjiqz).
// That project also holds other apps' tables, so only the pos_ entries are kept.
// Regenerate after a POS migration (Supabase MCP generate_typescript_types or
// `supabase gen types typescript --project-id emkcwukiqxnvcbhkjiqz`) and filter to pos_ entries.

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
    PostgrestVersion: "14.5"
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
      pos_categories: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          name: string
          parent_id: string | null
          sort_order: number
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name: string
          parent_id?: string | null
          sort_order?: number
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name?: string
          parent_id?: string | null
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "pos_categories_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "pos_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "pos_categories"
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
      pos_lots: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          expiry_date: string | null
          id: string
          lot_no: string
          product_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          expiry_date?: string | null
          id?: string
          lot_no: string
          product_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          expiry_date?: string | null
          id?: string
          lot_no?: string
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pos_lots_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "pos_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_lots_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "pos_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_lots_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "pos_stock_summary"
            referencedColumns: ["product_id"]
          },
        ]
      }
      pos_prices: {
        Row: {
          branch_id: string | null
          channel: Database["public"]["Enums"]["pos_channel"]
          company_id: string
          created_at: string
          created_by: string | null
          id: string
          price: number
          valid_from: string
          variant_id: string
        }
        Insert: {
          branch_id?: string | null
          channel: Database["public"]["Enums"]["pos_channel"]
          company_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          price: number
          valid_from?: string
          variant_id: string
        }
        Update: {
          branch_id?: string | null
          channel?: Database["public"]["Enums"]["pos_channel"]
          company_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          price?: number
          valid_from?: string
          variant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pos_prices_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "pos_branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_prices_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "pos_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_prices_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "pos_product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      pos_product_costs: {
        Row: {
          avg_cost: number
          company_id: string
          product_id: string
          updated_at: string
        }
        Insert: {
          avg_cost?: number
          company_id: string
          product_id: string
          updated_at?: string
        }
        Update: {
          avg_cost?: number
          company_id?: string
          product_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pos_product_costs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "pos_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_product_costs_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: true
            referencedRelation: "pos_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_product_costs_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: true
            referencedRelation: "pos_stock_summary"
            referencedColumns: ["product_id"]
          },
        ]
      }
      pos_product_variants: {
        Row: {
          barcode: string | null
          company_id: string
          conversion_to_base: number
          created_at: string
          id: string
          is_active: boolean
          is_default: boolean
          name: string
          plu: string | null
          product_id: string
          sort_order: number
          uom: string
          updated_at: string
        }
        Insert: {
          barcode?: string | null
          company_id: string
          conversion_to_base?: number
          created_at?: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          name: string
          plu?: string | null
          product_id: string
          sort_order?: number
          uom?: string
          updated_at?: string
        }
        Update: {
          barcode?: string | null
          company_id?: string
          conversion_to_base?: number
          created_at?: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          name?: string
          plu?: string | null
          product_id?: string
          sort_order?: number
          uom?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pos_product_variants_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "pos_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "pos_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "pos_stock_summary"
            referencedColumns: ["product_id"]
          },
        ]
      }
      pos_products: {
        Row: {
          base_uom: string
          category_id: string | null
          company_id: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          reorder_point: number | null
          sku: string
          sold_by: Database["public"]["Enums"]["pos_sold_by"]
          tax_code_id: string | null
          track_lots: boolean
          track_stock: boolean
          updated_at: string
        }
        Insert: {
          base_uom?: string
          category_id?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          reorder_point?: number | null
          sku: string
          sold_by?: Database["public"]["Enums"]["pos_sold_by"]
          tax_code_id?: string | null
          track_lots?: boolean
          track_stock?: boolean
          updated_at?: string
        }
        Update: {
          base_uom?: string
          category_id?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          reorder_point?: number | null
          sku?: string
          sold_by?: Database["public"]["Enums"]["pos_sold_by"]
          tax_code_id?: string | null
          track_lots?: boolean
          track_stock?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pos_products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "pos_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_products_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "pos_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_products_tax_code_id_fkey"
            columns: ["tax_code_id"]
            isOneToOne: false
            referencedRelation: "pos_tax_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      pos_stock_balances: {
        Row: {
          company_id: string
          id: string
          location_id: string
          lot_id: string | null
          product_id: string
          qty: number
          updated_at: string
        }
        Insert: {
          company_id: string
          id?: string
          location_id: string
          lot_id?: string | null
          product_id: string
          qty?: number
          updated_at?: string
        }
        Update: {
          company_id?: string
          id?: string
          location_id?: string
          lot_id?: string | null
          product_id?: string
          qty?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pos_stock_balances_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "pos_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_stock_balances_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "pos_stock_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_stock_balances_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "pos_lots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_stock_balances_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "pos_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_stock_balances_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "pos_stock_summary"
            referencedColumns: ["product_id"]
          },
        ]
      }
      pos_stock_doc_lines: {
        Row: {
          company_id: string
          doc_id: string
          expiry_date: string | null
          id: string
          line_no: number
          lot_id: string | null
          lot_no: string | null
          note: string | null
          product_id: string
          qty: number
          reason: Database["public"]["Enums"]["pos_adjust_reason"] | null
          received_qty: number | null
          superseded: boolean
          unit_cost: number | null
        }
        Insert: {
          company_id: string
          doc_id: string
          expiry_date?: string | null
          id?: string
          line_no?: number
          lot_id?: string | null
          lot_no?: string | null
          note?: string | null
          product_id: string
          qty: number
          reason?: Database["public"]["Enums"]["pos_adjust_reason"] | null
          received_qty?: number | null
          superseded?: boolean
          unit_cost?: number | null
        }
        Update: {
          company_id?: string
          doc_id?: string
          expiry_date?: string | null
          id?: string
          line_no?: number
          lot_id?: string | null
          lot_no?: string | null
          note?: string | null
          product_id?: string
          qty?: number
          reason?: Database["public"]["Enums"]["pos_adjust_reason"] | null
          received_qty?: number | null
          superseded?: boolean
          unit_cost?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "pos_stock_doc_lines_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "pos_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_stock_doc_lines_doc_id_fkey"
            columns: ["doc_id"]
            isOneToOne: false
            referencedRelation: "pos_stock_docs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_stock_doc_lines_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "pos_lots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_stock_doc_lines_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "pos_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_stock_doc_lines_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "pos_stock_summary"
            referencedColumns: ["product_id"]
          },
        ]
      }
      pos_stock_docs: {
        Row: {
          branch_id: string
          cancelled_at: string | null
          cancelled_by: string | null
          company_id: string
          created_at: string
          created_by: string | null
          doc_date: string
          doc_no: string | null
          doc_type: Database["public"]["Enums"]["pos_stock_doc_type"]
          id: string
          journal_entry_id: string | null
          location_id: string
          note: string | null
          posted_at: string | null
          posted_by: string | null
          received_at: string | null
          received_by: string | null
          reference: string | null
          status: Database["public"]["Enums"]["pos_stock_doc_status"]
          supplier_name: string | null
          to_branch_id: string | null
          to_location_id: string | null
          updated_at: string
        }
        Insert: {
          branch_id: string
          cancelled_at?: string | null
          cancelled_by?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          doc_date?: string
          doc_no?: string | null
          doc_type: Database["public"]["Enums"]["pos_stock_doc_type"]
          id?: string
          journal_entry_id?: string | null
          location_id: string
          note?: string | null
          posted_at?: string | null
          posted_by?: string | null
          received_at?: string | null
          received_by?: string | null
          reference?: string | null
          status?: Database["public"]["Enums"]["pos_stock_doc_status"]
          supplier_name?: string | null
          to_branch_id?: string | null
          to_location_id?: string | null
          updated_at?: string
        }
        Update: {
          branch_id?: string
          cancelled_at?: string | null
          cancelled_by?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          doc_date?: string
          doc_no?: string | null
          doc_type?: Database["public"]["Enums"]["pos_stock_doc_type"]
          id?: string
          journal_entry_id?: string | null
          location_id?: string
          note?: string | null
          posted_at?: string | null
          posted_by?: string | null
          received_at?: string | null
          received_by?: string | null
          reference?: string | null
          status?: Database["public"]["Enums"]["pos_stock_doc_status"]
          supplier_name?: string | null
          to_branch_id?: string | null
          to_location_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pos_stock_docs_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "pos_branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_stock_docs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "pos_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_stock_docs_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "pos_journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_stock_docs_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "pos_stock_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_stock_docs_to_branch_id_fkey"
            columns: ["to_branch_id"]
            isOneToOne: false
            referencedRelation: "pos_branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_stock_docs_to_location_id_fkey"
            columns: ["to_location_id"]
            isOneToOne: false
            referencedRelation: "pos_stock_locations"
            referencedColumns: ["id"]
          },
        ]
      }
      pos_stock_locations: {
        Row: {
          branch_id: string | null
          company_id: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          is_default: boolean
          name: string
          type: Database["public"]["Enums"]["pos_location_type"]
        }
        Insert: {
          branch_id?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          name: string
          type?: Database["public"]["Enums"]["pos_location_type"]
        }
        Update: {
          branch_id?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          name?: string
          type?: Database["public"]["Enums"]["pos_location_type"]
        }
        Relationships: [
          {
            foreignKeyName: "pos_stock_locations_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "pos_branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_stock_locations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "pos_companies"
            referencedColumns: ["id"]
          },
        ]
      }
      pos_stock_moves: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          doc_id: string | null
          doc_line_id: string | null
          doc_type: string
          id: string
          location_id: string
          lot_id: string | null
          move_type: Database["public"]["Enums"]["pos_move_type"]
          product_id: string
          qty: number
          unit_cost: number
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          doc_id?: string | null
          doc_line_id?: string | null
          doc_type: string
          id?: string
          location_id: string
          lot_id?: string | null
          move_type: Database["public"]["Enums"]["pos_move_type"]
          product_id: string
          qty: number
          unit_cost?: number
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          doc_id?: string | null
          doc_line_id?: string | null
          doc_type?: string
          id?: string
          location_id?: string
          lot_id?: string | null
          move_type?: Database["public"]["Enums"]["pos_move_type"]
          product_id?: string
          qty?: number
          unit_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "pos_stock_moves_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "pos_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_stock_moves_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "pos_stock_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_stock_moves_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "pos_lots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_stock_moves_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "pos_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_stock_moves_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "pos_stock_summary"
            referencedColumns: ["product_id"]
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
      pos_current_prices: {
        Row: {
          channel: Database["public"]["Enums"]["pos_channel"] | null
          price: number | null
          valid_from: string | null
          variant_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pos_prices_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "pos_product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      pos_stock_summary: {
        Row: {
          avg_cost: number | null
          base_uom: string | null
          category_id: string | null
          company_id: string | null
          is_active: boolean | null
          name: string | null
          product_id: string | null
          qty_in_transit: number | null
          qty_on_hand: number | null
          reorder_point: number | null
          sku: string | null
          track_lots: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "pos_products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "pos_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_products_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "pos_companies"
            referencedColumns: ["id"]
          },
        ]
      }
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
      pos_cancel_stock_doc: { Args: { p_doc: string }; Returns: undefined }
      pos_post_stock_doc: { Args: { p_doc: string }; Returns: string }
      pos_receive_transfer: {
        Args: { p_doc: string; p_received?: Json }
        Returns: undefined
      }
      pos_save_product: { Args: { p: Json }; Returns: string }
      pos_save_stock_doc: { Args: { p: Json }; Returns: string }
    }
    Enums: {
      pos_account_type: "asset" | "liability" | "equity" | "revenue" | "expense"
      pos_adjust_reason:
        | "spoilage"
        | "damage"
        | "expired"
        | "shrinkage"
        | "count_variance"
        | "found"
        | "other"
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
      pos_channel: "pos" | "online"
      pos_journal_status: "draft" | "posted" | "reversed"
      pos_location_type: "storage" | "transit"
      pos_move_type:
        | "opening"
        | "receipt"
        | "adjustment"
        | "transfer_out"
        | "transfer_in"
        | "sale"
        | "sale_return"
      pos_period_status: "open" | "closed"
      pos_sold_by: "piece" | "weight"
      pos_stock_doc_status:
        | "draft"
        | "posted"
        | "in_transit"
        | "received"
        | "cancelled"
      pos_stock_doc_type: "opening" | "receipt" | "adjustment" | "transfer"
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
      pos_adjust_reason: [
        "spoilage",
        "damage",
        "expired",
        "shrinkage",
        "count_variance",
        "found",
        "other",
      ],
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
      pos_channel: ["pos", "online"],
      pos_journal_status: ["draft", "posted", "reversed"],
      pos_location_type: ["storage", "transit"],
      pos_move_type: [
        "opening",
        "receipt",
        "adjustment",
        "transfer_out",
        "transfer_in",
        "sale",
        "sale_return",
      ],
      pos_period_status: ["open", "closed"],
      pos_sold_by: ["piece", "weight"],
      pos_stock_doc_status: [
        "draft",
        "posted",
        "in_transit",
        "received",
        "cancelled",
      ],
      pos_stock_doc_type: ["opening", "receipt", "adjustment", "transfer"],
      pos_tax_type: ["vatable", "exempt", "zero_rated"],
    },
  },
} as const
