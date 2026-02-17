/**
 * Supabase Database Types
 *
 * Hand-written to match the schema defined in supabase/migrations/.
 * Regenerate with the Supabase CLI if you modify the schema:
 *   npx supabase gen types typescript --linked > src/lib/database.types.ts
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type SystemRole = 'god' | 'user'
export type OrgMemberRole = 'admin' | 'manager' | 'operation'
export type InvitationStatus = 'pending' | 'accepted' | 'expired'
export type Currency = 'TL' | 'USD'

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          system_role: SystemRole
          email: string | null
          display_name: string | null
          avatar_url: string | null
          phone: string | null
          bio: string | null
          department: string | null
          notes: string | null
          last_seen_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          system_role?: SystemRole
          email?: string | null
          display_name?: string | null
          avatar_url?: string | null
          phone?: string | null
          bio?: string | null
          department?: string | null
          notes?: string | null
          last_seen_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          system_role?: SystemRole
          email?: string | null
          display_name?: string | null
          avatar_url?: string | null
          phone?: string | null
          bio?: string | null
          department?: string | null
          notes?: string | null
          last_seen_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'profiles_id_fkey'
            columns: ['id']
            isOneToOne: true
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }
      organizations: {
        Row: {
          id: string
          name: string
          slug: string
          logo_url: string | null
          is_active: boolean
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          logo_url?: string | null
          is_active?: boolean
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          logo_url?: string | null
          is_active?: boolean
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'organizations_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      organization_members: {
        Row: {
          organization_id: string
          user_id: string
          role: OrgMemberRole
          invited_by: string | null
          created_at: string
        }
        Insert: {
          organization_id: string
          user_id: string
          role?: OrgMemberRole
          invited_by?: string | null
          created_at?: string
        }
        Update: {
          organization_id?: string
          user_id?: string
          role?: OrgMemberRole
          invited_by?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'organization_members_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'organization_members_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'organization_members_invited_by_fkey'
            columns: ['invited_by']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }
      organization_invitations: {
        Row: {
          id: string
          organization_id: string
          email: string
          role: OrgMemberRole
          invited_by: string | null
          status: InvitationStatus
          created_at: string
          expires_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          email: string
          role?: OrgMemberRole
          invited_by?: string | null
          status?: InvitationStatus
          created_at?: string
          expires_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          email?: string
          role?: OrgMemberRole
          invited_by?: string | null
          status?: InvitationStatus
          created_at?: string
          expires_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'organization_invitations_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'organization_invitations_invited_by_fkey'
            columns: ['invited_by']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }
      /* ──────────── Global Lookup Tables (TEXT PK, no org_id) ──────────── */
      transfer_categories: {
        Row: {
          id: string
          name: string
          is_deposit: boolean
          aliases: string[]
          created_at: string
        }
        Insert: {
          id: string
          name: string
          is_deposit?: boolean
          aliases?: string[]
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          is_deposit?: boolean
          aliases?: string[]
          created_at?: string
        }
        Relationships: []
      }
      payment_methods: {
        Row: {
          id: string
          name: string
          aliases: string[]
          created_at: string
        }
        Insert: {
          id: string
          name: string
          aliases?: string[]
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          aliases?: string[]
          created_at?: string
        }
        Relationships: []
      }
      transfer_types: {
        Row: {
          id: string
          name: string
          aliases: string[]
          created_at: string
        }
        Insert: {
          id: string
          name: string
          aliases?: string[]
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          aliases?: string[]
          created_at?: string
        }
        Relationships: []
      }
      /* ──────────── PSPs (org-specific, UUID PK) ──────────── */
      psps: {
        Row: {
          id: string
          organization_id: string
          name: string
          commission_rate: number
          is_active: boolean
          is_internal: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          name: string
          commission_rate?: number
          is_active?: boolean
          is_internal?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          name?: string
          commission_rate?: number
          is_active?: boolean
          is_internal?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'psps_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
        ]
      }
      psp_commission_rates: {
        Row: {
          id: string
          psp_id: string
          organization_id: string
          commission_rate: number
          effective_from: string
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          psp_id: string
          organization_id: string
          commission_rate: number
          effective_from: string
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          psp_id?: string
          organization_id?: string
          commission_rate?: number
          effective_from?: string
          created_by?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'psp_commission_rates_psp_id_fkey'
            columns: ['psp_id']
            isOneToOne: false
            referencedRelation: 'psps'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'psp_commission_rates_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'psp_commission_rates_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }
      psp_settlements: {
        Row: {
          id: string
          psp_id: string
          organization_id: string
          settlement_date: string
          amount: number
          currency: string
          notes: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          psp_id: string
          organization_id: string
          settlement_date: string
          amount: number
          currency: string
          notes?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          psp_id?: string
          organization_id?: string
          settlement_date?: string
          amount?: number
          currency?: string
          notes?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'psp_settlements_psp_id_fkey'
            columns: ['psp_id']
            isOneToOne: false
            referencedRelation: 'psps'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'psp_settlements_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'psp_settlements_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }
      /* ──────────── Transfers ──────────── */
      transfers: {
        Row: {
          id: string
          organization_id: string
          full_name: string
          transfer_date: string
          amount: number
          commission: number
          net: number
          currency: Currency
          category_id: string
          payment_method_id: string
          type_id: string
          psp_id: string | null
          crm_id: string | null
          meta_id: string | null
          exchange_rate: number
          amount_try: number
          amount_usd: number
          commission_rate_snapshot: number | null
          created_by: string | null
          updated_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          full_name: string
          transfer_date?: string
          amount: number
          commission?: number
          net?: number
          currency?: Currency
          category_id: string
          payment_method_id: string
          type_id: string
          psp_id?: string | null
          crm_id?: string | null
          meta_id?: string | null
          exchange_rate?: number
          amount_try?: number
          amount_usd?: number
          commission_rate_snapshot?: number | null
          created_by?: string | null
          updated_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          full_name?: string
          transfer_date?: string
          amount?: number
          commission?: number
          net?: number
          currency?: Currency
          category_id?: string
          payment_method_id?: string
          type_id?: string
          psp_id?: string | null
          crm_id?: string | null
          meta_id?: string | null
          exchange_rate?: number
          amount_try?: number
          amount_usd?: number
          commission_rate_snapshot?: number | null
          created_by?: string | null
          updated_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'transfers_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'transfers_category_id_fkey'
            columns: ['category_id']
            isOneToOne: false
            referencedRelation: 'transfer_categories'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'transfers_payment_method_id_fkey'
            columns: ['payment_method_id']
            isOneToOne: false
            referencedRelation: 'payment_methods'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'transfers_type_id_fkey'
            columns: ['type_id']
            isOneToOne: false
            referencedRelation: 'transfer_types'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'transfers_psp_id_fkey'
            columns: ['psp_id']
            isOneToOne: false
            referencedRelation: 'psps'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'transfers_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }
      transfer_audit_log: {
        Row: {
          id: string
          transfer_id: string
          organization_id: string
          action: 'created' | 'updated'
          performed_by: string | null
          changes: Record<string, { old: unknown; new: unknown }> | null
          created_at: string
        }
        Insert: {
          id?: string
          transfer_id: string
          organization_id: string
          action: 'created' | 'updated'
          performed_by?: string | null
          changes?: Record<string, { old: unknown; new: unknown }> | null
          created_at?: string
        }
        Update: {
          id?: string
          transfer_id?: string
          organization_id?: string
          action?: 'created' | 'updated'
          performed_by?: string | null
          changes?: Record<string, { old: unknown; new: unknown }> | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'transfer_audit_log_transfer_id_fkey'
            columns: ['transfer_id']
            isOneToOne: false
            referencedRelation: 'transfers'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'transfer_audit_log_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'transfer_audit_log_performed_by_fkey'
            columns: ['performed_by']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }
      /* ──────────── Exchange Rates ──────────── */
      exchange_rates: {
        Row: {
          id: string
          organization_id: string
          currency: string
          rate_to_tl: number
          rate_date: string
          source: string
          created_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          currency?: string
          rate_to_tl: number
          rate_date?: string
          source?: string
          created_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          currency?: string
          rate_to_tl?: number
          rate_date?: string
          source?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'exchange_rates_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
        ]
      }
      /* ──────────── Accounting ──────────── */
      accounting_entries: {
        Row: {
          id: string
          organization_id: string
          description: string
          entry_type: 'ODEME' | 'TRANSFER'
          direction: 'in' | 'out'
          amount: number
          currency: string
          cost_period: string | null
          entry_date: string
          payment_period: string | null
          register: string
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          description: string
          entry_type: 'ODEME' | 'TRANSFER'
          direction: 'in' | 'out'
          amount: number
          currency: string
          cost_period?: string | null
          entry_date?: string
          payment_period?: string | null
          register: string
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          description?: string
          entry_type?: 'ODEME' | 'TRANSFER'
          direction?: 'in' | 'out'
          amount?: number
          currency?: string
          cost_period?: string | null
          entry_date?: string
          payment_period?: string | null
          register?: string
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'accounting_entries_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'accounting_entries_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }
      wallets: {
        Row: {
          id: string
          organization_id: string
          label: string
          address: string
          chain: 'tron' | 'ethereum' | 'bsc' | 'bitcoin' | 'solana'
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          label: string
          address: string
          chain: 'tron' | 'ethereum' | 'bsc' | 'bitcoin' | 'solana'
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          label?: string
          address?: string
          chain?: 'tron' | 'ethereum' | 'bsc' | 'bitcoin' | 'solana'
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'wallets_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
        ]
      }
      wallet_snapshots: {
        Row: {
          id: string
          wallet_id: string
          organization_id: string
          snapshot_date: string
          balances: { token: string; balance: string; tokenAddress?: string }[]
          total_usd: number
          created_at: string
        }
        Insert: {
          id?: string
          wallet_id: string
          organization_id: string
          snapshot_date: string
          balances: { token: string; balance: string; tokenAddress?: string }[]
          total_usd?: number
          created_at?: string
        }
        Update: {
          id?: string
          wallet_id?: string
          organization_id?: string
          snapshot_date?: string
          balances?: { token: string; balance: string; tokenAddress?: string }[]
          total_usd?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'wallet_snapshots_wallet_id_fkey'
            columns: ['wallet_id']
            isOneToOne: false
            referencedRelation: 'wallets'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'wallet_snapshots_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
        ]
      }
      accounting_monthly_config: {
        Row: {
          id: string
          organization_id: string
          year: number
          month: number
          devir_usdt: number | null
          devir_nakit_tl: number | null
          devir_nakit_usd: number | null
          kur: number | null
          bekl_tahs: number | null
          teyit_entries: Json
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          year: number
          month: number
          devir_usdt?: number | null
          devir_nakit_tl?: number | null
          devir_nakit_usd?: number | null
          kur?: number | null
          bekl_tahs?: number | null
          teyit_entries?: Json
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          year?: number
          month?: number
          devir_usdt?: number | null
          devir_nakit_tl?: number | null
          devir_nakit_usd?: number | null
          kur?: number | null
          bekl_tahs?: number | null
          teyit_entries?: Json
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'accounting_monthly_config_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'accounting_monthly_config_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }
      /* ──────────── Security Tables ──────────── */
      trusted_devices: {
        Row: {
          id: string
          user_id: string
          device_id: string
          label: string | null
          last_used_at: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          device_id: string
          label?: string | null
          last_used_at?: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          device_id?: string
          label?: string | null
          last_used_at?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'trusted_devices_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }
      login_attempts: {
        Row: {
          id: string
          user_id: string | null
          device_id: string
          ip_address: string | null
          success: boolean
          error_message: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          device_id: string
          ip_address?: string | null
          success: boolean
          error_message?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          device_id?: string
          ip_address?: string | null
          success?: boolean
          error_message?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'login_attempts_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }
      captcha_challenges: {
        Row: {
          id: string
          user_id: string | null
          device_id: string
          challenge_id: string
          solved: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          device_id: string
          challenge_id: string
          solved?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          device_id?: string
          challenge_id?: string
          solved?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'captcha_challenges_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: {
      [key: string]: {
        Row: Record<string, unknown>
        Relationships: unknown[]
      }
    }
    Functions: {
      add_organization_member: {
        Args: {
          _org_id: string
          _email: string
          _password: string
          _role?: string
          _display_name?: string | null
        }
        Returns: { user_id: string; created: boolean }
      }
      get_psp_summary: {
        Args: { _org_id: string }
        Returns: {
          psp_id: string
          psp_name: string
          commission_rate: number
          is_active: boolean
          is_internal: boolean
          total_deposits: number
          total_withdrawals: number
          total_commission: number
          total_net: number
          total_settlements: number
          last_settlement_date: string | null
        }[]
      }
      get_monthly_summary: {
        Args: { _org_id: string; _year: number; _month: number }
        Returns: Json
      }
      [key: string]: {
        Args: Record<string, unknown>
        Returns: unknown
      }
    }
    Enums: {
      [key: string]: string
    }
    CompositeTypes: {
      [key: string]: unknown
    }
  }
}

/** Convenience type aliases */
export type Profile = Database['public']['Tables']['profiles']['Row']
export type Organization = Database['public']['Tables']['organizations']['Row']
export type OrganizationMember = Database['public']['Tables']['organization_members']['Row']
export type OrganizationInvitation = Database['public']['Tables']['organization_invitations']['Row']
export type Psp = Database['public']['Tables']['psps']['Row']
export type TransferCategory = Database['public']['Tables']['transfer_categories']['Row']
export type PaymentMethod = Database['public']['Tables']['payment_methods']['Row']
export type TransferType = Database['public']['Tables']['transfer_types']['Row']
export type Transfer = Database['public']['Tables']['transfers']['Row']
export type TransferAuditLog = Database['public']['Tables']['transfer_audit_log']['Row']
export type ExchangeRate = Database['public']['Tables']['exchange_rates']['Row']
export type AccountingEntry = Database['public']['Tables']['accounting_entries']['Row']
export type Wallet = Database['public']['Tables']['wallets']['Row']
export type WalletSnapshot = Database['public']['Tables']['wallet_snapshots']['Row']
export type AccountingMonthlyConfig =
  Database['public']['Tables']['accounting_monthly_config']['Row']
export type PspCommissionRate = Database['public']['Tables']['psp_commission_rates']['Row']
export type PspSettlement = Database['public']['Tables']['psp_settlements']['Row']
export type TrustedDevice = Database['public']['Tables']['trusted_devices']['Row']
export type LoginAttempt = Database['public']['Tables']['login_attempts']['Row']
export type CaptchaChallenge = Database['public']['Tables']['captcha_challenges']['Row']
