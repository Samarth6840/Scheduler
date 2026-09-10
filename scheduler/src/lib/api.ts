export interface EmailRow {
  id: string
  subject: string
  body: string
  recipient: string
  sender: string
  scheduled_time: string
  status: string
  sent_time: string | null
  job_id: string | null
  batch_id: string | null
  created_at: string
  updated_at: string
}

export interface Stats {
  total: number
  byStatus: Record<string, number>
}

export interface User {
  id: string
  email: string
  name: string
  avatar: string
}

export type StatusFilter = '' | 'scheduled' | 'sent' | 'failed' | 'rate_limited'

export const STATUS_LABELS: Record<string, string> = {
  scheduled: 'Scheduled',
  sent: 'Sent',
  failed: 'Failed',
  rate_limited: 'Rate limited',
}

export interface FetchEmailsParams {
  status?: StatusFilter
  limit: number
  offset: number
}

export interface CreateEmailInput {
  subject: string
  body: string
  recipient: string
  sender: string
  scheduled_time: string
  batch_id?: string
}

const TOKEN_KEY = 'scheduler_token'
export const API_BASE = ((import.meta.env.VITE_API_URL as string | undefined) ?? '').replace(/\/+$/, '')

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem(TOKEN_KEY)
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    ...((init?.headers as Record<string, string>) ?? {}),
    ...authHeaders(),
  }
  const res = await fetch(API_BASE + path, { ...init, headers })
  if (!res.ok) throw new Error(`API request failed with status ${res.status}`)
  return res.json() as Promise<T>
}

export function persistTokenFromUrl(): void {
  const token = new URLSearchParams(window.location.search).get('token')
  if (!token) return
  localStorage.setItem(TOKEN_KEY, token)
  window.history.replaceState({}, '', window.location.pathname)
}

export function fetchMe(): Promise<User | null> {
  return fetch(API_BASE + '/api/auth/me', { headers: authHeaders() })
    .then((res) => (res.status === 401 ? null : res.json()))
    .then((data) => {
      const user = (data as { user?: User } | null)?.user
      return user ?? null
    })
    .catch(() => null)
}

export function fetchEmails(params: FetchEmailsParams): Promise<EmailRow[]> {
  const query = new URLSearchParams({ limit: String(params.limit), offset: String(params.offset) })
  if (params.status) query.set('status', params.status)
  return apiFetch<{ emails: EmailRow[] }>(`/api/emails?${query.toString()}`).then((data) => data.emails)
}

export function searchEmails(q: string, from = 0, size = 20): Promise<EmailRow[]> {
  const query = new URLSearchParams({ q, from: String(from), size: String(size) })
  return apiFetch<{ hits: EmailRow[] }>(`/api/emails/search?${query.toString()}`).then((data) => data.hits)
}

export function fetchStats(): Promise<Stats> {
  return apiFetch<Stats>('/api/emails/stats')
}

export function createEmail(input: CreateEmailInput): Promise<{ email: EmailRow; jobId: string }> {
  return apiFetch('/api/emails', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
}