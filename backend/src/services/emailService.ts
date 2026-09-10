import { pool } from "../db/index.js";
import { emailQueue, EMAIL_JOB, type EmailJobData } from "../queues/emailQueue.js";
import { HttpError } from "../utils/errors.js";
import type { EmailRow, EmailStatus, ScheduleEmailInput } from "../types/email.js";

const MAX_DELAY_MS = 2 ** 31 - 1;

function toIso(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function toNullableIso(value: unknown): string | null {
  if (value == null) return null;
  return toIso(value);
}

function toNullableString(value: unknown): string | null {
  if (value == null) return null;
  return String(value);
}

function mapEmail(row: Record<string, unknown>): EmailRow {
  return {
    id: String(row.id),
    subject: String(row.subject),
    body: String(row.body),
    recipient: String(row.recipient),
    sender: String(row.sender),
    scheduled_time: toIso(row.scheduled_time),
    status: String(row.status) as EmailStatus,
    sent_time: toNullableIso(row.sent_time),
    job_id: toNullableString(row.job_id),
    batch_id: toNullableString(row.batch_id),
    created_at: toIso(row.created_at),
    updated_at: toIso(row.updated_at),
  };
}

export interface ScheduleEmailResult {
  email: EmailRow;
  jobId: string | null;
}

export async function scheduleEmail(input: ScheduleEmailInput): Promise<ScheduleEmailResult> {
  const subject = input.subject?.trim() ?? "";
  const body = input.body?.trim() ?? "";
  const recipient = input.recipient?.trim() ?? "";
  const sender = input.sender?.trim() ?? "";

  if (!subject || !body || !recipient || !sender) {
    throw new HttpError(400, "subject, body, recipient and sender are required");
  }

  const scheduledTime = new Date(input.scheduled_time);
  if (Number.isNaN(scheduledTime.getTime())) {
    throw new HttpError(400, "scheduled_time must be a valid date");
  }
  if (scheduledTime.getTime() <= Date.now()) {
    throw new HttpError(400, "scheduled_time must be in the future");
  }

  const batchId = input.batch_id?.trim() || null;

  const inserted = await pool.query(
    `INSERT INTO emails (subject, body, recipient, sender, scheduled_time, batch_id)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [subject, body, recipient, sender, scheduledTime, batchId],
  );
  const email = mapEmail(inserted.rows[0] as Record<string, unknown>);

  const delayMs = Math.min(MAX_DELAY_MS, Math.max(0, scheduledTime.getTime() - Date.now()));
  const job = await emailQueue.add(EMAIL_JOB, { emailId: email.id } satisfies EmailJobData, {
    delay: delayMs,
  });

  const jobId = job.id ?? null;
  await pool.query(`UPDATE emails SET job_id = $2 WHERE id = $1`, [email.id, jobId]);

  return { email: { ...email, job_id: jobId }, jobId };
}

export interface EmailFilters {
  status?: EmailStatus | "all";
  sender?: string;
  batchId?: string;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
}

export async function listEmails(filters: EmailFilters = {}): Promise<EmailRow[]> {
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (filters.status && filters.status !== "all") {
    params.push(filters.status);
    conditions.push(`status = $${params.length}`);
  }
  if (filters.sender) {
    params.push(filters.sender);
    conditions.push(`sender = $${params.length}`);
  }
  if (filters.batchId) {
    params.push(filters.batchId);
    conditions.push(`batch_id = $${params.length}`);
  }
  if (filters.from) {
    const from = new Date(filters.from);
    if (Number.isNaN(from.getTime())) throw new HttpError(400, "from must be a valid date");
    params.push(from);
    conditions.push(`scheduled_time >= $${params.length}`);
  }
  if (filters.to) {
    const to = new Date(filters.to);
    if (Number.isNaN(to.getTime())) throw new HttpError(400, "to must be a valid date");
    params.push(new Date(to.getTime() + 86_399_999));
    conditions.push(`scheduled_time <= $${params.length}`);
  }

  const limit = Math.min(Math.max(filters.limit ?? 50, 1), 500);
  const offset = Math.max(filters.offset ?? 0, 0);
  params.push(limit, offset);

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const result = await pool.query(
    `SELECT * FROM emails ${where}
     ORDER BY scheduled_time DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params as unknown[],
  );

  return result.rows.map((row) => mapEmail(row as Record<string, unknown>));
}

export async function getEmailStats(): Promise<{ total: number; byStatus: Record<string, number> }> {
  const result = await pool.query(
    `SELECT status, COUNT(*)::int AS count FROM emails GROUP BY status`,
  );
  const byStatus: Record<string, number> = {};
  let total = 0;
  for (const row of result.rows as Array<Record<string, unknown>>) {
    const status = String(row.status);
    const count = Number(row.count);
    byStatus[status] = count;
    total += count;
  }
  return { total, byStatus };
}

export async function loadEmail(id: string): Promise<EmailRow | null> {
  const result = await pool.query(`SELECT * FROM emails WHERE id = $1`, [id]);
  const row = result.rows[0];
  if (!row) return null;
  return mapEmail(row as Record<string, unknown>);
}

export async function updateEmailStatus(
  id: string,
  update: { status: EmailStatus; sentTime?: Date | null; jobId?: string | null },
): Promise<void> {
  await pool.query(
    `UPDATE emails SET status = $2, sent_time = $3, job_id = $4, updated_at = now() WHERE id = $1`,
    [id, update.status, update.sentTime ?? null, update.jobId ?? null],
  );
}