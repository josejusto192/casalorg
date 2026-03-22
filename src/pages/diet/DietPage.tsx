import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format, startOfWeek, addDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Salad, Plus, ChefHat, Loader2, Trash2, ShoppingCart } from 'lucide-react'
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import type { Recipe, MealPlan, MealPlanEntry } from '@/types/database'

const MEAL_TYPES = [
  { value: 'breakfast', label: 'Café da manhã', emoji: '☀️' },
  { value: 'lunch', label: 'Almoço', emoji: '🍽️' },
  { value: 'dinner', label: 'Jantar', emoji: '🌙' },
  { value: 'snack', label: 'Lanche', emoji: '🍎' },
] as const

const WEEK_DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

export default function DietPage() {
  const { household, user } = useAuthStore()
  const qc = useQueryClient()
  const { toast } = useToast()
  const weekStart = format(startOfWeek(new Date()), 'yyyy-MM-dd')
  const [recipeDialogOpen, setRecipeDialogOpen] = useState(false)
  const [planEntryDialogOpen, setPlanEntryDialogOpen] = useState(false)
  const [selectedDay, setSelectedDay] = useState(0)
  const [selectedMealType, setSelectedMealType] = useState<'breakfast' | 'lunch' | 'dinner' | 'snack'>('lunch')

  const { data: recipes = [], isLoading: recipesLoading } = useQuery({
    queryKey: ['recipes', household?.id],
    enabled: !!household?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from('recipes')
        .select('*')
        .eq('household_id', household!.id)
        .order('name')
      return (data ?? []) as Recipe[]
    },
  })

  const { data: currentPlan } = useQuery({
    queryKey: ['meal-plan', household?.id, weekStart],
    enabled: !!household?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from('meal_plans')
        .select('*')
        .eq('household_id', household!.id)
        .eq('week_start', weekStart)
        .maybeSingle()
      return data as MealPlan | null
    },
  })

  const { data: planEntries = [] } = useQuery({
    queryKey: ['meal-plan-entries', currentPlan?.id],
    enabled: !!currentPlan?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from('meal_plan_entries')
        .select('*, recipes(name, calories)')
        .eq('plan_id', currentPlan!.id)
      return (data ?? []) as unknown as (MealPlanEntry & { recipes: { name: string; calories: number | null } | null })[]
    },
  })


  const addEntry = useMutation({
    mutationFn: async ({ recipeId, customName }: { recipeId?: string; customName?: string }) => {
      let planId = currentPlan?.id
      if (!planId) {
        const { data } = await supabase
          .from('meal_plans')
          .insert({ household_id: household!.id, week_start: weekStart, created_by: user!.id })
          .select()
          .single()
        planId = data?.id
        qc.invalidateQueries({ queryKey: ['meal-plan'] })
      }
      if (!planId) throw new Error('Erro ao criar plano')
      await supabase.from('meal_plan_entries').insert({
        plan_id: planId,
        recipe_id: recipeId ?? null,
        custom_name: customName ?? null,
        day_of_week: selectedDay,
        meal_type: selectedMealType,
      })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['meal-plan-entries'] })
      setPlanEntryDialogOpen(false)
      toast({ title: 'Refeição adicionada!' })
    },
  })

  const deleteEntry = useMutation({
    mutationFn: async (id: string) => { await supabase.from('meal_plan_entries').delete().eq('id', id) },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['meal-plan-entries'] }),
  })

  const deleteRecipe = useMutation({
    mutationFn: async (id: string) => { await supabase.from('recipes').delete().eq('id', id) },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['recipes'] })
      toast({ title: 'Receita removida' })
    },
  })

  async function generateShoppingList() {
    if (!household || !user) return
    const ingredients: string[] = []
    for (const entry of planEntries) {
      if (entry.recipe_id && entry.recipes) {
        // Get full recipe ingredients
        const { data: recipe } = await supabase
          .from('recipes')
          .select('ingredients')
          .eq('id', entry.recipe_id)
          .single()
        if (recipe?.ingredients) {
          const ingrs = recipe.ingredients as Array<{ name: string; quantity?: string }>
          ingrs.forEach((i) => ingredients.push(i.name))
        }
      }
    }

    if (ingredients.length === 0) {
      toast({ title: 'Nenhum ingrediente', description: 'Adicione receitas com ingredientes ao plano.' })
      return
    }

    // Create shopping list
    const { data: list } = await supabase
      .from('shopping_lists')
      .insert({ household_id: household.id, created_by: user.id, name: 'Lista do Cardápio', is_active: true })
      .select()
      .single()

    if (list) {
      await supabase.from('shopping_items').insert(
        ingredients.map((name) => ({
          list_id: list.id,
          household_id: household.id,
          name,
          added_by: user.id,
          checked: false,
        }))
      )
      toast({ title: 'Lista de compras gerada!', description: `${ingredients.length} ingredientes adicionados.` })
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        icon={Salad}
        title="Dieta & Alimentação"
        description="Planejamento de refeições"
        action={
          <Dialog open={recipeDialogOpen} onOpenChange={setRecipeDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="w-4 h-4" />
                Receita
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Nova receita</DialogTitle>
              </DialogHeader>
              <RecipeForm
                householdId={household!.id}
                userId={user!.id}
                onSuccess={() => {
                  setRecipeDialogOpen(false)
                  qc.invalidateQueries({ queryKey: ['recipes'] })
                  toast({ title: 'Receita salva!' })
                }}
              />
            </DialogContent>
          </Dialog>
        }
      />

      <Tabs defaultValue="plan">
        <TabsList className="w-full">
          <TabsTrigger value="plan" className="flex-1">Cardápio</TabsTrigger>
          <TabsTrigger value="recipes" className="flex-1">Receitas</TabsTrigger>
        </TabsList>

        {/* Meal Plan */}
        <TabsContent value="plan" className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground font-medium">
              Semana de {format(new Date(weekStart), "d 'de' MMMM", { locale: ptBR })}
            </p>
            {planEntries.length > 0 && (
              <Button size="sm" variant="outline" onClick={generateShoppingList}>
                <ShoppingCart className="w-4 h-4" />
                Gerar lista
              </Button>
            )}
          </div>

          {/* Week grid */}
          <div className="space-y-3">
            {Array.from({ length: 7 }).map((_, dayIdx) => {
              const dayDate = addDays(new Date(weekStart), dayIdx)
              const dayEntries = planEntries.filter((e) => e.day_of_week === dayIdx)
              const isToday = format(dayDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')

              return (
                <Card key={dayIdx} className={isToday ? 'border-primary/50 bg-primary/5' : ''}>
                  <CardHeader className="py-3 px-4">
                    <div className="flex items-center justify-between">
                      <CardTitle className={`text-sm ${isToday ? 'text-primary' : ''}`}>
                        {WEEK_DAYS[dayIdx]}, {format(dayDate, 'd/MM')}
                        {isToday && <Badge className="ml-2 text-xs">hoje</Badge>}
                      </CardTitle>
                      <button
                        onClick={() => {
                          setSelectedDay(dayIdx)
                          setPlanEntryDialogOpen(true)
                        }}
                        className="text-muted-foreground hover:text-primary transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </CardHeader>
                  {dayEntries.length > 0 && (
                    <CardContent className="pt-0 px-4 pb-3 space-y-1.5">
                      {MEAL_TYPES.map((mealType) => {
                        const entry = dayEntries.find((e) => e.meal_type === mealType.value)
                        if (!entry) return null
                        return (
                          <div key={mealType.value} className="flex items-center gap-2 text-sm">
                            <span>{mealType.emoji}</span>
                            <span className="text-muted-foreground text-xs w-16 shrink-0">{mealType.label}</span>
                            <span className="flex-1 font-medium truncate">
                              {entry.recipes?.name ?? entry.custom_name ?? '—'}
                            </span>
                            {entry.recipes?.calories && (
                              <span className="text-xs text-muted-foreground">{entry.recipes.calories} kcal</span>
                            )}
                            <button
                              onClick={() => deleteEntry.mutate(entry.id)}
                              className="text-muted-foreground hover:text-destructive"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        )
                      })}
                    </CardContent>
                  )}
                </Card>
              )
            })}
          </div>

          {/* Add entry dialog */}
          <Dialog open={planEntryDialogOpen} onOpenChange={setPlanEntryDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  Adicionar refeição — {WEEK_DAYS[selectedDay]}
                </DialogTitle>
              </DialogHeader>
              <PlanEntryForm
                recipes={recipes}
                mealTypes={MEAL_TYPES}
                defaultMealType={selectedMealType}
                onMealTypeChange={setSelectedMealType}
                onSubmit={(recipeId, customName) => addEntry.mutate({ recipeId, customName })}
                isLoading={addEntry.isPending}
              />
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* Recipes */}
        <TabsContent value="recipes" className="mt-4 space-y-3">
          {recipesLoading && (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => <div key={i} className="h-20 bg-muted rounded-xl animate-pulse" />)}
            </div>
          )}

          {!recipesLoading && recipes.length === 0 && (
            <EmptyState
              icon={ChefHat}
              title="Nenhuma receita"
              description="Salve suas receitas favoritas aqui."
              action={{ label: 'Adicionar receita', onClick: () => setRecipeDialogOpen(true) }}
            />
          )}

          {recipes.map((recipe) => (
            <Card key={recipe.id}>
              <CardContent className="p-4 flex gap-3">
                <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
                  <ChefHat className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{recipe.name}</p>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {recipe.servings && (
                      <span className="text-xs text-muted-foreground">{recipe.servings} porções</span>
                    )}
                    {recipe.prep_time_min && (
                      <span className="text-xs text-muted-foreground">{recipe.prep_time_min} min</span>
                    )}
                    {recipe.calories && (
                      <Badge variant="secondary" className="text-xs">{recipe.calories} kcal</Badge>
                    )}
                  </div>
                  {recipe.description && (
                    <p className="text-xs text-muted-foreground mt-1 truncate">{recipe.description}</p>
                  )}
                </div>
                <button
                  onClick={() => deleteRecipe.mutate(recipe.id)}
                  className="text-muted-foreground hover:text-destructive transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  )
}

function RecipeForm({
  householdId,
  userId,
  onSuccess,
}: {
  householdId: string
  userId: string
  onSuccess: () => void
}) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [servings, setServings] = useState('2')
  const [prepTime, setPrepTime] = useState('')
  const [calories, setCalories] = useState('')
  const [ingredients, setIngredients] = useState('')
  const [instructions, setInstructions] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const parsedIngredients = ingredients
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .map((name) => ({ name }))

      await supabase.from('recipes').insert({
        household_id: householdId,
        created_by: userId,
        name,
        description: description || null,
        servings: parseInt(servings) || 2,
        prep_time_min: prepTime ? parseInt(prepTime) : null,
        calories: calories ? parseInt(calories) : null,
        ingredients: parsedIngredients,
        instructions: instructions || null,
      })
      onSuccess()
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Nome da receita</Label>
        <Input placeholder="Ex: Frango grelhado" value={name} onChange={(e) => setName(e.target.value)} required />
      </div>
      <div className="space-y-2">
        <Label>Descrição (opcional)</Label>
        <Input placeholder="Uma breve descrição..." value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-2">
          <Label>Porções</Label>
          <Input type="number" min="1" value={servings} onChange={(e) => setServings(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Tempo (min)</Label>
          <Input type="number" min="0" placeholder="30" value={prepTime} onChange={(e) => setPrepTime(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Calorias</Label>
          <Input type="number" min="0" placeholder="400" value={calories} onChange={(e) => setCalories(e.target.value)} />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Ingredientes (um por linha)</Label>
        <textarea
          className="w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          placeholder="Frango&#10;Azeite&#10;Alho"
          value={ingredients}
          onChange={(e) => setIngredients(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label>Modo de preparo (opcional)</Label>
        <textarea
          className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          placeholder="Descreva como preparar..."
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
        />
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
        Salvar receita
      </Button>
    </form>
  )
}

function PlanEntryForm({
  recipes,
  mealTypes,
  defaultMealType,
  onMealTypeChange,
  onSubmit,
  isLoading,
}: {
  recipes: Recipe[]
  mealTypes: readonly { value: string; label: string; emoji: string }[]
  defaultMealType: string
  onMealTypeChange: (v: 'breakfast' | 'lunch' | 'dinner' | 'snack') => void
  onSubmit: (recipeId?: string, customName?: string) => void
  isLoading: boolean
}) {
  const [mealType, setMealType] = useState(defaultMealType)
  const [recipeId, setRecipeId] = useState('')
  const [customName, setCustomName] = useState('')

  function handleMealTypeChange(v: string) {
    setMealType(v)
    onMealTypeChange(v as 'breakfast' | 'lunch' | 'dinner' | 'snack')
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Refeição</Label>
        <Select value={mealType} onValueChange={handleMealTypeChange}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {mealTypes.map((mt) => (
              <SelectItem key={mt.value} value={mt.value}>
                {mt.emoji} {mt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {recipes.length > 0 && (
        <div className="space-y-2">
          <Label>Receita (opcional)</Label>
          <Select value={recipeId} onValueChange={setRecipeId}>
            <SelectTrigger><SelectValue placeholder="Selecionar receita..." /></SelectTrigger>
            <SelectContent>
              {recipes.map((r) => (
                <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {!recipeId && (
        <div className="space-y-2">
          <Label>Ou escreva o nome</Label>
          <Input
            placeholder="Ex: Salada de frango"
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
          />
        </div>
      )}

      <Button
        className="w-full"
        disabled={isLoading || (!recipeId && !customName.trim())}
        onClick={() => onSubmit(recipeId || undefined, customName || undefined)}
      >
        {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
        Adicionar
      </Button>
    </div>
  )
}
