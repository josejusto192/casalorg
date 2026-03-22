import { type LucideIcon } from 'lucide-react'

interface PageHeaderProps {
  icon?: LucideIcon
  title: string
  description?: string
  action?: React.ReactNode
}

export function PageHeader({ icon: Icon, title, description, action }: PageHeaderProps) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div className="flex items-center gap-3">
        {Icon && (
          <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
            <Icon className="w-5 h-5 text-primary" />
          </div>
        )}
        <div>
          <h1 className="text-xl font-bold">{title}</h1>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
      </div>
      {action && <div className="ml-4">{action}</div>}
    </div>
  )
}
