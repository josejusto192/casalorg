import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User, Session } from '@supabase/supabase-js'
import type { Profile, Household } from '@/types/database'

interface AuthState {
  user: User | null
  session: Session | null
  profile: Profile | null
  household: Household | null
  isLoading: boolean

  setUser: (user: User | null) => void
  setSession: (session: Session | null) => void
  setProfile: (profile: Profile | null) => void
  setHousehold: (household: Household | null) => void
  setLoading: (isLoading: boolean) => void
  reset: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      session: null,
      profile: null,
      household: null,
      isLoading: true,

      setUser: (user) => set({ user }),
      setSession: (session) => set({ session }),
      setProfile: (profile) => set({ profile }),
      setHousehold: (household) => set({ household }),
      setLoading: (isLoading) => set({ isLoading }),
      reset: () =>
        set({ user: null, session: null, profile: null, household: null, isLoading: false }),
    }),
    {
      name: 'nos-dois-auth',
      partialize: (state) => ({
        profile: state.profile,
        household: state.household,
      }),
    }
  )
)
