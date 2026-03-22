import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format, startOfMonth, endOfMonth, subMonths, addMonths } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  Wallet,
  Plus,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Target,
  Loader2,
  Trash2,
} from 'lucide-react'
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
} from 'recharts'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/auth.store'
import { formatCurrency, formatDate } from '@/lib/utils'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { useToast } from '@/hooks/use-toast'
import type { Transaction, TransactionCategory } from '@/types/database'

export default function FinancesPage() {
  const { household, user } = useAuthStore()
  const qc = useQueryClient()
  const { toast } = useToast()
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [txDialogOpen, setTxDialogOpen] = useState(false)
  const [goalDialogOpen, setGoalDialogOpen] = useState(false)

  const monthStart = format(startOfMonth(currentMonth), 'yyyy-MM-dd')
  const monthEnd = format(endOfMonth(currentMonth), 'yyyy-MM-dd')

  // Queries
  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ['transactions', household?.id, monthStart],
    enabled: !!household?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from('transactions')
        .select('*, transaction_categories(name, color, icon)')
        .eq('household_id', household!.id)
        .gte('date', monthStart)
        .lte('date', monthEnd)
        .order('date', { ascending: false })
      return (data ?? []) as unknown as (Transaction & { transaction_categories: TransactionCategory | null })[]
    },
  })

  const { data: categories = [] } = useQuery({
    queryKey: ['categories', household?.id],
    enabled: !!household?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from('transaction_categories')
        .select('*')
        .eq('household_id', household!.id)
        .order('name')
      return data ?? []
    },
  })

  const { data: goals = [] } = useQuery({
    queryKey: ['savings-goals', household?.id],
    enabled: !!household?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from('savings_goals')
        .select('*')
        .eq('household_id', household!.id)
        .order('created_at', { ascending: false })
      return data ?? []
    },
  })

  // Computed
  const income = transactions.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const expense = transactions.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
  const balance = income - expense

  const expenseByCategory = categories
    .map((cat) => ({
      name: cat.name,
      color: cat.color,
      value: transactions
        .filter((t) => t.type === 'expense' && t.category_id === cat.id)
        .reduce((s, t) => s + t.amount, 0),
    }))
    .filter((c) => c.value > 0)

  // Mutations
  const deleteTx = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from('transactions').delete().eq('id', id)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transactions'] })
      toast({ title: 'Transação removida' })
    },
  })

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        icon={Wallet}
        title="Finanças"
        description="Controle financeiro do casal"
        action={
          <Dialog open={txDialogOpen} onOpenChange={setTxDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="w-4 h-4" />
                Nova transação
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nova transação</DialogTitle>
              </DialogHeader>
              <TransactionForm
                categories={categories}
                householdId={household!.id}
                userId={user!.id}
                onSuccess={() => {
                  setTxDialogOpen(false)
                  qc.invalidateQueries({ queryKey: ['transactions'] })
                  toast({ title: 'Transação adicionada!' })
                }}
              />
            </DialogContent>
          </Dialog>
        }
      />

      {/* Month Selector */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="icon-sm" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <span className="font-semibold capitalize">
          {format(currentMonth, "MMMM 'de' yyyy", { locale: ptBR })}
        </span>
        <Button variant="ghost" size="icon-sm" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="bg-emerald-50 dark:bg-emerald-950/20 border-emerald-100">
          <CardContent className="p-4">
            <TrendingUp className="w-4 h-4 text-emerald-600 mb-1" />
            <p className="text-xs text-emerald-600 font-medium">Receitas</p>
            <p className="text-lg font-bold text-emerald-700">{formatCurrency(income)}</p>
          </CardContent>
        </Card>
        <Card className="bg-rose-50 dark:bg-rose-950/20 border-rose-100">
          <CardContent className="p-4">
            <TrendingDown className="w-4 h-4 text-rose-600 mb-1" />
            <p className="text-xs text-rose-600 font-medium">Gastos</p>
            <p className="text-lg font-bold text-rose-700">{formatCurrency(expense)}</p>
          </CardContent>
        </Card>
        <Card className={balance >= 0 ? 'bg-blue-50 dark:bg-blue-950/20 border-blue-100' : 'bg-amber-50 border-amber-100'}>
          <CardContent className="p-4">
            <Wallet className="w-4 h-4 text-blue-600 mb-1" />
            <p className="text-xs text-blue-600 font-medium">Saldo</p>
            <p className={`text-lg font-bold ${balance >= 0 ? 'text-blue-700' : 'text-amber-700'}`}>
              {formatCurrency(balance)}
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="transactions">
        <TabsList className="w-full">
          <TabsTrigger value="transactions" className="flex-1">Transações</TabsTrigger>
          <TabsTrigger value="charts" className="flex-1">Gráficos</TabsTrigger>
          <TabsTrigger value="goals" className="flex-1">Metas</TabsTrigger>
        </TabsList>

        {/* Transactions */}
        <TabsContent value="transactions" className="space-y-2 mt-4">
          {isLoading && (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-muted rounded-xl animate-pulse" />
              ))}
            </div>
          )}

          {!isLoading && transactions.length === 0 && (
            <EmptyState
              icon={Wallet}
              title="Nenhuma transação"
              description="Adicione sua primeira receita ou despesa do mês."
              action={{ label: 'Adicionar transação', onClick: () => setTxDialogOpen(true) }}
            />
          )}

          {transactions.map((tx) => (
            <Card key={tx.id}>
              <CardContent className="p-4 flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ backgroundColor: `${tx.transaction_categories?.color ?? '#6366f1'}20` }}
                >
                  <span className="text-lg">
                    {tx.type === 'income' ? '↑' : '↓'}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{tx.title}</p>
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-muted-foreground">{formatDate(tx.date, 'short')}</p>
                    {tx.transaction_categories && (
                      <Badge variant="outline" className="text-xs py-0">
                        {tx.transaction_categories.name}
                      </Badge>
                    )}
                    {tx.scope === 'personal' && (
                      <Badge variant="secondary" className="text-xs py-0">pessoal</Badge>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`font-bold text-sm ${tx.type === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                  </span>
                  <button
                    onClick={() => deleteTx.mutate(tx.id)}
                    className="text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Charts */}
        <TabsContent value="charts" className="mt-4 space-y-4">
          {expenseByCategory.length > 0 ? (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Gastos por categoria</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={expenseByCategory}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={85}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {expenseByCategory.map((entry, index) => (
                          <Cell key={index} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: number) => formatCurrency(v)} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-2 mt-4">
                    {expenseByCategory.map((cat) => (
                      <div key={cat.name} className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                        <span className="text-sm flex-1">{cat.name}</span>
                        <span className="text-sm font-medium">{formatCurrency(cat.value)}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Comparativo</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={150}>
                    <BarChart data={[{ name: 'Mês', Receitas: income, Gastos: expense }]}>
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                      <Tooltip formatter={(v: number) => formatCurrency(v)} />
                      <Bar dataKey="Receitas" fill="#22c55e" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Gastos" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </>
          ) : (
            <EmptyState
              icon={TrendingUp}
              title="Sem dados para mostrar"
              description="Adicione transações para ver os gráficos."
            />
          )}
        </TabsContent>

        {/* Goals */}
        <TabsContent value="goals" className="mt-4 space-y-4">
          <div className="flex justify-end">
            <Dialog open={goalDialogOpen} onOpenChange={setGoalDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline">
                  <Plus className="w-4 h-4" />
                  Nova meta
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Nova meta de economia</DialogTitle>
                </DialogHeader>
                <GoalForm
                  householdId={household!.id}
                  onSuccess={() => {
                    setGoalDialogOpen(false)
                    qc.invalidateQueries({ queryKey: ['savings-goals'] })
                    toast({ title: 'Meta criada!' })
                  }}
                />
              </DialogContent>
            </Dialog>
          </div>

          {goals.length === 0 ? (
            <EmptyState
              icon={Target}
              title="Nenhuma meta"
              description="Crie metas de economia para o casal."
              action={{ label: 'Criar meta', onClick: () => setGoalDialogOpen(true) }}
            />
          ) : (
            goals.map((goal) => {
              const percent = Math.min(100, Math.round((goal.current_amount / goal.target_amount) * 100))
              return (
                <Card key={goal.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <p className="font-semibold">{goal.name}</p>
                      <Badge style={{ backgroundColor: `${goal.color}20`, color: goal.color }}>
                        {percent}%
                      </Badge>
                    </div>
                    <Progress value={percent} className="mb-3" />
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        {formatCurrency(goal.current_amount)} poupado
                      </span>
                      <span className="font-medium">Meta: {formatCurrency(goal.target_amount)}</span>
                    </div>
                    {goal.deadline && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Prazo: {formatDate(goal.deadline)}
                      </p>
                    )}
                  </CardContent>
                </Card>
              )
            })
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

// ──────────────────────────────────────────────
// Transaction Form
// ──────────────────────────────────────────────
function TransactionForm({
  categories,
  householdId,
  userId,
  onSuccess,
}: {
  categories: TransactionCategory[]
  householdId: string
  userId: string
  onSuccess: () => void
}) {
  const [title, setTitle] = useState('')
  const [amount, setAmount] = useState('')
  const [type, setType] = useState<'income' | 'expense'>('expense')
  const [scope, setScope] = useState<'shared' | 'personal'>('shared')
  const [categoryId, setCategoryId] = useState('')
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [loading, setLoading] = useState(false)

  const filteredCategories = categories.filter((c) => c.type === type)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const { error } = await supabase.from('transactions').insert({
        household_id: householdId,
        user_id: userId,
        title,
        amount: parseFloat(amount),
        type,
        scope,
        category_id: categoryId || null,
        date,
      })
      if (error) throw error
      onSuccess()
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setType('expense')}
          className={`py-2 rounded-lg text-sm font-medium border transition-colors ${type === 'expense' ? 'bg-rose-50 border-rose-300 text-rose-700' : 'border-input'}`}
        >
          Despesa
        </button>
        <button
          type="button"
          onClick={() => setType('income')}
          className={`py-2 rounded-lg text-sm font-medium border transition-colors ${type === 'income' ? 'bg-emerald-50 border-emerald-300 text-emerald-700' : 'border-input'}`}
        >
          Receita
        </button>
      </div>

      <div className="space-y-2">
        <Label>Descrição</Label>
        <Input placeholder="Ex: Supermercado" value={title} onChange={(e) => setTitle(e.target.value)} required />
      </div>

      <div className="space-y-2">
        <Label>Valor (R$)</Label>
        <Input type="number" step="0.01" min="0.01" placeholder="0,00" value={amount} onChange={(e) => setAmount(e.target.value)} required />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Data</Label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        </div>

        <div className="space-y-2">
          <Label>Tipo</Label>
          <Select value={scope} onValueChange={(v) => setScope(v as 'shared' | 'personal')}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="shared">Compartilhado</SelectItem>
              <SelectItem value="personal">Pessoal</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {filteredCategories.length > 0 && (
        <div className="space-y-2">
          <Label>Categoria</Label>
          <Select value={categoryId} onValueChange={setCategoryId}>
            <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
            <SelectContent>
              {filteredCategories.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <Button type="submit" className="w-full" disabled={loading}>
        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
        Adicionar
      </Button>
    </form>
  )
}

// ──────────────────────────────────────────────
// Goal Form
// ──────────────────────────────────────────────
function GoalForm({ householdId, onSuccess }: { householdId: string; onSuccess: () => void }) {
  const [name, setName] = useState('')
  const [targetAmount, setTargetAmount] = useState('')
  const [currentAmount, setCurrentAmount] = useState('')
  const [deadline, setDeadline] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const { error } = await supabase.from('savings_goals').insert({
        household_id: householdId,
        name,
        target_amount: parseFloat(targetAmount),
        current_amount: parseFloat(currentAmount) || 0,
        deadline: deadline || null,
      })
      if (error) throw error
      onSuccess()
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Nome da meta</Label>
        <Input placeholder="Ex: Viagem de férias" value={name} onChange={(e) => setName(e.target.value)} required />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Valor alvo</Label>
          <Input type="number" step="0.01" min="1" placeholder="R$ 0,00" value={targetAmount} onChange={(e) => setTargetAmount(e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label>Já poupado</Label>
          <Input type="number" step="0.01" min="0" placeholder="R$ 0,00" value={currentAmount} onChange={(e) => setCurrentAmount(e.target.value)} />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Prazo (opcional)</Label>
        <Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
        Criar meta
      </Button>
    </form>
  )
}
