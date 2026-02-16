// Quick test script to verify Supabase connection
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://mnbjpcidjawvygkimgma.supabase.co'
const supabaseAnonKey = 'sb_publishable_WA2dtcCQXxXfgqBmz47euw_CzMMik6V'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

console.log('Testing Supabase connection...')

// Test basic connectivity
supabase
  .from('profiles')
  .select('count')
  .then(({ data, error }) => {
    if (error) {
      console.error('❌ Connection failed:', error.message)
      console.error('Details:', error)
    } else {
      console.log('✅ Supabase connected successfully!')
      console.log('Profiles table accessible')
    }
  })

// Test auth
supabase.auth.getSession().then(({ data, error }) => {
  if (error) {
    console.error('❌ Auth check failed:', error)
  } else {
    console.log('✅ Auth service working')
    console.log('Current session:', data.session ? 'Active' : 'None')
  }
})
