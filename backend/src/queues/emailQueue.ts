import { Queue } from "bullmq";
import { redis } from "../config/redis.js";

export const EMAIL_JOB = "sendEmail";

export interface EmailJobData {
  emailId: string;
}

export const emailQueue = new Queue<EmailJobData, void, typeof EMAIL_JOB>(
  "emails",
  { connection: redis },
);