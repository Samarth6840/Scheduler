import { useEffect, useState } from 'react'
import { MobileNav, Sidebar } from '@/components/nav'
import { TopBar } from '@/components/top-bar'
import { Toaster } from '@/components/ui/sonner'
import { fetchMe, persistTokenFromUrl, type User } from '@/lib/api'
import type { ViewKey } from '@/lib/types'
import { EmailLogView } from '@/views/email-log-view'
import { OverviewView } from '@/views/overview-view'
import { ScheduleEmailView } from '@/views/schedule-email-view'

const VIEW_TITLES: Record<ViewKey, string> = {
  overview: 'Overview',
  'email-log': 'Email Log',
  'schedule-email': 'Schedule Email',
}

export default function App() {
  const [view, setView] = useState<ViewKey>('overview')
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    persistTokenFromUrl()
    let cancelled = false
    fetchMe().then((u) => {
      if (!cancelled) setUser(u)
    })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="min-h-screen bg-background text-foreground">
      <MobileNav view={view} onNavigate={setView} user={user} />
      <div className="lg:flex">
        <Sidebar view={view} onNavigate={setView} user={user} />
        <div className="min-w-0 flex-1">
          <TopBar title={VIEW_TITLES[view]} user={user} />
          <main className="mx-auto w-full max-w-[1100px] px-4 py-6 sm:px-6 lg:px-8">
            {view === 'overview' && <OverviewView onNavigate={setView} />}
            {view === 'email-log' && <EmailLogView />}
            {view === 'schedule-email' && <ScheduleEmailView />}
          </main>
        </div>
      </div>
      <Toaster position="top-right" />
    </div>
  )
}