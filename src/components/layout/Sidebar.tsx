import { NavLink } from 'react-router-dom'
import {
  Heart,
  LayoutDashboard,
  Wallet,
  ShoppingCart,
  Salad,
  Dumbbell,
  Baby,
  PawPrint,
  Settings,
  LogOut,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/auth.store'
import { supabase } from '@/lib/supabase'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { getInitials } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'

const baseNavItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/financas', label: 'Finanças', icon: Wallet },
  { to: '/compras', label: 'Lista de Compras', icon: ShoppingCart },
  { to: '/dieta', label: 'Dieta & Alimentação', icon: Salad },
  { to: '/treinos', label: 'Treinos', icon: Dumbbell },
]

export default function Sidebar() {
  const { profile, household, reset } = useAuthStore()
  const { toast } = useToast()

  const navItems = [
    ...baseNavItems,
    ...(household?.has_children ? [{ to: '/filhos', label: 'Filhos', icon: Baby }] : []),
    ...(household?.has_pets ? [{ to: '/pets', label: 'Pets', icon: PawPrint }] : []),
  ]

  async function handleLogout() {
    await supabase.auth.signOut()
    reset()
    toast({ title: 'Até logo!', description: 'Você saiu da sua conta.' })
  }

  return (
    <aside className="hidden md:flex flex-col w-64 h-screen fixed left-0 top-0 border-r bg-card z-40">
      {/* Logo */}
      <div className="flex items-center gap-2.5 p-6 border-b">
        <Heart className="w-6 h-6 text-primary fill-primary" />
        <div>
          <span className="font-bold text-lg leading-none">Nós Dois</span>
          {household && (
            <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-[160px]">
              {household.name}
            </p>
          )}
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              )
            }
          >
            <Icon className="w-4.5 h-4.5 w-5 h-5 shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t p-3 space-y-1">
        <NavLink
          to="/configuracoes"
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
              isActive
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:bg-accent hover:text-foreground'
            )
          }
        >
          <Settings className="w-5 h-5" />
          Configurações
        </NavLink>

        {/* Profile */}
        <div className="flex items-center gap-3 px-3 py-2.5">
          <Avatar className="w-8 h-8">
            <AvatarImage src={profile?.avatar_url ?? undefined} />
            <AvatarFallback>{getInitials(profile?.full_name || 'U')}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{profile?.full_name}</p>
          </div>
          <button
            onClick={handleLogout}
            className="text-muted-foreground hover:text-destructive transition-colors"
            title="Sair"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  )
}
