import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { API_BASE, type User } from '@/lib/api'

export function AccountControl({ user, vertical = false }: { user: User | null; vertical?: boolean }) {
  if (!user) {
    return (
      <a href={`${API_BASE}/api/auth/google`} className={buttonVariants({ variant: 'outline', size: 'sm' })}>
        Connect Google
      </a>
    )
  }
  return (
    <div className={cn('flex min-w-0 items-center gap-2.5', vertical && 'flex-col items-start')}>
      {user.avatar ? (
        <img src={user.avatar} alt="" className="size-8 shrink-0 rounded-full object-cover" />
      ) : (
        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
          {(user.name || user.email).slice(0, 1).toUpperCase()}
        </div>
      )}
      <div className="min-w-0">
        {vertical && user.name && <div className="truncate text-sm font-medium">{user.name}</div>}
        <div className="truncate text-xs text-muted-foreground">{user.email}</div>
      </div>
    </div>
  )
}