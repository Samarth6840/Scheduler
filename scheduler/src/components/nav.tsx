import { CalendarClockIcon, LayoutDashboardIcon, MailIcon, type LucideIcon } from 'lucide-react'
import { AccountControl } from '@/components/account-control'
import { cn } from '@/lib/utils'
import type { User } from '@/lib/api'
import type { ViewKey } from '@/lib/types'

const NAV_ITEMS: { key: ViewKey; label: string; icon: LucideIcon }[] = [
  { key: 'overview', label: 'Overview', icon: LayoutDashboardIcon },
  { key: 'email-log', label: 'Email Log', icon: MailIcon },
  { key: 'schedule-email', label: 'Schedule Email', icon: CalendarClockIcon },
]

export function Wordmark() {
  return (
    <div className="flex items-center gap-2">
      <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
        <MailIcon className="size-4" />
      </div>
      <span className="text-[15px] font-semibold tracking-tight">Scheduler</span>
    </div>
  )
}

export function Sidebar({
  view,
  onNavigate,
  user,
}: {
  view: ViewKey
  onNavigate: (view: ViewKey) => void
  user: User | null
}) {
  return (
    <aside className="sticky top-0 hidden h-screen w-[220px] shrink-0 flex-col border-r border-sidebar-border bg-sidebar lg:flex">
      <div className="flex h-14 shrink-0 items-center border-b border-sidebar-border px-4">
        <Wordmark />
      </div>
      <nav className="flex-1 space-y-1 px-3 py-4">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon
          const active = view === item.key
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => onNavigate(item.key)}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                active
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground',
              )}
            >
              <Icon className="size-4 shrink-0" />
              {item.label}
            </button>
          )
        })}
      </nav>
      <div className="border-t border-sidebar-border px-3 py-4">
        <AccountControl user={user} vertical />
      </div>
    </aside>
  )
}

export function MobileNav({
  view,
  onNavigate,
  user,
}: {
  view: ViewKey
  onNavigate: (view: ViewKey) => void
  user: User | null
}) {
  return (
    <div className="sticky top-0 z-30 border-b border-border bg-background lg:hidden">
      <div className="flex h-14 items-center justify-between gap-3 px-4">
        <Wordmark />
        <AccountControl user={user} />
      </div>
      <nav className="flex gap-1 overflow-x-auto px-3 pb-2">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon
          const active = view === item.key
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => onNavigate(item.key)}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                active ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              <Icon className="size-4" />
              {item.label}
            </button>
          )
        })}
      </nav>
    </div>
  )
}