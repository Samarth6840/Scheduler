export type EmailStatus = "scheduled" | "sent" | "failed" | "rate_limited";

export interface EmailRow {
  id: string;
  subject: string;
  body: string;
  recipient: string;
  sender: string;
  scheduled_time: string;
  status: EmailStatus;
  sent_time: string | null;
  job_id: string | null;
  batch_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ScheduleEmailInput {
  subject: string;
  body: string;
  recipient: string;
  sender: string;
  scheduled_time: string;
  batch_id?: string;
}