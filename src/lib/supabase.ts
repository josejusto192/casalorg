import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? ''

export const isMissingEnv = !supabaseUrl || !supabaseAnonKey

export const supabase = createClient<Database>(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      // Use a simple mutex instead of navigator.locks to avoid
      // "lock was stolen" errors when concurrent auth operations collide.
      lock: async (_name, _acquireTimeout, fn) => fn(),
    },
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  }
)
