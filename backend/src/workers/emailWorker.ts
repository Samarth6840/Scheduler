import { Worker, type Job } from "bullmq";
import nodemailer from "nodemailer";
import type { SentMessageInfo } from "nodemailer";
import { redis } from "../config/redis.js";
import { env } from "../config/env.js";
import { emailQueue, EMAIL_JOB, type EmailJobData } from "../queues/emailQueue.js";
import { loadEmail, updateEmailStatus } from "../services/emailService.js";
import { acquireSendSlot, waitForMinDelay } from "../services/rateLimiter.js";
import { getTransporter, getTestAccountStatus } from "../services/mailer.js";
import { indexEmail } from "../services/search.js";

const RATE_LIMIT_RETRY_DELAY_MS = 10 * 60 * 1000;

async function processEmail(job: Job<EmailJobData>): Promise<void> {
  const { emailId } = job.data;

  const email = await loadEmail(emailId);
  if (!email) return;
  if (email.status === "sent" || email.status === "failed") return;

  const slot = await acquireSendSlot(email.sender);
  if (!slot.ok) {
    await updateEmailStatus(email.id, { status: "rate_limited" });
    await emailQueue.add(EMAIL_JOB, job.data, {
      delay: RATE_LIMIT_RETRY_DELAY_MS,
      jobId: `retry-${emailId}-${Date.now()}`,
    });
    return;
  }

  await waitForMinDelay();

  let info: SentMessageInfo;
  try {
    const transporter = await getTransporter();
    info = await transporter.sendMail({
      from: email.sender,
      to: email.recipient,
      subject: email.subject,
      text: email.body,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await updateEmailStatus(email.id, { status: "failed" });
    throw new Error(`Send failed for email ${emailId}: ${message}`);
  }

  await updateEmailStatus(email.id, { status: "sent", sentTime: new Date(), jobId: job.id ?? null });

  await indexEmail({
    ...email,
    status: "sent",
    sent_time: new Date().toISOString(),
    job_id: job.id ?? null,
  }).catch((error: unknown) => {
    console.warn("[worker] failed to index email in Elasticsearch:", error instanceof Error ? error.message : error);
  });

  if (getTestAccountStatus()) {
    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
      console.log(`[worker] email ${emailId} sent — preview: ${previewUrl}`);
    }
  }
  console.log(`[worker] email ${emailId} sent (${email.recipient})`);
}

export function startEmailWorker(): Worker<EmailJobData, void, typeof EMAIL_JOB> {
  const worker = new Worker<EmailJobData, void, typeof EMAIL_JOB>(
    "emails",
    (job) => processEmail(job),
    { connection: redis, concurrency: env.worker.concurrency },
  );

  worker.on("failed", (job, error) => {
    console.error(`[worker] job ${job?.id} failed:`, error.message);
  });
  worker.on("error", (error) => {
    console.error("[worker] error:", error.message);
  });

  return worker;
}