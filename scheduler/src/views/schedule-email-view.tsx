import { useState, type FormEvent, type ReactNode } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { createEmail } from '@/lib/api'
import { toDateTimeLocalValue } from '@/lib/format'

interface ScheduleForm {
  recipient: string
  sender: string
  subject: string
  body: string
  scheduledTime: string
  batchId: string
}

const EMPTY_FORM: ScheduleForm = {
  recipient: '',
  sender: '',
  subject: '',
  body: '',
  scheduledTime: '',
  batchId: '',
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function validate(form: ScheduleForm): Record<string, string> {
  const errors: Record<string, string> = {}
  if (!form.recipient.trim()) {
    errors.recipient = 'Recipient is required.'
  } else if (!EMAIL_RE.test(form.recipient.trim())) {
    errors.recipient = 'Enter a valid email address.'
  }
  if (!form.sender.trim()) {
    errors.sender = 'Sender is required.'
  } else if (!EMAIL_RE.test(form.sender.trim())) {
    errors.sender = 'Enter a valid email address.'
  }
  if (!form.subject.trim()) errors.subject = 'Subject is required.'
  if (!form.body.trim()) errors.body = 'Message body is required.'
  if (!form.scheduledTime) {
    errors.scheduledTime = 'Send date and time is required.'
  } else if (new Date(form.scheduledTime).getTime() <= Date.now()) {
    errors.scheduledTime = 'Send date and time must be in the future.'
  }
  return errors
}

export function ScheduleEmailView() {
  const [form, setForm] = useState<ScheduleForm>(EMPTY_FORM)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)

  function updateField<K extends keyof ScheduleForm>(field: K, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
    setErrors((prev) => {
      if (!prev[field]) return prev
      const next = { ...prev }
      delete next[field]
      return next
    })
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const nextErrors = validate(form)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return
    setSubmitting(true)
    createEmail({
      recipient: form.recipient.trim(),
      sender: form.sender.trim(),
      subject: form.subject.trim(),
      body: form.body.trim(),
      scheduled_time: new Date(form.scheduledTime).toISOString(),
      ...(form.batchId.trim() ? { batch_id: form.batchId.trim() } : {}),
    })
      .then(() => {
        setForm(EMPTY_FORM)
        toast.success('Email scheduled')
      })
      .catch(() => {
        toast.error('Failed to schedule email — check that the backend is running.')
      })
      .finally(() => setSubmitting(false))
  }

  function handleCancel() {
    setForm(EMPTY_FORM)
    setErrors({})
  }

  return (
    <Card>
      <form onSubmit={handleSubmit} noValidate>
        <CardHeader>
          <CardTitle>Schedule Email</CardTitle>
          <CardDescription>Compose a transactional email to send at a scheduled time.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="To (recipient)" htmlFor="schedule-recipient" error={errors.recipient}>
              <Input
                id="schedule-recipient"
                type="email"
                value={form.recipient}
                onChange={(e) => updateField('recipient', e.target.value)}
                placeholder="user@example.com"
                autoComplete="off"
                aria-invalid={Boolean(errors.recipient)}
              />
            </Field>
            <Field label="From (sender)" htmlFor="schedule-sender" error={errors.sender}>
              <Input
                id="schedule-sender"
                type="email"
                value={form.sender}
                onChange={(e) => updateField('sender', e.target.value)}
                placeholder="noreply@example.com"
                autoComplete="off"
                aria-invalid={Boolean(errors.sender)}
              />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Subject" htmlFor="schedule-subject" error={errors.subject}>
                <Input
                  id="schedule-subject"
                  value={form.subject}
                  onChange={(e) => updateField('subject', e.target.value)}
                  placeholder="Email subject"
                  autoComplete="off"
                  aria-invalid={Boolean(errors.subject)}
                />
              </Field>
            </div>
            <div className="sm:col-span-2">
              <Field label="Message body" htmlFor="schedule-body" error={errors.body}>
                <Textarea
                  id="schedule-body"
                  value={form.body}
                  onChange={(e) => updateField('body', e.target.value)}
                  placeholder="Email content…"
                  className="min-h-32"
                  aria-invalid={Boolean(errors.body)}
                />
              </Field>
            </div>
            <Field label="Send date and time" htmlFor="schedule-time" error={errors.scheduledTime}>
              <Input
                id="schedule-time"
                type="datetime-local"
                value={form.scheduledTime}
                onChange={(e) => updateField('scheduledTime', e.target.value)}
                min={toDateTimeLocalValue(new Date())}
                aria-invalid={Boolean(errors.scheduledTime)}
              />
            </Field>
            <Field label="Batch ID (optional)" htmlFor="schedule-batch">
              <Input
                id="schedule-batch"
                value={form.batchId}
                onChange={(e) => updateField('batchId', e.target.value)}
                placeholder="batch-001"
                autoComplete="off"
              />
            </Field>
          </div>
        </CardContent>
        <CardFooter className="justify-end gap-2">
          <Button type="button" variant="ghost" onClick={handleCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Saving…' : 'Save Schedule'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}

function Field({ label, htmlFor, error, children }: { label: string; htmlFor: string; error?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}