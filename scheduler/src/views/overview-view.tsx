import { useEffect, useState } from 'react'
import { ArrowRightIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { StatusBadge } from '@/components/status-badge'
import { fetchEmails, fetchStats, type EmailRow, type Stats } from '@/lib/api'
import { formatTime } from '@/lib/format'
import type { ViewKey } from '@/lib/types'

const STAT_TILES: { key: keyof Stats['byStatus'] | 'total'; label: string }[] = [
  { key: 'total', label: 'Total' },
  { key: 'scheduled', label: 'Scheduled' },
  { key: 'sent', label: 'Sent' },
  { key: 'failed', label: 'Failed' },
  { key: 'rate_limited', label: 'Rate limited' },
]

export function OverviewView({ onNavigate }: { onNavigate: (view: ViewKey) => void }) {
  const [stats, setStats] = useState<Stats | null>(null)
  const [recent, setRecent] = useState<EmailRow[] | null>(null)

  useEffect(() => {
    let cancelled = false
    fetchStats()
      .then((data) => {
        if (!cancelled) setStats(data)
      })
      .catch(() => {
        if (!cancelled) setStats({ total: 0, byStatus: {} })
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    fetchEmails({ limit: 8, offset: 0 })
      .then((rows) => {
        if (!cancelled) setRecent(rows)
      })
      .catch(() => {
        if (!cancelled) setRecent([])
      })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
        {STAT_TILES.map((tile) => (
          <Card key={tile.label}>
            <CardContent className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-muted-foreground">{tile.label}</span>
              {stats ? (
                <span className="font-mono text-2xl font-semibold tabular-nums">
                  {tile.key === 'total' ? stats.total : (stats.byStatus[tile.key] ?? 0)}
                </span>
              ) : (
                <Skeleton className="h-7 w-12" />
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent emails</CardTitle>
          <CardAction>
            <Button variant="ghost" size="sm" onClick={() => onNavigate('email-log')}>
              View all
              <ArrowRightIcon />
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Recipient</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Scheduled</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recent === null
                ? Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <Skeleton className="h-4 w-40" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-56" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-5 w-20 rounded-full" />
                      </TableCell>
                      <TableCell className="text-right">
                        <Skeleton className="ml-auto h-4 w-24" />
                      </TableCell>
                    </TableRow>
                  ))
                : recent.length === 0
                  ? (
                    <TableRow>
                      <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                        No emails yet.
                      </TableCell>
                    </TableRow>
                  )
                  : (
                    recent.map((email) => (
                      <TableRow key={email.id}>
                        <TableCell>
                          <span className="block max-w-[200px] truncate font-mono text-xs">{email.recipient}</span>
                        </TableCell>
                        <TableCell>
                          <span className="block max-w-[320px] truncate">{email.subject}</span>
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={email.status} />
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs whitespace-nowrap">
                          {formatTime(email.scheduled_time)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}