import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Heart } from 'lucide-react'

export default function AuthCallbackPage() {
  const navigate = useNavigate()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate('/')
      } else {
        navigate('/login')
      }
    })
  }, [navigate])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-rose-50 to-pink-50">
      <div className="text-center">
        <Heart className="w-12 h-12 text-primary fill-primary mx-auto mb-4 animate-pulse" />
        <p className="text-muted-foreground">Verificando sua conta...</p>
      </div>
    </div>
  )
}
