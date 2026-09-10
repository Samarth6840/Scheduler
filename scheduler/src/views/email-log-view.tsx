import { useEffect, useState } from 'react'
import {
  ArrowDownIcon,
  ArrowUpIcon,
  ArrowUpDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  RefreshCwIcon,
  SearchIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { StatusBadge } from '@/components/status-badge'
import { fetchEmails, fetchStats, searchEmails, STATUS_LABELS, type EmailRow, type Stats, type StatusFilter } from '@/lib/api'
import { formatTime } from '@/lib/format'
import { cn } from '@/lib/utils'

const PAGE_SIZE = 20
const SEARCH_SIZE = 50

type SortKey = 'scheduled_time' | 'recipient' | 'subject' | 'sender' | 'status'

interface SortState {
  key: SortKey
  dir: 'asc' | 'desc'
}

const FILTERS: { key: StatusFilter; label: string }[] = [
  { key: '', label: 'All' },
  { key: 'scheduled', label: STATUS_LABELS.scheduled },
  { key: 'sent', label: STATUS_LABELS.sent },
  { key: 'failed', label: STATUS_LABELS.failed },
  { key: 'rate_limited', label: STATUS_LABELS.rate_limited },
]

const SORT_COLUMNS: { key: SortKey; label: string }[] = [
  { key: 'scheduled_time', label: 'Date scheduled' },
  { key: 'recipient', label: 'Recipient' },
  { key: 'subject', label: 'Subject' },
  { key: 'sender', label: 'Sender' },
  { key: 'status', label: 'Status' },
]

function compareEmails(a: EmailRow, b: EmailRow, key: SortKey): number {
  if (key === 'scheduled_time') {
    return new Date(a.scheduled_time).getTime() - new Date(b.scheduled_time).getTime()
  }
  if (key === 'status') return a.status.localeCompare(b.status)
  return a[key].toLowerCase().localeCompare(b[key].toLowerCase())
}

export function EmailLogView() {
  const [emails, setEmails] = useState<EmailRow[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('')
  const [searchInput, setSearchInput] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [page, setPage] = useState(1)
  const [refreshTick, setRefreshTick] = useState(0)
  const [sort, setSort] = useState<SortState>({ key: 'scheduled_time', dir: 'desc' })

  useEffect(() => {
    const timer = setTimeout(() => {
      const nextQuery = searchInput.trim()
      setPage(1)
      if (nextQuery !== searchQuery) setLoading(true)
      setSearchQuery(nextQuery)
    }, 350)
    return () => clearTimeout(timer)
  }, [searchInput, searchQuery])

  useEffect(() => {
    let cancelled = false
    const dataPromise = searchQuery
      ? searchEmails(searchQuery, 0, SEARCH_SIZE)
      : fetchEmails({ status: statusFilter, limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE })

    dataPromise
      .then((rows) => {
        if (cancelled) return
        setEmails(searchQuery && statusFilter ? rows.filter((row) => row.status === statusFilter) : rows)
        setError(false)
      })
      .catch(() => {
        if (cancelled) return
        setEmails([])
        setError(true)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [statusFilter, searchQuery, page, refreshTick])

  useEffect(() => {
    let cancelled = false
    fetchStats()
      .then((data) => {
        if (!cancelled) setStats(data)
      })
      .catch(() => {
        if (!cancelled) setStats(null)
      })
    return () => {
      cancelled = true
    }
  }, [refreshTick])

  function handleStatusChange(filter: StatusFilter) {
    setStatusFilter(filter)
    setPage(1)
    setLoading(true)
  }

  function handleSortChange(key: SortKey) {
    setSort((prev) => {
      if (prev.key === key) return { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
      return { key, dir: key === 'scheduled_time' ? 'desc' : 'asc' }
    })
  }

  function handleRefresh() {
    setLoading(true)
    setRefreshTick((t) => t + 1)
  }

  const sortKey = sort.key
  const rows = sortKey
    ? [...emails].sort((a, b) => {
        const delta = compareEmails(a, b, sortKey)
        return sort.dir === 'asc' ? delta : -delta
      })
    : emails

  const total = statusFilter ? stats?.byStatus[statusFilter] ?? 0 : stats?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search emails…"
            aria-label="Search emails"
            className="pl-8"
          />
        </div>
        <div className="flex flex-wrap items-center gap-1">
          {FILTERS.map((filter) => (
            <button
              key={filter.key}
              type="button"
              onClick={() => handleStatusChange(filter.key)}
              aria-pressed={statusFilter === filter.key}
              className={cn(
                'rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors',
                statusFilter === filter.key
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              {filter.label}
            </button>
          ))}
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh}>
          <RefreshCwIcon />
          Refresh
        </Button>
      </div>

      {error && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          <span>Backend offline — could not load emails.</span>
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            Retry
          </Button>
        </div>
      )}

      <div className="rounded-xl bg-card ring-1 ring-foreground/10">
        <Table>
          <TableHeader>
            <TableRow>
              {SORT_COLUMNS.map((column) => {
                const active = sort.key === column.key
                const Indicator = active ? (sort.dir === 'asc' ? ArrowUpIcon : ArrowDownIcon) : ArrowUpDownIcon
                return (
                  <TableHead
                    key={column.key}
                    aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}
                  >
                    <button
                      type="button"
                      onClick={() => handleSortChange(column.key)}
                      className="flex items-center gap-1.5 font-medium hover:text-foreground"
                    >
                      {column.label}
                      <Indicator className={cn('size-3.5', !active && 'text-muted-foreground/50')} />
                    </button>
                  </TableHead>
                )
              })}
              <TableHead className="text-right">Sent date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading
              ? Array.from({ length: 8 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Skeleton className="h-4 w-24" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-40" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-56" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-36" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-20 rounded-full" />
                    </TableCell>
                    <TableCell className="text-right">
                      <Skeleton className="ml-auto h-4 w-20" />
                    </TableCell>
                  </TableRow>
                ))
              : rows.length === 0
                ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                      No emails match
                    </TableCell>
                  </TableRow>
                )
                : (
                  rows.map((email) => (
                    <TableRow key={email.id}>
                      <TableCell className="font-mono text-xs whitespace-nowrap">
                        {formatTime(email.scheduled_time)}
                      </TableCell>
                      <TableCell>
                        <span className="block max-w-[200px] truncate font-mono text-xs">{email.recipient}</span>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-[320px]">
                          <div className="truncate text-sm font-medium">{email.subject}</div>
                          <div className="truncate text-xs text-muted-foreground">{email.body}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="block max-w-[200px] truncate font-mono text-xs">{email.sender}</span>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={email.status} />
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs whitespace-nowrap text-muted-foreground">
                        {email.sent_time ? formatTime(email.sent_time) : '—'}
                      </TableCell>
                    </TableRow>
                  ))
                )}
          </TableBody>
        </Table>
      </div>

      {!searchQuery && (
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => {
              setLoading(true)
              setPage((p) => Math.max(1, p - 1))
            }}
          >
            <ChevronLeftIcon />
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => {
              setLoading(true)
              setPage((p) => Math.min(totalPages, p + 1))
            }}
          >
            Next
            <ChevronRightIcon />
          </Button>
        </div>
      )}
    </div>
  )
}