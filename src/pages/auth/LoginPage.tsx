import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Heart, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'

export default function LoginPage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [magicLinkSent, setMagicLinkSent] = useState(false)
  const [useMagicLink, setUseMagicLink] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    try {
      if (useMagicLink) {
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
        })
        if (error) throw error
        setMagicLinkSent(true)
        toast({ title: 'Magic link enviado!', description: 'Verifique seu email.' })
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        navigate('/')
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao fazer login'
      toast({ title: 'Erro', description: message, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  if (magicLinkSent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-rose-50 to-pink-50 dark:from-rose-950 dark:to-pink-950 p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <Heart className="w-8 h-8 text-primary" />
            </div>
            <CardTitle>Verifique seu email</CardTitle>
            <CardDescription>
              Enviamos um link mágico para <strong>{email}</strong>. Clique nele para entrar.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button variant="outline" className="w-full" onClick={() => setMagicLinkSent(false)}>
              Usar outro método
            </Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-rose-50 to-pink-50 dark:from-rose-950 dark:to-pink-950 p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8 animate-fade-in">
          <div className="inline-flex items-center gap-2 mb-3">
            <Heart className="w-8 h-8 text-primary fill-primary" />
            <span className="text-2xl font-bold text-foreground">Nós Dois</span>
          </div>
          <p className="text-muted-foreground text-sm">Hub de organização para casais</p>
        </div>

        <Card className="animate-fade-in shadow-lg">
          <CardHeader>
            <CardTitle>Bem-vindo(a) de volta</CardTitle>
            <CardDescription>Entre para continuar organizando seu lar</CardDescription>
          </CardHeader>

          <form onSubmit={handleLogin}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="voce@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>

              {!useMagicLink && (
                <div className="space-y-2">
                  <Label htmlFor="password">Senha</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                  />
                </div>
              )}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                {useMagicLink ? 'Enviar link mágico' : 'Entrar'}
              </Button>

              <button
                type="button"
                className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => setUseMagicLink(!useMagicLink)}
              >
                {useMagicLink ? 'Entrar com senha' : 'Entrar com link mágico (sem senha)'}
              </button>
            </CardContent>
          </form>

          <CardFooter className="flex-col gap-2 text-center">
            <p className="text-sm text-muted-foreground">
              Ainda não tem conta?{' '}
              <Link to="/register" className="text-primary font-medium hover:underline">
                Criar conta
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
