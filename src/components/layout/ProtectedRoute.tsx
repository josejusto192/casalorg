import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/store/auth.store'
import { Heart } from 'lucide-react'

export default function ProtectedRoute() {
  const { user, isLoading, profile } = useAuthStore()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-rose-50 to-pink-50">
        <div className="text-center">
          <Heart className="w-12 h-12 text-primary fill-primary mx-auto mb-4 animate-pulse" />
          <p className="text-muted-foreground text-sm">Carregando...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (user && profile && !profile.onboarding_done && !profile.household_id) {
    return <Navigate to="/onboarding" replace />
  }

  return <Outlet />
}
