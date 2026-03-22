import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format, startOfWeek, addDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Dumbbell, Plus, CheckCircle2, Circle, Trash2, Loader2, TrendingUp } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/auth.store'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { useToast } from '@/hooks/use-toast'
import type { WorkoutPlan, WorkoutLog } from '@/types/database'

const WEEK_DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

export default function WorkoutsPage() {
  const { household, user } = useAuthStore()
  const qc = useQueryClient()
  const { toast } = useToast()
  const [planDialogOpen, setPlanDialogOpen] = useState(false)
  const [logDialogOpen, setLogDialogOpen] = useState(false)
  const weekStart = format(startOfWeek(new Date()), 'yyyy-MM-dd')

  const { data: plans = [], isLoading: plansLoading } = useQuery({
    queryKey: ['workout-plans', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from('workout_plans')
        .select('*, exercises(*)')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
      return (data ?? []) as unknown as (WorkoutPlan & { exercises: { id: string; name: string; sets: number | null; reps: string | null; day_of_week: number | null }[] })[]
    },
  })

  const { data: logs = [] } = useQuery({
    queryKey: ['workout-logs', 'week', user?.id, weekStart],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from('workout_logs')
        .select('*')
        .eq('user_id', user!.id)
        .gte('date', weekStart)
        .order('date', { ascending: true })
      return (data ?? []) as WorkoutLog[]
    },
  })

  const activePlan = plans.find((p) => p.is_active)

  const deletePlan = useMutation({
    mutationFn: async (id: string) => { await supabase.from('workout_plans').delete().eq('id', id) },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workout-plans'] })
      toast({ title: 'Plano removido' })
    },
  })

  const toggleLog = useMutation({
    mutationFn: async ({ date, planId }: { date: string; planId: string | null }) => {
      const existing = logs.find((l) => l.date === date)
      if (existing) {
        await supabase.from('workout_logs').update({ completed: !existing.completed }).eq('id', existing.id)
      } else {
        await supabase.from('workout_logs').insert({
          user_id: user!.id,
          household_id: household!.id,
          plan_id: planId,
          date,
          completed: true,
        })
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workout-logs'] }),
  })

  const completedThisWeek = logs.filter((l) => l.completed).length
  const targetPerWeek = activePlan?.days_per_week ?? 3
  const progressPercent = Math.min(100, Math.round((completedThisWeek / targetPerWeek) * 100))

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        icon={Dumbbell}
        title="Treinos"
        description="Acompanhe a evolução de vocês"
        action={
          <div className="flex gap-2">
            <Dialog open={logDialogOpen} onOpenChange={setLogDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline">
                  <CheckCircle2 className="w-4 h-4" />
                  Registrar
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Registrar treino</DialogTitle>
                </DialogHeader>
                <WorkoutLogForm
                  plans={plans}
                  userId={user!.id}
                  householdId={household!.id}
                  onSuccess={() => {
                    setLogDialogOpen(false)
                    qc.invalidateQueries({ queryKey: ['workout-logs'] })
                    toast({ title: 'Treino registrado!' })
                  }}
                />
              </DialogContent>
            </Dialog>
            <Dialog open={planDialogOpen} onOpenChange={setPlanDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="w-4 h-4" />
                  Plano
                </Button>
              </DialogTrigger>
              <DialogContent className="max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Novo plano de treino</DialogTitle>
                </DialogHeader>
                <WorkoutPlanForm
                  userId={user!.id}
                  householdId={household!.id}
                  onSuccess={() => {
                    setPlanDialogOpen(false)
                    qc.invalidateQueries({ queryKey: ['workout-plans'] })
                    toast({ title: 'Plano criado!' })
                  }}
                />
              </DialogContent>
            </Dialog>
          </div>
        }
      />

      {/* Weekly Progress */}
      <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="font-semibold">Semana atual</p>
              <p className="text-sm text-muted-foreground">
                {completedThisWeek} de {targetPerWeek} treinos
              </p>
            </div>
            <div className="text-3xl font-bold text-primary">{progressPercent}%</div>
          </div>
          <Progress value={progressPercent} className="h-3" />
        </CardContent>
      </Card>

      {/* Weekly Calendar */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Calendário da semana</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-1">
            {WEEK_DAYS.map((day, idx) => {
              const date = format(addDays(new Date(weekStart), idx), 'yyyy-MM-dd')
              const log = logs.find((l) => l.date === date)
              const isToday = date === format(new Date(), 'yyyy-MM-dd')

              return (
                <button
                  key={idx}
                  onClick={() => toggleLog.mutate({ date, planId: activePlan?.id ?? null })}
                  className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-colors ${
                    log?.completed
                      ? 'bg-primary text-primary-foreground'
                      : isToday
                      ? 'bg-primary/10 text-primary border border-primary/30'
                      : 'hover:bg-muted'
                  }`}
                >
                  <span className="text-xs font-medium">{day}</span>
                  <span className="text-xs">{format(addDays(new Date(weekStart), idx), 'd')}</span>
                  {log?.completed ? (
                    <CheckCircle2 className="w-3 h-3" />
                  ) : (
                    <Circle className="w-3 h-3 opacity-30" />
                  )}
                </button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="plans">
        <TabsList className="w-full">
          <TabsTrigger value="plans" className="flex-1">Meus planos</TabsTrigger>
          <TabsTrigger value="history" className="flex-1">Histórico</TabsTrigger>
        </TabsList>

        <TabsContent value="plans" className="mt-4 space-y-3">
          {plansLoading && (
            <div className="space-y-2">
              {[1, 2].map((i) => <div key={i} className="h-24 bg-muted rounded-xl animate-pulse" />)}
            </div>
          )}

          {!plansLoading && plans.length === 0 && (
            <EmptyState
              icon={Dumbbell}
              title="Nenhum plano de treino"
              description="Crie seu primeiro plano de treino personalizado."
              action={{ label: 'Criar plano', onClick: () => setPlanDialogOpen(true) }}
            />
          )}

          {plans.map((plan) => (
            <Card key={plan.id} className={plan.is_active ? 'border-primary/40 bg-primary/5' : ''}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold">{plan.name}</p>
                      {plan.is_active && <Badge variant="default" className="text-xs">Ativo</Badge>}
                    </div>
                    {plan.description && (
                      <p className="text-sm text-muted-foreground mt-0.5 truncate">{plan.description}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">{plan.days_per_week}x por semana</p>

                    {plan.exercises && plan.exercises.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {plan.exercises.slice(0, 4).map((ex) => (
                          <Badge key={ex.id} variant="secondary" className="text-xs">
                            {ex.name}
                          </Badge>
                        ))}
                        {plan.exercises.length > 4 && (
                          <Badge variant="secondary" className="text-xs">
                            +{plan.exercises.length - 4}
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => deletePlan.mutate(plan.id)}
                    className="text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <WorkoutHistoryTab userId={user!.id} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function WorkoutHistoryTab({ userId }: { userId: string }) {
  const { data: allLogs = [], isLoading } = useQuery({
    queryKey: ['workout-logs', 'all', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase
        .from('workout_logs')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: false })
        .limit(30)
      return (data ?? []) as WorkoutLog[]
    },
  })

  const completed = allLogs.filter((l) => l.completed)

  if (isLoading) return <div className="h-32 bg-muted rounded-xl animate-pulse" />

  if (completed.length === 0) {
    return (
      <EmptyState
        icon={TrendingUp}
        title="Sem histórico"
        description="Registre treinos para ver seu histórico aqui."
      />
    )
  }

  return (
    <div className="space-y-2">
      {completed.map((log) => (
        <Card key={log.id}>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
              <Dumbbell className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-sm capitalize">
                {format(new Date(log.date + 'T12:00:00'), "EEEE, d 'de' MMMM", { locale: ptBR })}
              </p>
              {log.duration_min && (
                <p className="text-xs text-muted-foreground">{log.duration_min} minutos</p>
              )}
            </div>
            <Badge variant="success">Concluído</Badge>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function WorkoutPlanForm({
  userId,
  householdId,
  onSuccess,
}: {
  userId: string
  householdId: string
  onSuccess: () => void
}) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [daysPerWeek, setDaysPerWeek] = useState('3')
  const [exercises, setExercises] = useState([{ name: '', sets: '3', reps: '10-12', dayOfWeek: '' }])
  const [loading, setLoading] = useState(false)

  function addExercise() {
    setExercises([...exercises, { name: '', sets: '3', reps: '10-12', dayOfWeek: '' }])
  }

  function updateExercise(idx: number, field: string, value: string) {
    setExercises(exercises.map((ex, i) => (i === idx ? { ...ex, [field]: value } : ex)))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const { data: plan, error } = await supabase
        .from('workout_plans')
        .insert({
          user_id: userId,
          household_id: householdId,
          name,
          description: description || null,
          days_per_week: parseInt(daysPerWeek),
          is_active: true,
        })
        .select()
        .single()
      if (error) throw error

      const validExercises = exercises.filter((ex) => ex.name.trim())
      if (validExercises.length > 0) {
        await supabase.from('exercises').insert(
          validExercises.map((ex, idx) => ({
            plan_id: plan.id,
            name: ex.name.trim(),
            sets: parseInt(ex.sets) || null,
            reps: ex.reps || null,
            day_of_week: ex.dayOfWeek ? parseInt(ex.dayOfWeek) : null,
            order_index: idx,
          }))
        )
      }

      onSuccess()
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Nome do plano</Label>
        <Input placeholder="Ex: Treino ABC" value={name} onChange={(e) => setName(e.target.value)} required />
      </div>
      <div className="space-y-2">
        <Label>Descrição (opcional)</Label>
        <Input placeholder="Breve descrição..." value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>Dias por semana</Label>
        <Input type="number" min="1" max="7" value={daysPerWeek} onChange={(e) => setDaysPerWeek(e.target.value)} />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Exercícios</Label>
          <Button type="button" variant="ghost" size="sm" onClick={addExercise}>
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        {exercises.map((ex, idx) => (
          <div key={idx} className="grid grid-cols-4 gap-2 p-3 rounded-lg border bg-muted/30">
            <div className="col-span-4 space-y-1">
              <Input
                placeholder="Nome do exercício"
                value={ex.name}
                onChange={(e) => updateExercise(idx, 'name', e.target.value)}
                className="text-sm"
              />
            </div>
            <Input
              type="number"
              placeholder="Séries"
              value={ex.sets}
              onChange={(e) => updateExercise(idx, 'sets', e.target.value)}
              className="col-span-1 text-sm"
            />
            <Input
              placeholder="Reps"
              value={ex.reps}
              onChange={(e) => updateExercise(idx, 'reps', e.target.value)}
              className="col-span-2 text-sm"
            />
            <select
              value={ex.dayOfWeek}
              onChange={(e) => updateExercise(idx, 'dayOfWeek', e.target.value)}
              className="col-span-1 rounded-md border border-input bg-background px-2 text-sm"
            >
              <option value="">Dia</option>
              {WEEK_DAYS.map((d, i) => (
                <option key={i} value={i}>{d}</option>
              ))}
            </select>
          </div>
        ))}
      </div>

      <Button type="submit" className="w-full" disabled={loading}>
        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
        Criar plano
      </Button>
    </form>
  )
}

function WorkoutLogForm({
  plans,
  userId,
  householdId,
  onSuccess,
}: {
  plans: WorkoutPlan[]
  userId: string
  householdId: string
  onSuccess: () => void
}) {
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [planId, setPlanId] = useState(plans.find((p) => p.is_active)?.id ?? '')
  const [duration, setDuration] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      await supabase.from('workout_logs').insert({
        user_id: userId,
        household_id: householdId,
        plan_id: planId || null,
        date,
        duration_min: duration ? parseInt(duration) : null,
        notes: notes || null,
        completed: true,
      })
      onSuccess()
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Data</Label>
        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
      </div>
      {plans.length > 0 && (
        <div className="space-y-2">
          <Label>Plano (opcional)</Label>
          <select
            value={planId}
            onChange={(e) => setPlanId(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="">Sem plano específico</option>
            {plans.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
      )}
      <div className="space-y-2">
        <Label>Duração (minutos)</Label>
        <Input type="number" min="1" placeholder="60" value={duration} onChange={(e) => setDuration(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>Observações (opcional)</Label>
        <Input placeholder="Como foi o treino?" value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
        Registrar treino
      </Button>
    </form>
  )
}
