import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/auth.store'
import type { Profile, Household } from '@/types/database'

export function useAuthListener() {
  const { setUser, setSession, setProfile, setHousehold, setLoading, reset } = useAuthStore()

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)

      if (session?.user) {
        await loadUserData(session.user.id)
      }
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session)
        setUser(session?.user ?? null)

        if (event === 'SIGNED_IN' && session?.user) {
          await loadUserData(session.user.id)
        } else if (event === 'SIGNED_OUT') {
          reset()
        }

        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  async function loadUserData(userId: string) {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    const profile = data as Profile | null
    if (profile) {
      setProfile(profile)

      if (profile.household_id) {
        const { data: hData } = await supabase
          .from('households')
          .select('*')
          .eq('id', profile.household_id)
          .single()
        setHousehold(hData as Household | null)
      }
    }
  }
}

export function useCurrentUser() {
  return useAuthStore((s) => ({
    user: s.user,
    profile: s.profile,
    household: s.household,
    isLoading: s.isLoading,
  }))
}
