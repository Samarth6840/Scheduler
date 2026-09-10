import { Router } from "express";
import type { EmailFilters } from "../services/emailService.js";
import { getEmailStats, listEmails, scheduleEmail } from "../services/emailService.js";
import { searchEmails } from "../services/search.js";
import type { EmailStatus, ScheduleEmailInput } from "../types/email.js";

const router = Router();

router.post("/", async (req, res) => {
  const body = (req.body ?? {}) as Record<string, unknown>;
  const input: ScheduleEmailInput = {
    subject: String(body.subject ?? ""),
    body: String(body.body ?? ""),
    recipient: String(body.recipient ?? ""),
    sender: String(body.sender ?? ""),
    scheduled_time: String(body.scheduled_time ?? ""),
  };
  if (typeof body.batch_id === "string" && body.batch_id !== "") {
    input.batch_id = body.batch_id;
  }
  const result = await scheduleEmail(input);
  res.status(201).json(result);
});

router.get("/", async (req, res) => {
  const query = req.query as Record<string, unknown>;
  const filters: EmailFilters = {};
  if (typeof query.status === "string") {
    filters.status = query.status as EmailStatus | "all";
  }
  if (typeof query.sender === "string") filters.sender = query.sender;
  if (typeof query.batch_id === "string") filters.batchId = query.batch_id;
  if (typeof query.from === "string") filters.from = query.from;
  if (typeof query.to === "string") filters.to = query.to;
  if (typeof query.limit === "string") filters.limit = Number(query.limit);
  if (typeof query.offset === "string") filters.offset = Number(query.offset);
  const emails = await listEmails(filters);
  res.json({ emails });
});

router.get("/search", async (req, res) => {
  const query = req.query as Record<string, unknown>;
  const term = typeof query.q === "string" ? query.q.trim() : "";
  if (!term) {
    res.status(400).json({ error: "q query parameter is required" });
    return;
  }
  const from = typeof query.from === "string" ? Math.max(Number(query.from) || 0, 0) : 0;
  const size = typeof query.size === "string" ? Math.min(Math.max(Number(query.size) || 20, 1), 100) : 20;
  const hits = await searchEmails(term, from, size);
  res.json({ hits });
});

router.get("/stats", async (_req, res) => {
  res.json(await getEmailStats());
});

export default router;