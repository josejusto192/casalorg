import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format, differenceInYears } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Baby, Plus, Trash2, Loader2, ChevronRight } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/auth.store'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { useToast } from '@/hooks/use-toast'
import type { Child, ChildEvent } from '@/types/database'

export default function ChildrenPage() {
  const { household } = useAuthStore()
  const qc = useQueryClient()
  const { toast } = useToast()
  const [childDialogOpen, setChildDialogOpen] = useState(false)
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null)

  const { data: children = [], isLoading } = useQuery({
    queryKey: ['children', household?.id],
    enabled: !!household?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from('children')
        .select('*')
        .eq('household_id', household!.id)
        .order('name')
      return (data ?? []) as Child[]
    },
  })

  const deleteChild = useMutation({
    mutationFn: async (id: string) => { await supabase.from('children').delete().eq('id', id) },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['children'] })
      toast({ title: 'Perfil removido' })
    },
  })

  const selectedChild = children.find((c) => c.id === selectedChildId)

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        icon={Baby}
        title="Filhos"
        description="Perfis e agenda das crianças"
        action={
          <Dialog open={childDialogOpen} onOpenChange={setChildDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="w-4 h-4" />
                Adicionar filho
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Adicionar filho(a)</DialogTitle>
              </DialogHeader>
              <ChildForm
                householdId={household!.id}
                onSuccess={() => {
                  setChildDialogOpen(false)
                  qc.invalidateQueries({ queryKey: ['children'] })
                  toast({ title: 'Perfil criado!' })
                }}
              />
            </DialogContent>
          </Dialog>
        }
      />

      {isLoading && (
        <div className="space-y-3">
          {[1, 2].map((i) => <div key={i} className="h-20 bg-muted rounded-xl animate-pulse" />)}
        </div>
      )}

      {!isLoading && children.length === 0 && (
        <EmptyState
          icon={Baby}
          title="Nenhum filho(a) cadastrado"
          description="Adicione o perfil das crianças para organizar agenda e saúde."
          action={{ label: 'Adicionar filho', onClick: () => setChildDialogOpen(true) }}
        />
      )}

      {/* Children list */}
      {children.length > 0 && !selectedChildId && (
        <div className="space-y-3">
          {children.map((child) => {
            const age = child.birth_date ? differenceInYears(new Date(), new Date(child.birth_date)) : null
            return (
              <Card
                key={child.id}
                className="cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => setSelectedChildId(child.id)}
              >
                <CardContent className="p-4 flex items-center gap-3">
                  <Avatar className="w-12 h-12">
                    <AvatarFallback className="text-xl bg-blue-100 text-blue-600">
                      {child.name[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold">{child.name}</p>
                    <div className="flex gap-2 mt-0.5">
                      {age !== null && <span className="text-xs text-muted-foreground">{age} anos</span>}
                      {child.school && <span className="text-xs text-muted-foreground">{child.school}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteChild.mutate(child.id) }}
                      className="text-muted-foreground hover:text-destructive transition-colors p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Child Detail */}
      {selectedChild && (
        <ChildDetail
          child={selectedChild}
          onBack={() => setSelectedChildId(null)}
        />
      )}
    </div>
  )
}

function ChildDetail({ child, onBack }: { child: Child; onBack: () => void }) {
  const qc = useQueryClient()
  const { toast } = useToast()
  const [eventDialogOpen, setEventDialogOpen] = useState(false)

  const { data: events = [] } = useQuery({
    queryKey: ['child-events', child.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('child_events')
        .select('*')
        .eq('child_id', child.id)
        .order('date', { ascending: true })
      return (data ?? []) as ChildEvent[]
    },
  })

  const deleteEvent = useMutation({
    mutationFn: async (id: string) => { await supabase.from('child_events').delete().eq('id', id) },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['child-events', child.id] }),
  })

  const age = child.birth_date ? differenceInYears(new Date(), new Date(child.birth_date)) : null

  const upcomingEvents = events.filter((e) => new Date(e.date) >= new Date())
  const pastEvents = events.filter((e) => new Date(e.date) < new Date())

  const eventTypeEmoji: Record<string, string> = {
    appointment: '🏥',
    school: '🏫',
    vaccine: '💉',
    other: '📅',
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="text-muted-foreground hover:text-foreground transition-colors text-sm">
          ← Voltar
        </button>
      </div>

      <Card className="bg-gradient-to-r from-blue-50 to-sky-50 dark:from-blue-950/30 dark:to-sky-950/30 border-blue-100">
        <CardContent className="p-5">
          <div className="flex items-center gap-4">
            <Avatar className="w-16 h-16">
              <AvatarFallback className="text-2xl bg-blue-100 text-blue-600">{child.name[0]}</AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-xl font-bold">{child.name}</h2>
              {age !== null && <p className="text-sm text-muted-foreground">{age} anos</p>}
              {child.school && <p className="text-sm text-muted-foreground">{child.school}</p>}
              {child.birth_date && (
                <p className="text-xs text-muted-foreground">
                  Nascimento: {format(new Date(child.birth_date + 'T12:00:00'), "d 'de' MMMM 'de' yyyy", { locale: ptBR })}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Compromissos</h3>
        <Dialog open={eventDialogOpen} onOpenChange={setEventDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline">
              <Plus className="w-4 h-4" />
              Adicionar
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Novo compromisso</DialogTitle>
            </DialogHeader>
            <ChildEventForm
              childId={child.id}
              householdId={child.household_id}
              onSuccess={() => {
                setEventDialogOpen(false)
                qc.invalidateQueries({ queryKey: ['child-events', child.id] })
                toast({ title: 'Compromisso adicionado!' })
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="upcoming">
        <TabsList>
          <TabsTrigger value="upcoming">Próximos ({upcomingEvents.length})</TabsTrigger>
          <TabsTrigger value="past">Passados</TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="mt-3 space-y-2">
          {upcomingEvents.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhum compromisso futuro</p>
          ) : (
            upcomingEvents.map((ev) => (
              <Card key={ev.id}>
                <CardContent className="p-4 flex gap-3 items-start">
                  <span className="text-xl">{eventTypeEmoji[ev.type]}</span>
                  <div className="flex-1">
                    <p className="font-medium text-sm">{ev.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(ev.date), "d 'de' MMM, HH:mm", { locale: ptBR })}
                    </p>
                    {ev.notes && <p className="text-xs text-muted-foreground mt-1">{ev.notes}</p>}
                  </div>
                  <button onClick={() => deleteEvent.mutate(ev.id)} className="text-muted-foreground hover:text-destructive">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="past" className="mt-3 space-y-2 opacity-70">
          {pastEvents.map((ev) => (
            <Card key={ev.id}>
              <CardContent className="p-4 flex gap-3 items-start">
                <span className="text-xl">{eventTypeEmoji[ev.type]}</span>
                <div className="flex-1">
                  <p className="font-medium text-sm">{ev.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(ev.date), "d 'de' MMM yyyy", { locale: ptBR })}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  )
}

function ChildForm({ householdId, onSuccess }: { householdId: string; onSuccess: () => void }) {
  const [name, setName] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [school, setSchool] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      await supabase.from('children').insert({
        household_id: householdId,
        name,
        birth_date: birthDate || null,
        school: school || null,
      })
      onSuccess()
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Nome</Label>
        <Input placeholder="Nome do filho(a)" value={name} onChange={(e) => setName(e.target.value)} required />
      </div>
      <div className="space-y-2">
        <Label>Data de nascimento</Label>
        <Input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>Escola (opcional)</Label>
        <Input placeholder="Nome da escola" value={school} onChange={(e) => setSchool(e.target.value)} />
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
        Salvar
      </Button>
    </form>
  )
}

function ChildEventForm({ childId, householdId, onSuccess }: { childId: string; householdId: string; onSuccess: () => void }) {
  const [title, setTitle] = useState('')
  const [type, setType] = useState<'appointment' | 'school' | 'vaccine' | 'other'>('appointment')
  const [date, setDate] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      await supabase.from('child_events').insert({ child_id: childId, household_id: householdId, title, type, date, notes: notes || null })
      onSuccess()
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Título</Label>
        <Input placeholder="Ex: Consulta pediatra" value={title} onChange={(e) => setTitle(e.target.value)} required />
      </div>
      <div className="space-y-2">
        <Label>Tipo</Label>
        <Select value={type} onValueChange={(v) => setType(v as typeof type)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="appointment">🏥 Consulta médica</SelectItem>
            <SelectItem value="school">🏫 Evento escolar</SelectItem>
            <SelectItem value="vaccine">💉 Vacina</SelectItem>
            <SelectItem value="other">📅 Outro</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Data e hora</Label>
        <Input type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)} required />
      </div>
      <div className="space-y-2">
        <Label>Observações (opcional)</Label>
        <Input placeholder="Detalhes adicionais..." value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
        Adicionar
      </Button>
    </form>
  )
}
