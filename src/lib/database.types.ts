export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '14.1'
  }
  public: {
    Tables: {
      accounting_entries: {
        Row: {
          advance_type: string | null
          amount: number
          category_id: string | null
          cost_period: string | null
          created_at: string
          created_by: string | null
          currency: string
          description: string
          direction: string
          entry_date: string
          entry_type: string
          exchange_rate_override: boolean
          exchange_rate_used: number | null
          hr_employee_id: string | null
          hr_payment_id: string | null
          hr_payment_type: string | null
          id: string
          linked_entry_id: string | null
          organization_id: string
          payee: string | null
          payment_period: string | null
          register: string
          register_id: string | null
          hr_bulk_payment_id: string | null
          ib_payment_id: string | null
          source_type: string | null
          source_id: string | null
          updated_at: string
        }
        Insert: {
          advance_type?: string | null
          amount: number
          category_id?: string | null
          cost_period?: string | null
          created_at?: string
          created_by?: string | null
          currency: string
          description: string
          direction: string
          entry_date?: string
          entry_type: string
          exchange_rate_override?: boolean
          exchange_rate_used?: number | null
          hr_bulk_payment_id?: string | null
          hr_employee_id?: string | null
          hr_payment_id?: string | null
          hr_payment_type?: string | null
          ib_payment_id?: string | null
          id?: string
          linked_entry_id?: string | null
          organization_id: string
          payee?: string | null
          payment_period?: string | null
          register: string
          register_id?: string | null
          source_type?: string | null
          source_id?: string | null
          updated_at?: string
        }
        Update: {
          advance_type?: string | null
          amount?: number
          category_id?: string | null
          cost_period?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          description?: string
          direction?: string
          entry_date?: string
          entry_type?: string
          exchange_rate_override?: boolean
          exchange_rate_used?: number | null
          hr_bulk_payment_id?: string | null
          hr_employee_id?: string | null
          hr_payment_id?: string | null
          hr_payment_type?: string | null
          ib_payment_id?: string | null
          id?: string
          linked_entry_id?: string | null
          organization_id?: string
          payee?: string | null
          payment_period?: string | null
          register?: string
          register_id?: string | null
          source_type?: string | null
          source_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'accounting_entries_hr_bulk_payment_id_fkey'
            columns: ['hr_bulk_payment_id']
            isOneToOne: false
            referencedRelation: 'hr_bulk_payments'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'accounting_entries_hr_employee_id_fkey'
            columns: ['hr_employee_id']
            isOneToOne: false
            referencedRelation: 'hr_employees'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'accounting_entries_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
        ]
      }
      accounting_monthly_config: {
        Row: {
          bekl_tahs: number | null
          created_at: string
          created_by: string | null
          devir_nakit_tl: number | null
          devir_nakit_usd: number | null
          devir_usdt: number | null
          id: string
          kur: number | null
          month: number
          organization_id: string
          teyit_entries: Json
          updated_at: string
          year: number
        }
        Insert: {
          bekl_tahs?: number | null
          created_at?: string
          created_by?: string | null
          devir_nakit_tl?: number | null
          devir_nakit_usd?: number | null
          devir_usdt?: number | null
          id?: string
          kur?: number | null
          month: number
          organization_id: string
          teyit_entries?: Json
          updated_at?: string
          year: number
        }
        Update: {
          bekl_tahs?: number | null
          created_at?: string
          created_by?: string | null
          devir_nakit_tl?: number | null
          devir_nakit_usd?: number | null
          devir_usdt?: number | null
          id?: string
          kur?: number | null
          month?: number
          organization_id?: string
          teyit_entries?: Json
          updated_at?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: 'accounting_monthly_config_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
        ]
      }
      accounting_registers: {
        Row: {
          id: string
          organization_id: string
          name: string
          label: string
          currency: string
          is_system: boolean
          is_active: boolean
          sort_order: number
          created_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          name: string
          label: string
          currency?: string
          is_system?: boolean
          is_active?: boolean
          sort_order?: number
          created_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          name?: string
          label?: string
          currency?: string
          is_system?: boolean
          is_active?: boolean
          sort_order?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'accounting_registers_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
        ]
      }
      accounting_categories: {
        Row: {
          id: string
          organization_id: string | null
          name: string
          label: string
          icon: string | null
          is_system: boolean
          sort_order: number
        }
        Insert: {
          id?: string
          organization_id?: string | null
          name: string
          label: string
          icon?: string | null
          is_system?: boolean
          sort_order?: number
        }
        Update: {
          id?: string
          organization_id?: string | null
          name?: string
          label?: string
          icon?: string | null
          is_system?: boolean
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: 'accounting_categories_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
        ]
      }
      accounting_register_snapshots: {
        Row: {
          id: string
          organization_id: string
          register_id: string
          snapshot_date: string
          opening_balance: number
          total_in: number
          total_out: number
          closing_balance: number
          usd_equivalent: number | null
          created_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          register_id: string
          snapshot_date: string
          opening_balance?: number
          total_in?: number
          total_out?: number
          closing_balance?: number
          usd_equivalent?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          register_id?: string
          snapshot_date?: string
          opening_balance?: number
          total_in?: number
          total_out?: number
          closing_balance?: number
          usd_equivalent?: number | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'accounting_register_snapshots_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'accounting_register_snapshots_register_id_fkey'
            columns: ['register_id']
            isOneToOne: false
            referencedRelation: 'accounting_registers'
            referencedColumns: ['id']
          },
        ]
      }
      blog_posts: {
        Row: {
          author: string | null
          canonical_url: string | null
          content: string | null
          cover_image: string | null
          created_at: string
          excerpt: string | null
          focus_keyword: string | null
          id: string
          is_published: boolean
          keywords: string | null
          meta_description: string | null
          meta_title: string | null
          og_image: string | null
          published_at: string | null
          slug: string
          title: string
          updated_at: string
        }
        Insert: {
          author?: string | null
          canonical_url?: string | null
          content?: string | null
          cover_image?: string | null
          created_at?: string
          excerpt?: string | null
          focus_keyword?: string | null
          id?: string
          is_published?: boolean
          keywords?: string | null
          meta_description?: string | null
          meta_title?: string | null
          og_image?: string | null
          published_at?: string | null
          slug: string
          title: string
          updated_at?: string
        }
        Update: {
          author?: string | null
          canonical_url?: string | null
          content?: string | null
          cover_image?: string | null
          created_at?: string
          excerpt?: string | null
          focus_keyword?: string | null
          id?: string
          is_published?: boolean
          keywords?: string | null
          meta_description?: string | null
          meta_title?: string | null
          og_image?: string | null
          published_at?: string | null
          slug?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      bloke_resolutions: {
        Row: {
          created_at: string
          id: string
          organization_id: string
          resolution_date: string | null
          resolution_notes: string | null
          resolved_by: string | null
          status: string
          transfer_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id: string
          resolution_date?: string | null
          resolution_notes?: string | null
          resolved_by?: string | null
          status?: string
          transfer_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string
          resolution_date?: string | null
          resolution_notes?: string | null
          resolved_by?: string | null
          status?: string
          transfer_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'bloke_resolutions_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'bloke_resolutions_transfer_id_fkey'
            columns: ['transfer_id']
            isOneToOne: true
            referencedRelation: 'transfers'
            referencedColumns: ['id']
          },
        ]
      }
      captcha_challenges: {
        Row: {
          challenge_id: string
          created_at: string
          device_id: string
          id: string
          solved: boolean
          user_id: string | null
        }
        Insert: {
          challenge_id: string
          created_at?: string
          device_id: string
          id?: string
          solved?: boolean
          user_id?: string | null
        }
        Update: {
          challenge_id?: string
          created_at?: string
          device_id?: string
          id?: string
          solved?: boolean
          user_id?: string | null
        }
        Relationships: []
      }
      exchange_rates: {
        Row: {
          created_at: string
          currency: string
          id: string
          organization_id: string
          rate_date: string
          rate_to_base: number
          source: string
        }
        Insert: {
          created_at?: string
          currency?: string
          id?: string
          organization_id: string
          rate_date?: string
          rate_to_base: number
          source?: string
        }
        Update: {
          created_at?: string
          currency?: string
          id?: string
          organization_id?: string
          rate_date?: string
          rate_to_base?: number
          source?: string
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
      god_audit_log: {
        Row: {
          action: string
          created_at: string
          god_email: string
          god_user_id: string | null
          id: string
          ip_address: unknown
          new_values: Json | null
          old_values: Json | null
          record_id: string | null
          table_name: string
          user_agent: string | null
        }
        Insert: {
          action: string
          created_at?: string
          god_email: string
          god_user_id?: string | null
          id?: string
          ip_address?: unknown
          new_values?: Json | null
          old_values?: Json | null
          record_id?: string | null
          table_name: string
          user_agent?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          god_email?: string
          god_user_id?: string | null
          id?: string
          ip_address?: unknown
          new_values?: Json | null
          old_values?: Json | null
          record_id?: string | null
          table_name?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'god_audit_log_god_user_id_fkey'
            columns: ['god_user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      hr_attendance: {
        Row: {
          absent_hours: number | null
          check_in: string | null
          check_out: string | null
          created_at: string
          date: string
          deduction_exempt: boolean
          employee_id: string
          id: string
          leave_id: string | null
          notes: string | null
          organization_id: string
          recorded_by: string | null
          status: string
        }
        Insert: {
          absent_hours?: number | null
          check_in?: string | null
          check_out?: string | null
          created_at?: string
          date: string
          deduction_exempt?: boolean
          employee_id: string
          id?: string
          leave_id?: string | null
          notes?: string | null
          organization_id: string
          recorded_by?: string | null
          status?: string
        }
        Update: {
          absent_hours?: number | null
          check_in?: string | null
          check_out?: string | null
          created_at?: string
          date?: string
          deduction_exempt?: boolean
          employee_id?: string
          id?: string
          leave_id?: string | null
          notes?: string | null
          organization_id?: string
          recorded_by?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: 'hr_attendance_employee_id_fkey'
            columns: ['employee_id']
            isOneToOne: false
            referencedRelation: 'hr_employees'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'hr_attendance_leave_id_fkey'
            columns: ['leave_id']
            isOneToOne: false
            referencedRelation: 'hr_leaves'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'hr_attendance_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'hr_attendance_recorded_by_fkey'
            columns: ['recorded_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      hr_bonus_agreements: {
        Row: {
          bonus_type: string
          created_at: string
          created_by: string | null
          currency: string
          description: string | null
          effective_from: string | null
          effective_until: string | null
          employee_id: string
          fixed_amount: number | null
          id: string
          is_active: boolean
          organization_id: string
          percentage_base: string | null
          percentage_rate: number | null
          tier_rules: Json | null
          title: string
          updated_at: string
        }
        Insert: {
          bonus_type: string
          created_at?: string
          created_by?: string | null
          currency?: string
          description?: string | null
          effective_from?: string | null
          effective_until?: string | null
          employee_id: string
          fixed_amount?: number | null
          id?: string
          is_active?: boolean
          organization_id: string
          percentage_base?: string | null
          percentage_rate?: number | null
          tier_rules?: Json | null
          title: string
          updated_at?: string
        }
        Update: {
          bonus_type?: string
          created_at?: string
          created_by?: string | null
          currency?: string
          description?: string | null
          effective_from?: string | null
          effective_until?: string | null
          employee_id?: string
          fixed_amount?: number | null
          id?: string
          is_active?: boolean
          organization_id?: string
          percentage_base?: string | null
          percentage_rate?: number | null
          tier_rules?: Json | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'hr_bonus_agreements_employee_id_fkey'
            columns: ['employee_id']
            isOneToOne: false
            referencedRelation: 'hr_employees'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'hr_bonus_agreements_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
        ]
      }
      hr_bonus_payments: {
        Row: {
          agreement_id: string | null
          amount_usdt: number
          created_at: string
          created_by: string | null
          employee_id: string
          id: string
          notes: string | null
          organization_id: string
          paid_at: string | null
          period: string
          status: string
          transfer_id: string | null
        }
        Insert: {
          agreement_id?: string | null
          amount_usdt?: number
          created_at?: string
          created_by?: string | null
          employee_id: string
          id?: string
          notes?: string | null
          organization_id: string
          paid_at?: string | null
          period: string
          status?: string
          transfer_id?: string | null
        }
        Update: {
          agreement_id?: string | null
          amount_usdt?: number
          created_at?: string
          created_by?: string | null
          employee_id?: string
          id?: string
          notes?: string | null
          organization_id?: string
          paid_at?: string | null
          period?: string
          status?: string
          transfer_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'hr_bonus_payments_agreement_id_fkey'
            columns: ['agreement_id']
            isOneToOne: false
            referencedRelation: 'hr_bonus_agreements'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'hr_bonus_payments_employee_id_fkey'
            columns: ['employee_id']
            isOneToOne: false
            referencedRelation: 'hr_employees'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'hr_bonus_payments_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'hr_bonus_payments_transfer_id_fkey'
            columns: ['transfer_id']
            isOneToOne: false
            referencedRelation: 'transfers'
            referencedColumns: ['id']
          },
        ]
      }
      hr_bulk_payments: {
        Row: {
          id: string
          organization_id: string
          batch_type: string
          period: string
          total_amount: number
          currency: string
          item_count: number
          paid_at: string
          notes: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          batch_type: string
          period: string
          total_amount?: number
          currency?: string
          item_count?: number
          paid_at: string
          notes?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          batch_type?: string
          period?: string
          total_amount?: number
          currency?: string
          item_count?: number
          paid_at?: string
          notes?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'hr_bulk_payments_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
        ]
      }
      hr_bulk_payment_items: {
        Row: {
          id: string
          bulk_payment_id: string
          employee_id: string
          organization_id: string
          amount: number
          currency: string
          description: string
          salary_currency: string | null
          supplement_amount: number | null
          supplement_currency: string | null
          bank_deposit_amount: number | null
          attendance_deduction: number | null
          unpaid_leave_deduction: number | null
          agreement_id: string | null
          bonus_payment_id: string | null
          salary_payment_id: string | null
          advance_type: string | null
          created_at: string
        }
        Insert: {
          id?: string
          bulk_payment_id: string
          employee_id: string
          organization_id: string
          amount: number
          currency: string
          description: string
          salary_currency?: string | null
          supplement_amount?: number | null
          supplement_currency?: string | null
          bank_deposit_amount?: number | null
          attendance_deduction?: number | null
          unpaid_leave_deduction?: number | null
          agreement_id?: string | null
          bonus_payment_id?: string | null
          salary_payment_id?: string | null
          advance_type?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          bulk_payment_id?: string
          employee_id?: string
          organization_id?: string
          amount?: number
          currency?: string
          description?: string
          salary_currency?: string | null
          supplement_amount?: number | null
          supplement_currency?: string | null
          bank_deposit_amount?: number | null
          attendance_deduction?: number | null
          unpaid_leave_deduction?: number | null
          agreement_id?: string | null
          bonus_payment_id?: string | null
          salary_payment_id?: string | null
          advance_type?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'hr_bulk_payment_items_bulk_payment_id_fkey'
            columns: ['bulk_payment_id']
            isOneToOne: false
            referencedRelation: 'hr_bulk_payments'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'hr_bulk_payment_items_employee_id_fkey'
            columns: ['employee_id']
            isOneToOne: false
            referencedRelation: 'hr_employees'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'hr_bulk_payment_items_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
        ]
      }
      hr_employee_documents: {
        Row: {
          created_at: string
          document_type: string
          employee_id: string
          file_name: string
          file_url: string
          id: string
          organization_id: string
          storage_path: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          document_type: string
          employee_id: string
          file_name: string
          file_url: string
          id?: string
          organization_id: string
          storage_path: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          document_type?: string
          employee_id?: string
          file_name?: string
          file_url?: string
          id?: string
          organization_id?: string
          storage_path?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'hr_employee_documents_employee_id_fkey'
            columns: ['employee_id']
            isOneToOne: false
            referencedRelation: 'hr_employees'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'hr_employee_documents_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
        ]
      }
      hr_employees: {
        Row: {
          created_at: string
          created_by: string | null
          email: string
          exit_date: string | null
          full_name: string
          hire_date: string | null
          id: string
          is_active: boolean
          is_insured: boolean
          notes: string | null
          organization_id: string
          bank_salary_tl: number | null
          receives_supplement: boolean
          role: string
          salary_currency: string
          salary_tl: number
          updated_at: string
        }
        Insert: {
          bank_salary_tl?: number | null
          created_at?: string
          created_by?: string | null
          email: string
          exit_date?: string | null
          full_name: string
          hire_date?: string | null
          id?: string
          is_active?: boolean
          is_insured?: boolean
          notes?: string | null
          organization_id: string
          receives_supplement?: boolean
          role: string
          salary_currency?: string
          salary_tl?: number
          updated_at?: string
        }
        Update: {
          bank_salary_tl?: number | null
          created_at?: string
          created_by?: string | null
          email?: string
          exit_date?: string | null
          full_name?: string
          hire_date?: string | null
          id?: string
          is_active?: boolean
          is_insured?: boolean
          notes?: string | null
          organization_id?: string
          receives_supplement?: boolean
          role?: string
          salary_currency?: string
          salary_tl?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'hr_employees_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
        ]
      }
      hr_leaves: {
        Row: {
          created_at: string | null
          created_by: string | null
          employee_id: string
          end_date: string
          id: string
          leave_type: string
          notes: string | null
          organization_id: string
          start_date: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          employee_id: string
          end_date: string
          id?: string
          leave_type: string
          notes?: string | null
          organization_id: string
          start_date: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          employee_id?: string
          end_date?: string
          id?: string
          leave_type?: string
          notes?: string | null
          organization_id?: string
          start_date?: string
        }
        Relationships: [
          {
            foreignKeyName: 'hr_leaves_employee_id_fkey'
            columns: ['employee_id']
            isOneToOne: false
            referencedRelation: 'hr_employees'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'hr_leaves_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
        ]
      }
      hr_barem_targets: {
        Row: {
          id: string
          organization_id: string
          employee_id: string
          period: string
          count_target: number | null
          volume_target: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          employee_id: string
          period: string
          count_target?: number | null
          volume_target?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          employee_id?: string
          period?: string
          count_target?: number | null
          volume_target?: number | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'hr_barem_targets_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'hr_barem_targets_employee_id_fkey'
            columns: ['employee_id']
            isOneToOne: false
            referencedRelation: 'hr_employees'
            referencedColumns: ['id']
          },
        ]
      }
      hr_mt_barem_failures: {
        Row: {
          id: string
          organization_id: string
          employee_id: string
          period: string
          created_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          employee_id: string
          period: string
          created_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          employee_id?: string
          period?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'hr_mt_barem_failures_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'hr_mt_barem_failures_employee_id_fkey'
            columns: ['employee_id']
            isOneToOne: false
            referencedRelation: 'hr_employees'
            referencedColumns: ['id']
          },
        ]
      }
      hr_mt_config: {
        Row: {
          count_tiers: Json
          deposit_tiers: Json
          id: string
          monthly_prize_amount: number
          monthly_prize_min_sales: number
          organization_id: string
          updated_at: string
          volume_tiers: Json
          weekly_prize_amount: number
          weekly_prize_min_sales: number
        }
        Insert: {
          count_tiers?: Json
          deposit_tiers?: Json
          id?: string
          monthly_prize_amount?: number
          monthly_prize_min_sales?: number
          organization_id: string
          updated_at?: string
          volume_tiers?: Json
          weekly_prize_amount?: number
          weekly_prize_min_sales?: number
        }
        Update: {
          count_tiers?: Json
          deposit_tiers?: Json
          id?: string
          monthly_prize_amount?: number
          monthly_prize_min_sales?: number
          organization_id?: string
          updated_at?: string
          volume_tiers?: Json
          weekly_prize_amount?: number
          weekly_prize_min_sales?: number
        }
        Relationships: [
          {
            foreignKeyName: 'hr_mt_config_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: true
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
        ]
      }
      hr_re_config: {
        Row: {
          organization_id: string
          rate_tiers: Json
          updated_at: string
        }
        Insert: {
          organization_id: string
          rate_tiers?: Json
          updated_at?: string
        }
        Update: {
          organization_id?: string
          rate_tiers?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'hr_re_config_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: true
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
        ]
      }
      hr_salary_payments: {
        Row: {
          amount_tl: number
          created_at: string
          created_by: string | null
          employee_id: string
          id: string
          notes: string | null
          organization_id: string
          paid_at: string
          period: string
          salary_currency: string
        }
        Insert: {
          amount_tl?: number
          created_at?: string
          created_by?: string | null
          employee_id: string
          id?: string
          notes?: string | null
          organization_id: string
          paid_at: string
          period: string
          salary_currency?: string
        }
        Update: {
          amount_tl?: number
          created_at?: string
          created_by?: string | null
          employee_id?: string
          id?: string
          notes?: string | null
          organization_id?: string
          paid_at?: string
          period?: string
          salary_currency?: string
        }
        Relationships: [
          {
            foreignKeyName: 'hr_salary_payments_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'hr_salary_payments_employee_id_fkey'
            columns: ['employee_id']
            isOneToOne: false
            referencedRelation: 'hr_employees'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'hr_salary_payments_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
        ]
      }
      hr_settings: {
        Row: {
          absence_full_day_divisor: number
          absence_half_day_divisor: number
          absence_hourly_divisor: number
          barem_roles: Json
          daily_deduction_enabled: boolean
          hourly_deduction_enabled: boolean
          id: string
          organization_id: string
          qr_token: string
          roles: Json
          standard_check_in: string
          standard_check_out: string
          insured_bank_amount_tl: number
          insured_bank_currency: string
          supplement_tl: number
          supplement_currency: string
          timezone: string
          updated_at: string
          weekend_off: boolean
        }
        Insert: {
          absence_full_day_divisor?: number
          absence_half_day_divisor?: number
          absence_hourly_divisor?: number
          barem_roles?: Json
          daily_deduction_enabled?: boolean
          hourly_deduction_enabled?: boolean
          id?: string
          insured_bank_amount_tl?: number
          insured_bank_currency?: string
          organization_id: string
          qr_token?: string
          roles?: Json
          standard_check_in?: string
          standard_check_out?: string
          supplement_tl?: number
          supplement_currency?: string
          timezone?: string
          updated_at?: string
          weekend_off?: boolean
        }
        Update: {
          absence_full_day_divisor?: number
          absence_half_day_divisor?: number
          absence_hourly_divisor?: number
          barem_roles?: Json
          daily_deduction_enabled?: boolean
          hourly_deduction_enabled?: boolean
          id?: string
          insured_bank_amount_tl?: number
          insured_bank_currency?: string
          organization_id?: string
          qr_token?: string
          roles?: Json
          standard_check_in?: string
          standard_check_out?: string
          supplement_tl?: number
          supplement_currency?: string
          timezone?: string
          updated_at?: string
          weekend_off?: boolean
        }
        Relationships: [
          {
            foreignKeyName: 'hr_settings_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: true
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
        ]
      }
      ib_partners: {
        Row: {
          id: string
          organization_id: string
          name: string
          contact_email: string | null
          contact_phone: string | null
          agreement_types: string[]
          agreement_details: Json
          status: string
          notes: string | null
          website: string | null
          telegram: string | null
          whatsapp: string | null
          instagram: string | null
          twitter: string | null
          linkedin: string | null
          preferred_payment_method: string | null
          iban: string | null
          crypto_wallet_address: string | null
          crypto_network: string | null
          contract_start_date: string | null
          contract_end_date: string | null
          logo_url: string | null
          managed_by_employee_id: string | null
          secondary_employee_id: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          name: string
          contact_email?: string | null
          contact_phone?: string | null
          agreement_types: string[]
          agreement_details?: Json
          status?: string
          notes?: string | null
          website?: string | null
          telegram?: string | null
          whatsapp?: string | null
          instagram?: string | null
          twitter?: string | null
          linkedin?: string | null
          preferred_payment_method?: string | null
          iban?: string | null
          crypto_wallet_address?: string | null
          crypto_network?: string | null
          contract_start_date?: string | null
          contract_end_date?: string | null
          logo_url?: string | null
          managed_by_employee_id?: string | null
          secondary_employee_id?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          name?: string
          contact_email?: string | null
          contact_phone?: string | null
          agreement_types?: string[]
          agreement_details?: Json
          status?: string
          notes?: string | null
          website?: string | null
          telegram?: string | null
          whatsapp?: string | null
          instagram?: string | null
          twitter?: string | null
          linkedin?: string | null
          preferred_payment_method?: string | null
          iban?: string | null
          crypto_wallet_address?: string | null
          crypto_network?: string | null
          contract_start_date?: string | null
          contract_end_date?: string | null
          logo_url?: string | null
          managed_by_employee_id?: string | null
          secondary_employee_id?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'ib_partners_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'ib_partners_managed_by_employee_id_fkey'
            columns: ['managed_by_employee_id']
            isOneToOne: false
            referencedRelation: 'hr_employees'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'ib_partners_secondary_employee_id_fkey'
            columns: ['secondary_employee_id']
            isOneToOne: false
            referencedRelation: 'hr_employees'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'ib_partners_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      ib_referrals: {
        Row: {
          id: string
          organization_id: string
          ib_partner_id: string
          client_name: string
          ftd_date: string | null
          ftd_amount: number | null
          is_ftd: boolean
          lots_traded: number
          status: string
          notes: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          ib_partner_id: string
          client_name: string
          ftd_date?: string | null
          ftd_amount?: number | null
          is_ftd?: boolean
          lots_traded?: number
          status?: string
          notes?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          ib_partner_id?: string
          client_name?: string
          ftd_date?: string | null
          ftd_amount?: number | null
          is_ftd?: boolean
          lots_traded?: number
          status?: string
          notes?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'ib_referrals_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'ib_referrals_ib_partner_id_fkey'
            columns: ['ib_partner_id']
            isOneToOne: false
            referencedRelation: 'ib_partners'
            referencedColumns: ['id']
          },
        ]
      }
      ib_commissions: {
        Row: {
          id: string
          organization_id: string
          ib_partner_id: string
          period_start: string
          period_end: string
          agreement_type: string
          calculated_amount: number
          override_amount: number | null
          override_reason: string | null
          final_amount: number
          currency: string
          breakdown: Json
          status: string
          confirmed_at: string | null
          confirmed_by: string | null
          notes: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          ib_partner_id: string
          period_start: string
          period_end: string
          agreement_type: string
          calculated_amount?: number
          override_amount?: number | null
          override_reason?: string | null
          currency?: string
          breakdown?: Json
          status?: string
          confirmed_at?: string | null
          confirmed_by?: string | null
          notes?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          ib_partner_id?: string
          period_start?: string
          period_end?: string
          agreement_type?: string
          calculated_amount?: number
          override_amount?: number | null
          override_reason?: string | null
          currency?: string
          breakdown?: Json
          status?: string
          confirmed_at?: string | null
          confirmed_by?: string | null
          notes?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'ib_commissions_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'ib_commissions_ib_partner_id_fkey'
            columns: ['ib_partner_id']
            isOneToOne: false
            referencedRelation: 'ib_partners'
            referencedColumns: ['id']
          },
        ]
      }
      ib_payments: {
        Row: {
          id: string
          organization_id: string
          ib_partner_id: string
          ib_commission_id: string | null
          amount: number
          currency: string
          register: string
          payment_method: string | null
          reference: string | null
          payment_date: string
          description: string | null
          notes: string | null
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          ib_partner_id: string
          ib_commission_id?: string | null
          amount: number
          currency?: string
          register: string
          payment_method?: string | null
          reference?: string | null
          payment_date?: string
          description?: string | null
          notes?: string | null
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          ib_partner_id?: string
          ib_commission_id?: string | null
          amount?: number
          currency?: string
          register?: string
          payment_method?: string | null
          reference?: string | null
          payment_date?: string
          description?: string | null
          notes?: string | null
          created_by?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'ib_payments_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'ib_payments_ib_partner_id_fkey'
            columns: ['ib_partner_id']
            isOneToOne: false
            referencedRelation: 'ib_partners'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'ib_payments_ib_commission_id_fkey'
            columns: ['ib_commission_id']
            isOneToOne: false
            referencedRelation: 'ib_commissions'
            referencedColumns: ['id']
          },
        ]
      }
      legal_pages: {
        Row: {
          content: string | null
          id: string
          slug: string
          title: string
          updated_at: string | null
        }
        Insert: {
          content?: string | null
          id?: string
          slug: string
          title: string
          updated_at?: string | null
        }
        Update: {
          content?: string | null
          id?: string
          slug?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      login_attempts: {
        Row: {
          created_at: string
          device_id: string
          error_message: string | null
          id: string
          ip_address: string | null
          success: boolean
          user_id: string | null
        }
        Insert: {
          created_at?: string
          device_id: string
          error_message?: string | null
          id?: string
          ip_address?: string | null
          success?: boolean
          user_id?: string | null
        }
        Update: {
          created_at?: string
          device_id?: string
          error_message?: string | null
          id?: string
          ip_address?: string | null
          success?: boolean
          user_id?: string | null
        }
        Relationships: []
      }
      organization_invitations: {
        Row: {
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string | null
          organization_id: string
          role: string
          status: string
        }
        Insert: {
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          organization_id: string
          role?: string
          status?: string
        }
        Update: {
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          organization_id?: string
          role?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: 'organization_invitations_invited_by_profiles_fkey'
            columns: ['invited_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'organization_invitations_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
        ]
      }
      organization_members: {
        Row: {
          created_at: string
          invited_by: string | null
          organization_id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          invited_by?: string | null
          organization_id: string
          role?: string
          user_id: string
        }
        Update: {
          created_at?: string
          invited_by?: string | null
          organization_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'organization_members_invited_by_profiles_fkey'
            columns: ['invited_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'organization_members_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'organization_members_user_id_profiles_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      organizations: {
        Row: {
          base_currency: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          logo_url: string | null
          name: string
          security_pin: string | null
          slug: string
          updated_at: string
        }
        Insert: {
          base_currency?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name: string
          security_pin?: string | null
          slug: string
          updated_at?: string
        }
        Update: {
          base_currency?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name?: string
          security_pin?: string | null
          slug?: string
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
      payment_methods: {
        Row: {
          aliases: string[]
          created_at: string
          id: string
          is_system: boolean
          name: string
          organization_id: string | null
        }
        Insert: {
          aliases?: string[]
          created_at?: string
          id: string
          is_system?: boolean
          name: string
          organization_id?: string | null
        }
        Update: {
          aliases?: string[]
          created_at?: string
          id?: string
          is_system?: boolean
          name?: string
          organization_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          department: string | null
          display_name: string | null
          email: string | null
          id: string
          last_seen_at: string | null
          notes: string | null
          phone: string | null
          system_role: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          department?: string | null
          display_name?: string | null
          email?: string | null
          id: string
          last_seen_at?: string | null
          notes?: string | null
          phone?: string | null
          system_role?: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          department?: string | null
          display_name?: string | null
          email?: string | null
          id?: string
          last_seen_at?: string | null
          notes?: string | null
          phone?: string | null
          system_role?: string
          updated_at?: string
        }
        Relationships: []
      }
      psp_commission_rates: {
        Row: {
          commission_rate: number
          created_at: string
          created_by: string | null
          effective_from: string
          id: string
          organization_id: string
          psp_id: string
        }
        Insert: {
          commission_rate: number
          created_at?: string
          created_by?: string | null
          effective_from: string
          id?: string
          organization_id: string
          psp_id: string
        }
        Update: {
          commission_rate?: number
          created_at?: string
          created_by?: string | null
          effective_from?: string
          id?: string
          organization_id?: string
          psp_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'psp_commission_rates_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'psp_commission_rates_psp_id_fkey'
            columns: ['psp_id']
            isOneToOne: false
            referencedRelation: 'psps'
            referencedColumns: ['id']
          },
        ]
      }
      role_permissions: {
        Row: {
          id: string
          organization_id: string
          table_name: string
          role: string
          can_select: boolean
          can_insert: boolean
          can_update: boolean
          can_delete: boolean
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          id?: string
          organization_id: string
          table_name: string
          role: string
          can_select?: boolean
          can_insert?: boolean
          can_update?: boolean
          can_delete?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          id?: string
          organization_id?: string
          table_name?: string
          role?: string
          can_select?: boolean
          can_insert?: boolean
          can_update?: boolean
          can_delete?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'role_permissions_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
        ]
      }
      psp_settlements: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          currency: string
          id: string
          notes: string | null
          organization_id: string
          psp_id: string
          settlement_date: string
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          created_by?: string | null
          currency: string
          id?: string
          notes?: string | null
          organization_id: string
          psp_id: string
          settlement_date: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          currency?: string
          id?: string
          notes?: string | null
          organization_id?: string
          psp_id?: string
          settlement_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'psp_settlements_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'psp_settlements_psp_id_fkey'
            columns: ['psp_id']
            isOneToOne: false
            referencedRelation: 'psps'
            referencedColumns: ['id']
          },
        ]
      }
      psps: {
        Row: {
          accepted_payment_method_ids: string[] | null
          commission_rate: number
          created_at: string
          currency: string
          id: string
          initial_balance: number
          initial_balance_note: string
          is_active: boolean
          is_internal: boolean
          name: string
          organization_id: string
          provider: string | null
          provider_app_id: string | null
          psp_scope: string
          updated_at: string
        }
        Insert: {
          accepted_payment_method_ids?: string[] | null
          commission_rate?: number
          created_at?: string
          currency?: string
          id?: string
          initial_balance?: number
          initial_balance_note?: string
          is_active?: boolean
          is_internal?: boolean
          name: string
          organization_id: string
          provider?: string | null
          provider_app_id?: string | null
          psp_scope?: string
          updated_at?: string
        }
        Update: {
          accepted_payment_method_ids?: string[] | null
          commission_rate?: number
          created_at?: string
          currency?: string
          id?: string
          initial_balance?: number
          initial_balance_note?: string
          is_active?: boolean
          is_internal?: boolean
          name?: string
          organization_id?: string
          provider?: string | null
          provider_app_id?: string | null
          psp_scope?: string
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
      transfer_audit_log: {
        Row: {
          action: string
          changes: Json | null
          created_at: string
          id: string
          organization_id: string
          performed_by: string | null
          transfer_id: string
        }
        Insert: {
          action: string
          changes?: Json | null
          created_at?: string
          id?: string
          organization_id: string
          performed_by?: string | null
          transfer_id: string
        }
        Update: {
          action?: string
          changes?: Json | null
          created_at?: string
          id?: string
          organization_id?: string
          performed_by?: string | null
          transfer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'transfer_audit_log_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'transfer_audit_log_performed_by_profiles_fkey'
            columns: ['performed_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'transfer_audit_log_transfer_id_fkey'
            columns: ['transfer_id']
            isOneToOne: false
            referencedRelation: 'transfers'
            referencedColumns: ['id']
          },
        ]
      }
      transfer_categories: {
        Row: {
          aliases: string[]
          created_at: string
          id: string
          is_deposit: boolean
          name: string
        }
        Insert: {
          aliases?: string[]
          created_at?: string
          id: string
          is_deposit?: boolean
          name: string
        }
        Update: {
          aliases?: string[]
          created_at?: string
          id?: string
          is_deposit?: boolean
          name?: string
        }
        Relationships: []
      }
      transfer_types: {
        Row: {
          aliases: string[]
          created_at: string
          exclude_from_net: boolean
          id: string
          is_excluded: boolean
          is_system: boolean
          name: string
          organization_id: string | null
        }
        Insert: {
          aliases?: string[]
          created_at?: string
          exclude_from_net?: boolean
          id: string
          is_excluded?: boolean
          is_system?: boolean
          name: string
          organization_id?: string | null
        }
        Update: {
          aliases?: string[]
          created_at?: string
          exclude_from_net?: boolean
          id?: string
          is_excluded?: boolean
          is_system?: boolean
          name?: string
          organization_id?: string | null
        }
        Relationships: []
      }
      transfers: {
        Row: {
          amount: number
          amount_try: number
          amount_usd: number
          category_id: string
          commission: number
          commission_rate_snapshot: number | null
          created_at: string
          created_by: string | null
          crm_id: string | null
          currency: string
          employee_id: string | null
          exchange_rate: number
          external_transaction_id: string | null
          full_name: string
          ib_partner_id: string | null
          id: string
          is_first_deposit: boolean
          meta_id: string | null
          net: number
          notes: string | null
          organization_id: string
          payment_method_id: string
          psp_id: string | null
          transfer_date: string
          type_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          amount: number
          amount_try?: number
          amount_usd?: number
          category_id: string
          commission?: number
          commission_rate_snapshot?: number | null
          created_at?: string
          created_by?: string | null
          crm_id?: string | null
          currency?: string
          employee_id?: string | null
          exchange_rate?: number
          external_transaction_id?: string | null
          full_name: string
          ib_partner_id?: string | null
          id?: string
          is_first_deposit?: boolean
          meta_id?: string | null
          net?: number
          notes?: string | null
          organization_id: string
          payment_method_id: string
          psp_id?: string | null
          transfer_date?: string
          type_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          amount?: number
          amount_try?: number
          amount_usd?: number
          category_id?: string
          commission?: number
          commission_rate_snapshot?: number | null
          created_at?: string
          created_by?: string | null
          crm_id?: string | null
          currency?: string
          employee_id?: string | null
          exchange_rate?: number
          external_transaction_id?: string | null
          full_name?: string
          ib_partner_id?: string | null
          id?: string
          is_first_deposit?: boolean
          meta_id?: string | null
          net?: number
          notes?: string | null
          organization_id?: string
          payment_method_id?: string
          psp_id?: string | null
          transfer_date?: string
          type_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'transfers_category_id_fkey'
            columns: ['category_id']
            isOneToOne: false
            referencedRelation: 'transfer_categories'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'transfers_employee_id_fkey'
            columns: ['employee_id']
            isOneToOne: false
            referencedRelation: 'hr_employees'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'transfers_ib_partner_id_fkey'
            columns: ['ib_partner_id']
            isOneToOne: false
            referencedRelation: 'ib_partners'
            referencedColumns: ['id']
          },
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
        ]
      }
      trusted_devices: {
        Row: {
          created_at: string
          device_id: string
          id: string
          label: string | null
          last_used_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          device_id: string
          id?: string
          label?: string | null
          last_used_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          device_id?: string
          id?: string
          label?: string | null
          last_used_at?: string
          user_id?: string
        }
        Relationships: []
      }
      unipayment_sync_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          last_synced_at: string
          last_txn_id: string | null
          organization_id: string
          psp_id: string
          sync_status: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          last_synced_at?: string
          last_txn_id?: string | null
          organization_id: string
          psp_id: string
          sync_status?: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          last_synced_at?: string
          last_txn_id?: string | null
          organization_id?: string
          psp_id?: string
          sync_status?: string
        }
        Relationships: [
          {
            foreignKeyName: 'unipayment_sync_log_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'unipayment_sync_log_psp_id_fkey'
            columns: ['psp_id']
            isOneToOne: true
            referencedRelation: 'psps'
            referencedColumns: ['id']
          },
        ]
      }
      wallet_snapshots: {
        Row: {
          balances: Json
          created_at: string
          id: string
          organization_id: string
          snapshot_date: string
          total_usd: number
          wallet_id: string
        }
        Insert: {
          balances?: Json
          created_at?: string
          id?: string
          organization_id: string
          snapshot_date: string
          total_usd?: number
          wallet_id: string
        }
        Update: {
          balances?: Json
          created_at?: string
          id?: string
          organization_id?: string
          snapshot_date?: string
          total_usd?: number
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'wallet_snapshots_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'wallet_snapshots_wallet_id_fkey'
            columns: ['wallet_id']
            isOneToOne: false
            referencedRelation: 'wallets'
            referencedColumns: ['id']
          },
        ]
      }
      wallets: {
        Row: {
          address: string
          chain: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          label: string
          organization_id: string
          updated_at: string
        }
        Insert: {
          address: string
          chain: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          label: string
          organization_id: string
          updated_at?: string
        }
        Update: {
          address?: string
          chain?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          label?: string
          organization_id?: string
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_organization_member:
        | {
            Args: {
              _display_name?: string
              _email: string
              _org_id: string
              _password: string
              _role?: string
            }
            Returns: Json
          }
        | {
            Args: { _email: string; _org_id: string; _role?: string }
            Returns: Json
          }
      cleanup_old_captcha_challenges: { Args: never; Returns: number }
      cleanup_old_login_attempts: { Args: never; Returns: number }
      custom_access_token_hook: { Args: { event: Json }; Returns: Json }
      device_has_recent_captcha_success: {
        Args: { p_device_id: string; p_minutes?: number }
        Returns: boolean
      }
      get_captcha_solve_rate: {
        Args: { p_device_id: string; p_hours?: number }
        Returns: number
      }
      get_failed_login_count: {
        Args: { p_device_id: string; p_minutes?: number }
        Returns: number
      }
      get_monthly_summary: {
        Args: { _month: number; _org_id: string; _year: number }
        Returns: Json
      }
      get_psp_bloke_transfers: {
        Args: { _org_id: string; _psp_id: string }
        Returns: {
          amount: number
          crm_id: string
          currency: string
          full_name: string
          meta_id: string
          notes: string
          payment_method: string
          resolution_date: string
          resolution_id: string
          resolution_notes: string
          resolved_by: string
          status: string
          transfer_date: string
          transfer_id: string
        }[]
      }
      get_psp_ledger: {
        Args: { _org_id: string; _psp_id: string }
        Returns: {
          day: string
          total_commission: number
          total_deposits: number
          total_net: number
          total_settlement: number
          total_withdrawals: number
          transfer_count: number
        }[]
      }
      get_psp_monthly_summary: {
        Args: { _org_id: string; _psp_id: string }
        Returns: {
          avg_daily_volume: number
          commission_total: number
          deposit_count: number
          deposit_total: number
          month: number
          month_label: string
          net_total: number
          settlement_total: number
          transfer_count: number
          withdrawal_count: number
          withdrawal_total: number
          year: number
        }[]
      }
      get_psp_summary: {
        Args: { _org_id: string }
        Returns: {
          commission_rate: number
          currency: string
          is_active: boolean
          is_internal: boolean
          last_settlement_date: string
          provider: string
          psp_id: string
          psp_name: string
          psp_scope: string
          total_commission: number
          total_deposits: number
          total_net: number
          total_settlements: number
          total_withdrawals: number
        }[]
      }
      get_security_metrics: {
        Args: never
        Returns: {
          metric: string
          value: string
        }[]
      }
      get_user_id_by_email: { Args: { _email: string }; Returns: string }
      hr_checkin_by_qr: {
        Args: { p_token: string; p_email: string }
        Returns: Json
      }
      is_device_trusted: {
        Args: { p_device_id: string; p_user_id: string }
        Returns: boolean
      }
      log_captcha_challenge: {
        Args: {
          p_challenge_id: string
          p_device_id: string
          p_solved: boolean
          p_user_id: string
        }
        Returns: string
      }
      log_god_action: {
        Args: {
          p_action: string
          p_new_values?: Json
          p_old_values?: Json
          p_record_id?: string
          p_table_name: string
        }
        Returns: undefined
      }
      log_login_attempt: {
        Args: {
          p_device_id: string
          p_error_message?: string
          p_ip_address: string
          p_success: boolean
          p_user_id: string
        }
        Returns: string
      }
      mark_device_used: {
        Args: { p_device_id: string; p_user_id: string }
        Returns: undefined
      }
      recalculate_commissions_by_name: {
        Args: { org_name: string }
        Returns: {
          total_commission: number
          updated_count: number
        }[]
      }
      should_rate_limit_device: {
        Args: {
          p_device_id: string
          p_max_attempts?: number
          p_minutes?: number
        }
        Returns: boolean
      }
      update_last_seen: { Args: never; Returns: undefined }
      update_month_exchange_rate: {
        Args: {
          _month: number
          _new_rate: number
          _org_id: string
          _year: number
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
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema['Enums']
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never

export type AccountingEntry = Database['public']['Tables']['accounting_entries']['Row']
export type HrBulkPayment = Database['public']['Tables']['hr_bulk_payments']['Row']
export type HrBulkPaymentItem = Database['public']['Tables']['hr_bulk_payment_items']['Row']

export type IBPartner = Database['public']['Tables']['ib_partners']['Row']
export type IBPartnerInsert = Database['public']['Tables']['ib_partners']['Insert']
export type IBReferral = Database['public']['Tables']['ib_referrals']['Row']
export type IBReferralInsert = Database['public']['Tables']['ib_referrals']['Insert']
export type IBCommission = Database['public']['Tables']['ib_commissions']['Row']
export type IBPayment = Database['public']['Tables']['ib_payments']['Row']
export type IBPaymentInsert = Database['public']['Tables']['ib_payments']['Insert']

export type AccountingRegister = Database['public']['Tables']['accounting_registers']['Row']
export type AccountingRegisterInsert =
  Database['public']['Tables']['accounting_registers']['Insert']
export type AccountingCategory = Database['public']['Tables']['accounting_categories']['Row']
export type AccountingCategoryInsert =
  Database['public']['Tables']['accounting_categories']['Insert']
export type AccountingRegisterSnapshot =
  Database['public']['Tables']['accounting_register_snapshots']['Row']

export type OrgMemberRole = 'admin' | 'manager' | 'operation' | 'ik'
export type SystemRole = 'god' | 'user'
export type InvitationStatus = 'pending' | 'accepted' | 'expired'

export const Constants = {
  public: {
    Enums: {},
  },
} as const
