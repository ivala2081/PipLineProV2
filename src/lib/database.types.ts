/**
 * Supabase Database Types
 *
 * Hand-written to match the schema defined in supabase/migrations/.
 * Regenerate with the Supabase CLI if you modify the schema:
 *   npx supabase gen types typescript --linked > src/lib/database.types.ts
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type SystemRole = 'god' | 'user'
export type OrgMemberRole = 'admin' | 'operation'
export type InvitationStatus = 'pending' | 'accepted' | 'expired'
export type Currency = 'TL' | 'USD'

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          system_role: SystemRole
          display_name: string | null
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          system_role?: SystemRole
          display_name?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          system_role?: SystemRole
          display_name?: string | null
          avatar_url?: string | null
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
          is_active: boolean
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          is_active?: boolean
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
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
      psps: {
        Row: {
          id: string
          organization_id: string
          name: string
          commission_rate: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          name: string
          commission_rate?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          name?: string
          commission_rate?: number
          is_active?: boolean
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
      transfer_categories: {
        Row: {
          id: string
          organization_id: string
          name: string
          is_deposit: boolean
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          name: string
          is_deposit?: boolean
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          name?: string
          is_deposit?: boolean
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'transfer_categories_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
        ]
      }
      payment_methods: {
        Row: {
          id: string
          organization_id: string
          name: string
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          name: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          name?: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'payment_methods_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
        ]
      }
      transfer_types: {
        Row: {
          id: string
          organization_id: string
          name: string
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          name: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          name?: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'transfer_types_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
        ]
      }
      transfers: {
        Row: {
          id: string
          organization_id: string
          full_name: string
          payment_method_id: string
          transfer_date: string
          category_id: string
          amount: number
          commission: number
          net: number
          currency: Currency
          psp_id: string
          type_id: string
          crm_id: string | null
          meta_id: string | null
          created_by: string | null
          updated_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          full_name: string
          payment_method_id: string
          transfer_date?: string
          category_id: string
          amount: number
          commission: number
          net: number
          currency?: Currency
          psp_id: string
          type_id: string
          crm_id?: string | null
          meta_id?: string | null
          created_by?: string | null
          updated_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          full_name?: string
          payment_method_id?: string
          transfer_date?: string
          category_id?: string
          amount?: number
          commission?: number
          net?: number
          currency?: Currency
          psp_id?: string
          type_id?: string
          crm_id?: string | null
          meta_id?: string | null
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
            foreignKeyName: 'transfers_payment_method_id_fkey'
            columns: ['payment_method_id']
            isOneToOne: false
            referencedRelation: 'payment_methods'
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
            foreignKeyName: 'transfers_psp_id_fkey'
            columns: ['psp_id']
            isOneToOne: false
            referencedRelation: 'psps'
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
