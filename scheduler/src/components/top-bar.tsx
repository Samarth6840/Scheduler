import { AccountControl } from '@/components/account-control'
import type { User } from '@/lib/api'

export function TopBar({ title, user }: { title: string; user: User | null }) {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-border bg-background px-4 sm:px-6 lg:px-8">
      <h1 className="truncate text-base font-semibold tracking-tight">{title}</h1>
      <div className="hidden lg:block">
        <AccountControl user={user} />
      </div>
    </header>
  )
}