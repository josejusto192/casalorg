import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Heart, Home, Users, Copy, Check, Baby, PawPrint, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/auth.store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/hooks/use-toast'
import { generateInviteCode } from '@/lib/utils'

type Step = 'choice' | 'create' | 'join' | 'modules'

const DEFAULT_CATEGORIES = [
  { name: 'Alimentação', color: '#f97316', icon: 'utensils', type: 'expense' as const },
  { name: 'Moradia', color: '#8b5cf6', icon: 'home', type: 'expense' as const },
  { name: 'Transporte', color: '#3b82f6', icon: 'car', type: 'expense' as const },
  { name: 'Saúde', color: '#10b981', icon: 'heart', type: 'expense' as const },
  { name: 'Lazer', color: '#ec4899', icon: 'star', type: 'expense' as const },
  { name: 'Educação', color: '#f59e0b', icon: 'book', type: 'expense' as const },
  { name: 'Salário', color: '#22c55e', icon: 'banknote', type: 'income' as const },
  { name: 'Freelance', color: '#06b6d4', icon: 'briefcase', type: 'income' as const },
]

export default function OnboardingPage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { user, setProfile, setHousehold } = useAuthStore()

  const [step, setStep] = useState<Step>('choice')
  const [householdName, setHouseholdName] = useState('Nosso Lar')
  const [inviteCode, setInviteCode] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [hasChildren, setHasChildren] = useState(false)
  const [hasPets, setHasPets] = useState(false)
  const [createdCode, setCreatedCode] = useState('')
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(false)

  async function createHousehold() {
    if (!user) return
    setLoading(true)

    try {
      const code = generateInviteCode()
      const householdId = crypto.randomUUID()
      setCreatedCode(code)

      // Insert without .select() — SELECT policy requires household_id on profile
      // which isn't set yet, so it would return 0 rows and fail
      const { error: hError } = await supabase
        .from('households')
        .insert({ id: householdId, name: householdName, invite_code: code })

      if (hError) throw hError

      // Update profile first so get_household_id() works for subsequent queries
      const { data: profile, error: pError } = await supabase
        .from('profiles')
        .update({ household_id: householdId, role: 'owner' })
        .eq('id', user.id)
        .select()
        .single()

      if (pError) throw pError

      // Now get_household_id() returns householdId — SELECT policy passes
      const { data: household, error: fetchError } = await supabase
        .from('households')
        .select()
        .eq('id', householdId)
        .single()

      if (fetchError) throw fetchError

      // Seed default categories
      await supabase.from('transaction_categories').insert(
        DEFAULT_CATEGORIES.map((c) => ({ ...c, household_id: householdId }))
      )

      setHousehold(household)
      setProfile(profile)
      setInviteCode(code)
      setStep('modules')
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message ?? 'Erro ao criar lar'
      toast({ title: 'Erro', description: msg, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  async function joinHousehold() {
    if (!user) return
    setLoading(true)

    try {
      // Use RPC to bypass RLS — the user has no household_id yet so a direct
      // SELECT on `households` would return 0 rows even with a valid code.
      const { data: rows, error: hError } = await supabase
        .rpc('find_household_by_invite_code', { code: joinCode })

      const household = rows?.[0] ?? null

      if (hError || !household) {
        toast({ title: 'Código inválido', description: 'Verifique o código e tente novamente.', variant: 'destructive' })
        return
      }

      const { data: profile, error: pError } = await supabase
        .from('profiles')
        .update({ household_id: household.id, role: 'partner' })
        .eq('id', user.id)
        .select()
        .single()

      if (pError) throw pError

      setHousehold(household)
      setProfile(profile)

      await supabase
        .from('profiles')
        .update({ onboarding_done: true })
        .eq('id', user.id)

      toast({ title: 'Lar encontrado!', description: `Você entrou em "${household.name}"` })
      navigate('/')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao entrar no lar'
      toast({ title: 'Erro', description: message, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  async function finishOnboarding() {
    if (!user) return
    setLoading(true)

    try {
      const currentHousehold = useAuthStore.getState().household

      if (currentHousehold) {
        await supabase
          .from('households')
          .update({ has_children: hasChildren, has_pets: hasPets })
          .eq('id', currentHousehold.id)

        const { data: updatedHousehold } = await supabase
          .from('households')
          .select()
          .eq('id', currentHousehold.id)
          .single()

        if (updatedHousehold) setHousehold(updatedHousehold as typeof currentHousehold)
      }

      await supabase
        .from('profiles')
        .update({ onboarding_done: true })
        .eq('id', user.id)

      navigate('/')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao salvar configurações'
      toast({ title: 'Erro', description: message, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  function copyInviteLink() {
    const link = `${window.location.origin}/invite/${createdCode || inviteCode}`
    navigator.clipboard.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-rose-50 to-pink-50 dark:from-rose-950 dark:to-pink-950 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-3">
            <Heart className="w-8 h-8 text-primary fill-primary" />
            <span className="text-2xl font-bold">Nós Dois</span>
          </div>
          <p className="text-muted-foreground text-sm">Vamos configurar seu lar</p>
        </div>

        {/* Step: Choice */}
        {step === 'choice' && (
          <div className="space-y-4 animate-fade-in">
            <h2 className="text-xl font-semibold text-center mb-6">Como deseja começar?</h2>

            <Card
              className="cursor-pointer hover:border-primary transition-colors"
              onClick={() => setStep('create')}
            >
              <CardHeader>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                    <Home className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Criar um lar</CardTitle>
                    <CardDescription>Sou o primeiro a se cadastrar</CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>

            <Card
              className="cursor-pointer hover:border-primary transition-colors"
              onClick={() => setStep('join')}
            >
              <CardHeader>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                    <Users className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Entrar em um lar</CardTitle>
                    <CardDescription>Tenho um código de convite</CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>
          </div>
        )}

        {/* Step: Create Household */}
        {step === 'create' && (
          <Card className="animate-fade-in shadow-lg">
            <CardHeader>
              <CardTitle>Criar seu lar</CardTitle>
              <CardDescription>Dê um nome especial para a casa de vocês</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Nome do lar</Label>
                <Input
                  placeholder="Ex: Casa da Ana e João"
                  value={householdName}
                  onChange={(e) => setHouseholdName(e.target.value)}
                />
              </div>
              <Button className="w-full" onClick={createHousehold} disabled={loading}>
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                Criar lar
              </Button>
              <Button variant="ghost" className="w-full" onClick={() => setStep('choice')}>
                Voltar
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step: Join Household */}
        {step === 'join' && (
          <Card className="animate-fade-in shadow-lg">
            <CardHeader>
              <CardTitle>Entrar em um lar</CardTitle>
              <CardDescription>Digite o código que seu parceiro(a) compartilhou</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Código de convite</Label>
                <Input
                  placeholder="Ex: ABC123"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  maxLength={6}
                  className="text-center text-2xl font-mono tracking-widest"
                />
              </div>
              <Button className="w-full" onClick={joinHousehold} disabled={loading || joinCode.length < 4}>
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                Entrar no lar
              </Button>
              <Button variant="ghost" className="w-full" onClick={() => setStep('choice')}>
                Voltar
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step: Modules */}
        {step === 'modules' && (
          <Card className="animate-fade-in shadow-lg">
            <CardHeader>
              <CardTitle>Lar criado!</CardTitle>
              <CardDescription>Agora convide seu parceiro(a) e configure os módulos</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Invite Code */}
              <div className="bg-muted rounded-xl p-4 text-center space-y-2">
                <p className="text-sm text-muted-foreground">Código de convite</p>
                <p className="text-3xl font-mono font-bold text-primary tracking-widest">
                  {createdCode || inviteCode}
                </p>
                <Button variant="outline" size="sm" onClick={copyInviteLink}>
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copied ? 'Copiado!' : 'Copiar link de convite'}
                </Button>
              </div>

              {/* Modules */}
              <div className="space-y-3">
                <p className="text-sm font-medium">Módulos opcionais</p>

                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex items-center gap-3">
                    <Baby className="w-5 h-5 text-blue-500" />
                    <div>
                      <p className="text-sm font-medium">Filhos</p>
                      <p className="text-xs text-muted-foreground">Agenda escolar, vacinas e mais</p>
                    </div>
                  </div>
                  <Switch checked={hasChildren} onCheckedChange={setHasChildren} />
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex items-center gap-3">
                    <PawPrint className="w-5 h-5 text-amber-500" />
                    <div>
                      <p className="text-sm font-medium">Pets</p>
                      <p className="text-xs text-muted-foreground">Veterinário, vacinas e rações</p>
                    </div>
                  </div>
                  <Switch checked={hasPets} onCheckedChange={setHasPets} />
                </div>
              </div>

              <Button className="w-full" onClick={finishOnboarding} disabled={loading}>
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                Começar a usar
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
