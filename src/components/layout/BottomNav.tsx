import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Wallet,
  ShoppingCart,
  Salad,
  Dumbbell,
  Baby,
  PawPrint,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/auth.store'

const baseNavItems = [
  { to: '/', label: 'Início', icon: LayoutDashboard },
  { to: '/financas', label: 'Finanças', icon: Wallet },
  { to: '/compras', label: 'Compras', icon: ShoppingCart },
  { to: '/dieta', label: 'Dieta', icon: Salad },
  { to: '/treinos', label: 'Treinos', icon: Dumbbell },
]

export default function BottomNav() {
  const household = useAuthStore((s) => s.household)

  const navItems = [
    ...baseNavItems,
    ...(household?.has_children ? [{ to: '/filhos', label: 'Filhos', icon: Baby }] : []),
    ...(household?.has_pets ? [{ to: '/pets', label: 'Pets', icon: PawPrint }] : []),
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-sm border-t border-border pb-safe md:hidden">
      <div className="flex items-stretch justify-around max-w-screen-sm mx-auto">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center justify-center gap-1 py-2 px-2 flex-1 transition-colors',
                isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
              )
            }
          >
            {({ isActive }) => (
              <>
                <Icon className={cn('w-5 h-5', isActive && 'scale-110 transition-transform')} />
                <span className="text-[10px] font-medium leading-none">{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
