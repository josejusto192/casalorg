import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ShoppingCart, Plus, Check, Trash2, Loader2, RefreshCw } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/auth.store'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import type { ShoppingItem } from '@/types/database'

const CATEGORIES = [
  { value: 'hortifruti', label: 'Hortifruti', emoji: '🥬' },
  { value: 'carnes', label: 'Carnes', emoji: '🥩' },
  { value: 'laticinios', label: 'Laticínios', emoji: '🧀' },
  { value: 'padaria', label: 'Padaria', emoji: '🍞' },
  { value: 'bebidas', label: 'Bebidas', emoji: '🥤' },
  { value: 'limpeza', label: 'Limpeza', emoji: '🧹' },
  { value: 'higiene', label: 'Higiene', emoji: '🪥' },
  { value: 'congelados', label: 'Congelados', emoji: '❄️' },
  { value: 'outros', label: 'Outros', emoji: '📦' },
]

const getCategoryInfo = (value: string) =>
  CATEGORIES.find((c) => c.value === value) ?? { value, label: value, emoji: '📦' }

export default function ShoppingPage() {
  const { household, user } = useAuthStore()
  const qc = useQueryClient()
  const { toast } = useToast()
  const [newItemName, setNewItemName] = useState('')
  const [newItemCategory, setNewItemCategory] = useState('outros')
  const [newItemQty, setNewItemQty] = useState('1')
  const [activeListId, setActiveListId] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)

  // Active list
  const { data: activeList, isLoading: listLoading } = useQuery({
    queryKey: ['shopping-list', 'active', household?.id],
    enabled: !!household?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from('shopping_lists')
        .select('*')
        .eq('household_id', household!.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      return data
    },
  })

  useEffect(() => {
    setActiveListId(activeList?.id ?? null)
  }, [activeList])

  // Items
  const { data: items = [], isLoading: itemsLoading } = useQuery({
    queryKey: ['shopping-items', activeListId],
    enabled: !!activeListId,
    queryFn: async () => {
      const { data } = await supabase
        .from('shopping_items')
        .select('*')
        .eq('list_id', activeListId!)
        .order('created_at', { ascending: true })
      return (data ?? []) as ShoppingItem[]
    },
  })

  // Realtime subscription
  useEffect(() => {
    if (!activeListId) return

    const channel = supabase
      .channel(`shopping-items-${activeListId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'shopping_items', filter: `list_id=eq.${activeListId}` },
        () => {
          qc.invalidateQueries({ queryKey: ['shopping-items', activeListId] })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [activeListId, qc])

  // Create list
  const createList = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from('shopping_lists')
        .insert({
          household_id: household!.id,
          created_by: user!.id,
          name: 'Lista de Compras',
          is_active: true,
        })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      setActiveListId(data.id)
      qc.invalidateQueries({ queryKey: ['shopping-list'] })
      toast({ title: 'Nova lista criada!' })
    },
  })

  // Add item
  const addItem = useMutation({
    mutationFn: async () => {
      let listId = activeListId
      if (!listId) {
        const { data } = await supabase
          .from('shopping_lists')
          .insert({ household_id: household!.id, created_by: user!.id, name: 'Lista de Compras', is_active: true })
          .select()
          .single()
        listId = data?.id ?? null
        if (listId) setActiveListId(listId)
      }
      if (!listId) throw new Error('Erro ao criar lista')

      const { error } = await supabase.from('shopping_items').insert({
        list_id: listId,
        household_id: household!.id,
        name: newItemName.trim(),
        quantity: parseFloat(newItemQty) || 1,
        category: newItemCategory,
        added_by: user!.id,
        checked: false,
      })
      if (error) throw error
    },
    onSuccess: () => {
      setNewItemName('')
      setNewItemQty('1')
      qc.invalidateQueries({ queryKey: ['shopping-items', activeListId] })
      qc.invalidateQueries({ queryKey: ['shopping-list'] })
    },
    onError: () => toast({ title: 'Erro ao adicionar item', variant: 'destructive' }),
  })

  // Toggle item
  const toggleItem = useMutation({
    mutationFn: async ({ id, checked }: { id: string; checked: boolean }) => {
      await supabase
        .from('shopping_items')
        .update({
          checked,
          checked_by: checked ? user!.id : null,
          checked_at: checked ? new Date().toISOString() : null,
        })
        .eq('id', id)
    },
    onMutate: async ({ id, checked }) => {
      await qc.cancelQueries({ queryKey: ['shopping-items', activeListId] })
      const prev = qc.getQueryData<ShoppingItem[]>(['shopping-items', activeListId])
      qc.setQueryData<ShoppingItem[]>(['shopping-items', activeListId], (old = []) =>
        old.map((item) => (item.id === id ? { ...item, checked } : item))
      )
      return { prev }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(['shopping-items', activeListId], ctx.prev)
    },
  })

  // Delete item
  const deleteItem = useMutation({
    mutationFn: async (id: string) => { await supabase.from('shopping_items').delete().eq('id', id) },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['shopping-items', activeListId] }),
  })

  // Complete list
  const completeList = useMutation({
    mutationFn: async () => {
      await supabase
        .from('shopping_lists')
        .update({ is_active: false, completed_at: new Date().toISOString() })
        .eq('id', activeListId!)
    },
    onSuccess: () => {
      setActiveListId(null)
      qc.invalidateQueries({ queryKey: ['shopping-list'] })
      toast({ title: 'Lista concluída! Nova lista criada.' })
    },
  })

  const pending = items.filter((i) => !i.checked)
  const checked = items.filter((i) => i.checked)
  const byCategory = CATEGORIES.map((cat) => ({
    ...cat,
    items: pending.filter((i) => i.category === cat.value),
  })).filter((c) => c.items.length > 0)

  function handleAddItem(e: React.FormEvent) {
    e.preventDefault()
    if (!newItemName.trim()) return
    addItem.mutate()
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        icon={ShoppingCart}
        title="Lista de Compras"
        description="Colaborativa em tempo real"
        action={
          activeList && (
            <Button size="sm" variant="outline" onClick={() => completeList.mutate()}>
              <RefreshCw className="w-4 h-4" />
              Nova lista
            </Button>
          )
        }
      />

      {/* Add Item Form */}
      <form onSubmit={handleAddItem} className="space-y-3">
        <div className="flex gap-2">
          <Input
            placeholder="Adicionar item..."
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            className="flex-1"
          />
          <Button type="button" variant="ghost" size="icon" onClick={() => setShowAddForm(!showAddForm)}>
            <Plus className="w-5 h-5" />
          </Button>
        </div>

        {showAddForm && (
          <div className="flex gap-2 items-center">
            <Input
              type="number"
              min="0.1"
              step="0.1"
              value={newItemQty}
              onChange={(e) => setNewItemQty(e.target.value)}
              className="w-24"
              placeholder="Qtd"
            />
            <Select value={newItemCategory} onValueChange={setNewItemCategory}>
              <SelectTrigger className="flex-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.emoji} {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {newItemName.trim() && (
          <Button type="submit" className="w-full" disabled={addItem.isPending}>
            {addItem.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Adicionar
          </Button>
        )}
      </form>

      {/* Stats */}
      {items.length > 0 && (
        <div className="flex items-center gap-3 text-sm">
          <Badge variant="secondary">{pending.length} pendentes</Badge>
          <Badge variant="success">{checked.length} ok</Badge>
          {checked.length > 0 && (
            <span className="text-xs text-muted-foreground ml-auto">
              {Math.round((checked.length / items.length) * 100)}% completo
            </span>
          )}
        </div>
      )}

      {(listLoading || itemsLoading) && (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => <div key={i} className="h-14 bg-muted rounded-xl animate-pulse" />)}
        </div>
      )}

      {!listLoading && !activeList && items.length === 0 && (
        <EmptyState
          icon={ShoppingCart}
          title="Sem lista ativa"
          description="Crie uma lista e adicione itens para começar."
          action={{ label: 'Criar lista', onClick: () => createList.mutate() }}
        />
      )}

      {/* Items by Category */}
      {byCategory.map((cat) => (
        <div key={cat.value}>
          <div className="flex items-center gap-2 mb-2">
            <span>{cat.emoji}</span>
            <span className="text-sm font-medium text-muted-foreground">{cat.label}</span>
            <Badge variant="secondary" className="text-xs">{cat.items.length}</Badge>
          </div>
          <div className="space-y-1">
            {cat.items.map((item) => (
              <ShoppingItemRow
                key={item.id}
                item={item}
                onToggle={(checked) => toggleItem.mutate({ id: item.id, checked })}
                onDelete={() => deleteItem.mutate(item.id)}
              />
            ))}
          </div>
        </div>
      ))}

      {/* Checked items */}
      {checked.length > 0 && (
        <>
          <Separator />
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Check className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">Comprados</span>
            </div>
            <div className="space-y-1 opacity-60">
              {checked.map((item) => (
                <ShoppingItemRow
                  key={item.id}
                  item={item}
                  onToggle={(c) => toggleItem.mutate({ id: item.id, checked: c })}
                  onDelete={() => deleteItem.mutate(item.id)}
                />
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function ShoppingItemRow({
  item,
  onToggle,
  onDelete,
}: {
  item: ShoppingItem
  onToggle: (checked: boolean) => void
  onDelete: () => void
}) {
  const cat = getCategoryInfo(item.category)

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-card border hover:border-primary/30 transition-colors">
      <Checkbox
        checked={item.checked}
        onCheckedChange={(v) => onToggle(Boolean(v))}
      />
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${item.checked ? 'line-through text-muted-foreground' : ''}`}>
          {item.name}
        </p>
        {item.quantity !== 1 && (
          <p className="text-xs text-muted-foreground">
            {item.quantity} {item.unit ?? ''}
          </p>
        )}
      </div>
      <span className="text-xs text-muted-foreground">{cat.emoji}</span>
      <button
        onClick={onDelete}
        className="text-muted-foreground hover:text-destructive transition-colors ml-1"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}
