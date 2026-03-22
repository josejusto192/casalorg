import { useQuery } from '@tanstack/react-query'
import { format, startOfMonth, endOfMonth } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  Wallet,
  ShoppingCart,
  Dumbbell,
  TrendingUp,
  TrendingDown,
  ArrowRight,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/auth.store'
import { formatCurrency, getInitials } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'

export default function DashboardPage() {
  const { profile, household } = useAuthStore()
  const now = new Date()
  const monthStart = format(startOfMonth(now), 'yyyy-MM-dd')
  const monthEnd = format(endOfMonth(now), 'yyyy-MM-dd')

  // Financial summary
  const { data: transactions, isLoading: txLoading } = useQuery({
    queryKey: ['transactions', 'summary', household?.id, monthStart],
    enabled: !!household?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from('transactions')
        .select('amount, type')
        .eq('household_id', household!.id)
        .gte('date', monthStart)
        .lte('date', monthEnd)
      return data ?? []
    },
  })

  // Shopping list
  const { data: shoppingItems, isLoading: shopLoading } = useQuery({
    queryKey: ['shopping', 'pending', household?.id],
    enabled: !!household?.id,
    queryFn: async () => {
      const { data: activeList } = await supabase
        .from('shopping_lists')
        .select('id')
        .eq('household_id', household!.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (!activeList) return []

      const { data } = await supabase
        .from('shopping_items')
        .select('id, name, checked')
        .eq('list_id', activeList.id)
      return data ?? []
    },
  })

  // Workout this week
  const { data: workoutLogs } = useQuery({
    queryKey: ['workout-logs', 'week', profile?.id],
    enabled: !!profile?.id,
    queryFn: async () => {
      const weekStart = format(
        new Date(now.setDate(now.getDate() - now.getDay())),
        'yyyy-MM-dd'
      )
      const { data } = await supabase
        .from('workout_logs')
        .select('id, completed, date')
        .eq('user_id', profile!.id)
        .gte('date', weekStart)
      return data ?? []
    },
  })

  // Savings goals
  const { data: goals } = useQuery({
    queryKey: ['savings-goals', household?.id],
    enabled: !!household?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from('savings_goals')
        .select('*')
        .eq('household_id', household!.id)
        .limit(2)
      return data ?? []
    },
  })

  const totalIncome = transactions?.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0) ?? 0
  const totalExpense = transactions?.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0) ?? 0
  const balance = totalIncome - totalExpense

  const pendingItems = shoppingItems?.filter((i) => !i.checked).length ?? 0
  const checkedItems = shoppingItems?.filter((i) => i.checked).length ?? 0
  const workoutsThisWeek = workoutLogs?.filter((l) => l.completed).length ?? 0

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Greeting */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            Olá, {profile?.full_name?.split(' ')[0]} 👋
          </h1>
          <p className="text-muted-foreground text-sm mt-1 capitalize">
            {format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR })}
          </p>
        </div>
        <Avatar className="w-12 h-12">
          <AvatarImage src={profile?.avatar_url ?? undefined} />
          <AvatarFallback className="text-lg">
            {getInitials(profile?.full_name || 'U')}
          </AvatarFallback>
        </Avatar>
      </div>

      {/* Financial Summary */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">Finanças do mês</h2>
          <Link to="/financas" className="text-xs text-primary flex items-center gap-1 hover:underline">
            Ver tudo <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {txLoading ? (
          <div className="grid grid-cols-3 gap-3">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            <Card className="bg-emerald-50 dark:bg-emerald-950/30 border-emerald-100 dark:border-emerald-900">
              <CardContent className="p-4">
                <TrendingUp className="w-5 h-5 text-emerald-600 mb-2" />
                <p className="text-xs text-emerald-600 font-medium">Receitas</p>
                <p className="text-base font-bold text-emerald-700 truncate">
                  {formatCurrency(totalIncome)}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-rose-50 dark:bg-rose-950/30 border-rose-100 dark:border-rose-900">
              <CardContent className="p-4">
                <TrendingDown className="w-5 h-5 text-rose-600 mb-2" />
                <p className="text-xs text-rose-600 font-medium">Gastos</p>
                <p className="text-base font-bold text-rose-700 truncate">
                  {formatCurrency(totalExpense)}
                </p>
              </CardContent>
            </Card>

            <Card className={balance >= 0 ? 'bg-blue-50 dark:bg-blue-950/30 border-blue-100 dark:border-blue-900' : 'bg-amber-50 dark:bg-amber-950/30'}>
              <CardContent className="p-4">
                <Wallet className="w-5 h-5 text-blue-600 mb-2" />
                <p className="text-xs text-blue-600 font-medium">Saldo</p>
                <p className={`text-base font-bold truncate ${balance >= 0 ? 'text-blue-700' : 'text-amber-700'}`}>
                  {formatCurrency(balance)}
                </p>
              </CardContent>
            </Card>
          </div>
        )}
      </section>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        {/* Shopping */}
        <Link to="/compras">
          <Card className="hover:border-primary/50 transition-colors cursor-pointer">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">Lista de Compras</CardTitle>
                <ShoppingCart className="w-4 h-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              {shopLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <>
                  <p className="text-2xl font-bold">{pendingItems}</p>
                  <p className="text-xs text-muted-foreground">
                    {pendingItems === 0 ? 'Lista completa!' : `itens pendentes`}
                    {checkedItems > 0 && ` · ${checkedItems} ok`}
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </Link>

        {/* Workouts */}
        <Link to="/treinos">
          <Card className="hover:border-primary/50 transition-colors cursor-pointer">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">Treinos</CardTitle>
                <Dumbbell className="w-4 h-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{workoutsThisWeek}</p>
              <p className="text-xs text-muted-foreground">treinos esta semana</p>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Savings Goals */}
      {goals && goals.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">Metas de economia</h2>
            <Link to="/financas/metas" className="text-xs text-primary flex items-center gap-1 hover:underline">
              Ver todas <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="space-y-3">
            {goals.map((goal) => {
              const percent = Math.min(100, Math.round((goal.current_amount / goal.target_amount) * 100))
              return (
                <Card key={goal.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-medium text-sm">{goal.name}</p>
                      <Badge variant="secondary">{percent}%</Badge>
                    </div>
                    <Progress value={percent} className="h-2 mb-2" />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{formatCurrency(goal.current_amount)}</span>
                      <span>{formatCurrency(goal.target_amount)}</span>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </section>
      )}

      {/* Household info */}
      {household && (
        <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
              <span className="text-lg">🏠</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm">{household.name}</p>
              <p className="text-xs text-muted-foreground">
                Código: <span className="font-mono font-bold">{household.invite_code}</span>
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
