import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Settings, LogOut, Copy, Check, Moon, Sun, Baby, PawPrint } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/auth.store'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { useToast } from '@/hooks/use-toast'
import { getInitials } from '@/lib/utils'

export default function SettingsPage() {
  const { profile, household, setProfile, setHousehold, reset } = useAuthStore()
  const { toast } = useToast()
  const [copied, setCopied] = useState(false)
  const [darkMode, setDarkMode] = useState(profile?.dark_mode ?? false)
  const [fullName, setFullName] = useState(profile?.full_name ?? '')
  const [householdName, setHouseholdName] = useState(household?.name ?? '')
  const [hasChildren, setHasChildren] = useState(household?.has_children ?? false)
  const [hasPets, setHasPets] = useState(household?.has_pets ?? false)

  const updateProfile = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .update({ full_name: fullName, dark_mode: darkMode })
        .eq('id', profile!.id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      setProfile(data)
      toast({ title: 'Perfil atualizado!' })
    },
    onError: () => toast({ title: 'Erro ao salvar', variant: 'destructive' }),
  })

  const updateHousehold = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from('households')
        .update({ name: householdName, has_children: hasChildren, has_pets: hasPets })
        .eq('id', household!.id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      setHousehold(data)
      toast({ title: 'Lar atualizado!' })
    },
    onError: () => toast({ title: 'Erro ao salvar', variant: 'destructive' }),
  })

  function toggleDarkMode(enabled: boolean) {
    setDarkMode(enabled)
    document.documentElement.classList.toggle('dark', enabled)
  }

  function copyInviteLink() {
    if (!household) return
    const link = `${window.location.origin}/invite/${household.invite_code}`
    navigator.clipboard.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    toast({ title: 'Link copiado!' })
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    reset()
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader icon={Settings} title="Configurações" description="Personalize seu lar" />

      {/* Profile */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Avatar className="w-8 h-8">
              <AvatarFallback>{getInitials(profile?.full_name || 'U')}</AvatarFallback>
            </Avatar>
            Meu perfil
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Nome</Label>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {darkMode ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
              <Label>Modo escuro</Label>
            </div>
            <Switch checked={darkMode} onCheckedChange={toggleDarkMode} />
          </div>
          <Button
            className="w-full"
            onClick={() => updateProfile.mutate()}
            disabled={updateProfile.isPending}
          >
            Salvar perfil
          </Button>
        </CardContent>
      </Card>

      {/* Household */}
      {household && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">🏠 Nosso lar</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Nome do lar</Label>
              <Input value={householdName} onChange={(e) => setHouseholdName(e.target.value)} />
            </div>

            <Separator />

            <div className="space-y-3">
              <p className="text-sm font-medium">Módulos opcionais</p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Baby className="w-4 h-4 text-blue-500" />
                  <Label>Filhos</Label>
                </div>
                <Switch checked={hasChildren} onCheckedChange={setHasChildren} />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <PawPrint className="w-4 h-4 text-amber-500" />
                  <Label>Pets</Label>
                </div>
                <Switch checked={hasPets} onCheckedChange={setHasPets} />
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label>Código de convite</Label>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-muted rounded-lg px-3 py-2 font-mono font-bold text-lg text-center tracking-widest">
                  {household.invite_code}
                </div>
                <Button variant="outline" size="icon" onClick={copyInviteLink}>
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Compartilhe este código com seu(sua) parceiro(a) para entrar no lar.
              </p>
            </div>

            <Button
              className="w-full"
              onClick={() => updateHousehold.mutate()}
              disabled={updateHousehold.isPending}
            >
              Salvar lar
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Logout */}
      <Button variant="destructive" className="w-full" onClick={handleLogout}>
        <LogOut className="w-4 h-4" />
        Sair da conta
      </Button>
    </div>
  )
}
