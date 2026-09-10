import { Pool } from "pg";
import { env } from "../config/env.js";

export const pool = new Pool({
  host: env.pg.host,
  port: env.pg.port,
  user: env.pg.user,
  password: env.pg.password,
  database: env.pg.db,
});

export async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS emails (
      id            BIGSERIAL PRIMARY KEY,
      subject       TEXT NOT NULL,
      body          TEXT NOT NULL,
      recipient     TEXT NOT NULL,
      sender        TEXT NOT NULL,
      scheduled_time TIMESTAMPTZ NOT NULL,
      status        TEXT NOT NULL DEFAULT 'scheduled',
      sent_time     TIMESTAMPTZ,
      job_id        TEXT,
      batch_id      TEXT,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE INDEX IF NOT EXISTS idx_emails_status ON emails (status);
    CREATE INDEX IF NOT EXISTS idx_emails_scheduled_time ON emails (scheduled_time);
    CREATE INDEX IF NOT EXISTS idx_emails_batch_id ON emails (batch_id);
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id            TEXT PRIMARY KEY,
      email         TEXT UNIQUE NOT NULL,
      name          TEXT,
      avatar        TEXT,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
}
