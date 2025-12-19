import { createClient, SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Lazy initialization to prevent build-time errors during static generation
let supabaseInstance: SupabaseClient | null = null

export const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_, prop) {
    if (!supabaseInstance) {
      if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error(
          'Supabase URL or Anon Key is missing. Please check your environment variables.'
        )
      }
      supabaseInstance = createClient(supabaseUrl, supabaseAnonKey)
    }
    return (supabaseInstance as unknown as Record<string | symbol, unknown>)[prop]
  }
})

