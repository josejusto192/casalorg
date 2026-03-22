import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Heart, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'

export default function RegisterPage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 6) {
      toast({ title: 'Senha muito curta', description: 'A senha precisa ter pelo menos 6 caracteres.', variant: 'destructive' })
      return
    }
    setLoading(true)

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })
      if (error) throw error

      if (data.user) {
        // Update profile name (trigger creates the profile)
        await supabase
          .from('profiles')
          .update({ full_name: fullName })
          .eq('id', data.user.id)

        toast({ title: 'Conta criada!', description: 'Vamos configurar seu lar agora.' })
        navigate('/onboarding')
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao criar conta'
      toast({ title: 'Erro', description: message, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-rose-50 to-pink-50 dark:from-rose-950 dark:to-pink-950 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8 animate-fade-in">
          <div className="inline-flex items-center gap-2 mb-3">
            <Heart className="w-8 h-8 text-primary fill-primary" />
            <span className="text-2xl font-bold text-foreground">Nós Dois</span>
          </div>
          <p className="text-muted-foreground text-sm">Crie sua conta e comece a organizar juntos</p>
        </div>

        <Card className="animate-fade-in shadow-lg">
          <CardHeader>
            <CardTitle>Criar conta</CardTitle>
            <CardDescription>Preencha os dados para começar</CardDescription>
          </CardHeader>

          <form onSubmit={handleRegister}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Seu nome</Label>
                <Input
                  id="fullName"
                  placeholder="Como você se chama?"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  autoComplete="name"
                />
              </div>

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

              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Mínimo 6 caracteres"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                />
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                Criar conta
              </Button>
            </CardContent>
          </form>

          <CardFooter className="text-center">
            <p className="text-sm text-muted-foreground w-full">
              Já tem conta?{' '}
              <Link to="/login" className="text-primary font-medium hover:underline">
                Entrar
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
