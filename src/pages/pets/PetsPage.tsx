import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format, differenceInYears } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { PawPrint, Plus, Trash2, Loader2, ChevronRight } from 'lucide-react'
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
import type { Pet, PetEvent } from '@/types/database'

const SPECIES_EMOJI: Record<string, string> = {
  dog: '🐕',
  cat: '🐈',
  bird: '🐦',
  fish: '🐟',
  rabbit: '🐇',
  other: '🐾',
}

const EVENT_TYPE_EMOJI: Record<string, string> = {
  vet: '🏥',
  vaccine: '💉',
  grooming: '✂️',
  medication: '💊',
  other: '📅',
}

export default function PetsPage() {
  const { household } = useAuthStore()
  const qc = useQueryClient()
  const { toast } = useToast()
  const [petDialogOpen, setPetDialogOpen] = useState(false)
  const [selectedPetId, setSelectedPetId] = useState<string | null>(null)

  const { data: pets = [], isLoading } = useQuery({
    queryKey: ['pets', household?.id],
    enabled: !!household?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from('pets')
        .select('*')
        .eq('household_id', household!.id)
        .order('name')
      return (data ?? []) as Pet[]
    },
  })

  const deletePet = useMutation({
    mutationFn: async (id: string) => { await supabase.from('pets').delete().eq('id', id) },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pets'] })
      toast({ title: 'Pet removido' })
    },
  })

  const selectedPet = pets.find((p) => p.id === selectedPetId)

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        icon={PawPrint}
        title="Pets"
        description="Cuidados e agenda dos bichinhos"
        action={
          <Dialog open={petDialogOpen} onOpenChange={setPetDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="w-4 h-4" />
                Adicionar pet
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Adicionar pet</DialogTitle>
              </DialogHeader>
              <PetForm
                householdId={household!.id}
                onSuccess={() => {
                  setPetDialogOpen(false)
                  qc.invalidateQueries({ queryKey: ['pets'] })
                  toast({ title: 'Pet adicionado!' })
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

      {!isLoading && pets.length === 0 && (
        <EmptyState
          icon={PawPrint}
          title="Nenhum pet cadastrado"
          description="Adicione seus animais de estimação para acompanhar saúde e agenda."
          action={{ label: 'Adicionar pet', onClick: () => setPetDialogOpen(true) }}
        />
      )}

      {pets.length > 0 && !selectedPetId && (
        <div className="space-y-3">
          {pets.map((pet) => {
            const age = pet.birth_date ? differenceInYears(new Date(), new Date(pet.birth_date)) : null
            const emoji = SPECIES_EMOJI[pet.species] ?? '🐾'
            return (
              <Card
                key={pet.id}
                className="cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => setSelectedPetId(pet.id)}
              >
                <CardContent className="p-4 flex items-center gap-3">
                  <Avatar className="w-12 h-12">
                    <AvatarFallback className="text-2xl bg-amber-100">{emoji}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold">{pet.name}</p>
                    <div className="flex gap-2 mt-0.5">
                      {pet.breed && <span className="text-xs text-muted-foreground">{pet.breed}</span>}
                      {age !== null && <span className="text-xs text-muted-foreground">{age} anos</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); deletePet.mutate(pet.id) }}
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

      {selectedPet && (
        <PetDetail pet={selectedPet} onBack={() => setSelectedPetId(null)} />
      )}
    </div>
  )
}

function PetDetail({ pet, onBack }: { pet: Pet; onBack: () => void }) {
  const qc = useQueryClient()
  const { toast } = useToast()
  const [eventDialogOpen, setEventDialogOpen] = useState(false)
  const emoji = SPECIES_EMOJI[pet.species] ?? '🐾'
  const age = pet.birth_date ? differenceInYears(new Date(), new Date(pet.birth_date)) : null

  const { data: events = [] } = useQuery({
    queryKey: ['pet-events', pet.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('pet_events')
        .select('*')
        .eq('pet_id', pet.id)
        .order('date', { ascending: true })
      return (data ?? []) as PetEvent[]
    },
  })

  const deleteEvent = useMutation({
    mutationFn: async (id: string) => { await supabase.from('pet_events').delete().eq('id', id) },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pet-events', pet.id] }),
  })

  const upcomingEvents = events.filter((e) => new Date(e.date) >= new Date())
  const pastEvents = events.filter((e) => new Date(e.date) < new Date())

  return (
    <div className="space-y-4 animate-fade-in">
      <button onClick={onBack} className="text-muted-foreground hover:text-foreground transition-colors text-sm">
        ← Voltar
      </button>

      <Card className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border-amber-100">
        <CardContent className="p-5">
          <div className="flex items-center gap-4">
            <Avatar className="w-16 h-16">
              <AvatarFallback className="text-3xl bg-amber-100">{emoji}</AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-xl font-bold">{pet.name}</h2>
              {pet.breed && <p className="text-sm text-muted-foreground">{pet.breed}</p>}
              {age !== null && <p className="text-sm text-muted-foreground">{age} anos</p>}
              {pet.birth_date && (
                <p className="text-xs text-muted-foreground">
                  Nascimento: {format(new Date(pet.birth_date + 'T12:00:00'), "d 'de' MMM yyyy", { locale: ptBR })}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Agenda</h3>
        <Dialog open={eventDialogOpen} onOpenChange={setEventDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline">
              <Plus className="w-4 h-4" />
              Adicionar
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Novo evento para {pet.name}</DialogTitle>
            </DialogHeader>
            <PetEventForm
              petId={pet.id}
              householdId={pet.household_id}
              onSuccess={() => {
                setEventDialogOpen(false)
                qc.invalidateQueries({ queryKey: ['pet-events', pet.id] })
                toast({ title: 'Evento adicionado!' })
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
            <p className="text-sm text-muted-foreground text-center py-8">Nenhum evento futuro</p>
          ) : (
            upcomingEvents.map((ev) => (
              <Card key={ev.id}>
                <CardContent className="p-4 flex gap-3 items-start">
                  <span className="text-xl">{EVENT_TYPE_EMOJI[ev.type]}</span>
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
                <span className="text-xl">{EVENT_TYPE_EMOJI[ev.type]}</span>
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

function PetForm({ householdId, onSuccess }: { householdId: string; onSuccess: () => void }) {
  const [name, setName] = useState('')
  const [species, setSpecies] = useState('dog')
  const [breed, setBreed] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      await supabase.from('pets').insert({
        household_id: householdId,
        name,
        species,
        breed: breed || null,
        birth_date: birthDate || null,
      })
      onSuccess()
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Nome do pet</Label>
        <Input placeholder="Como ele(a) se chama?" value={name} onChange={(e) => setName(e.target.value)} required />
      </div>
      <div className="space-y-2">
        <Label>Espécie</Label>
        <Select value={species} onValueChange={setSpecies}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="dog">🐕 Cachorro</SelectItem>
            <SelectItem value="cat">🐈 Gato</SelectItem>
            <SelectItem value="bird">🐦 Pássaro</SelectItem>
            <SelectItem value="fish">🐟 Peixe</SelectItem>
            <SelectItem value="rabbit">🐇 Coelho</SelectItem>
            <SelectItem value="other">🐾 Outro</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Raça (opcional)</Label>
        <Input placeholder="Ex: Labrador" value={breed} onChange={(e) => setBreed(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>Data de nascimento (opcional)</Label>
        <Input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} />
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
        Salvar
      </Button>
    </form>
  )
}

function PetEventForm({ petId, householdId, onSuccess }: { petId: string; householdId: string; onSuccess: () => void }) {
  const [title, setTitle] = useState('')
  const [type, setType] = useState<'vet' | 'vaccine' | 'grooming' | 'medication' | 'other'>('vet')
  const [date, setDate] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      await supabase.from('pet_events').insert({ pet_id: petId, household_id: householdId, title, type, date, notes: notes || null })
      onSuccess()
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Título</Label>
        <Input placeholder="Ex: Consulta veterinária" value={title} onChange={(e) => setTitle(e.target.value)} required />
      </div>
      <div className="space-y-2">
        <Label>Tipo</Label>
        <Select value={type} onValueChange={(v) => setType(v as typeof type)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="vet">🏥 Veterinário</SelectItem>
            <SelectItem value="vaccine">💉 Vacina</SelectItem>
            <SelectItem value="grooming">✂️ Banho/Tosa</SelectItem>
            <SelectItem value="medication">💊 Medicamento</SelectItem>
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
