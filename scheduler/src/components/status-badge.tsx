import { Badge } from '@/components/ui/badge'
import { STATUS_LABELS } from '@/lib/api'
import { cn } from '@/lib/utils'

const STATUS_CLASSES: Record<string, string> = {
  scheduled: 'bg-status-scheduled-bg text-status-scheduled',
  sent: 'bg-status-sent-bg text-status-sent',
  failed: 'bg-status-failed-bg text-status-failed',
  rate_limited: 'bg-status-rate-limited-bg text-status-rate-limited',
}

export function StatusBadge({ status }: { status: string }) {
  return (
    <Badge variant="outline" className={cn('rounded-full border-none', STATUS_CLASSES[status])}>
      {STATUS_LABELS[status] ?? status}
    </Badge>
  )
}