import express from "express";
import cors from "cors";
import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { ExpressAdapter } from "@bull-board/express";

import { env } from "./config/env.js";
import { initES, es } from "./config/elastic.js";
import { redis } from "./config/redis.js";
import { initDb, pool } from "./db/index.js";
import { emailQueue } from "./queues/emailQueue.js";
import { startEmailWorker } from "./workers/emailWorker.js";
import { getTransporter } from "./services/mailer.js";
import { HttpError } from "./utils/errors.js";
import emailsRouter from "./routes/emails.js";
import authRouter from "./routes/auth.js";

const app = express();
app.use(cors({ origin: env.frontendUrl }));
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, message: "Backend is Connected" });
});

app.use("/api/emails", emailsRouter);
app.use("/api/auth", authRouter);

const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath("/admin/queues");
createBullBoard({ queues: [new BullMQAdapter(emailQueue)], serverAdapter });
app.use("/admin/queues", serverAdapter.getRouter());

app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

app.use(
  (err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    if (err instanceof HttpError) {
      res.status(err.status).json({ error: err.message });
      return;
    }
    const status =
      typeof (err as { status?: unknown }).status === "number" &&
      (err as { status: number }).status >= 400 &&
      (err as { status: number }).status < 500
        ? (err as { status: number }).status
        : 500;
    console.error("[error]", err);
    res
      .status(status)
      .json({ error: status === 500 ? "Internal server error" : `Bad request: ${err instanceof Error ? err.message : "Invalid input"}` });
  },
);

let worker: ReturnType<typeof startEmailWorker> | null = null;

async function start(): Promise<void> {
  await initDb();
  initES();
  await getTransporter().catch((error: unknown) => {
    console.warn(
      "[mailer] SMTP bootstrap failed (mail will still be attempted later):",
      error instanceof Error ? error.message : error,
    );
  });
  worker = startEmailWorker();

  app.listen(env.port, () => {
    console.log(`[server] running on http://localhost:${env.port}`);
    console.log(`[server] Bull Board at http://localhost:${env.port}/admin/queues`);
  });
}

start().catch((error: unknown) => {
  console.error("Failed to start:", error instanceof Error ? error.message : error);
  process.exit(1);
});

async function shutdown(signal: string): Promise<void> {
  console.log(`[server] ${signal} received, shutting down...`);
  await worker?.close().catch(() => undefined);
  await emailQueue.close().catch(() => undefined);
  await pool.end().catch(() => undefined);
  redis.disconnect();
  es.close().catch(() => undefined);
  process.exit(0);
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));