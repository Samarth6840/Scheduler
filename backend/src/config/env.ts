import dotenv from "dotenv";
dotenv.config();

function required(name: string, fallback: string): string {
  return process.env[name] ?? fallback;
}

function int(name: string, fallback: number): number {
  const v = Number(process.env[name]);
  return Number.isFinite(v) && v > 0 ? v : fallback;
}

function pgConfig(): {
  host: string
  port: number
  user: string
  password: string
  db: string
  ssl: { rejectUnauthorized: boolean } | undefined
} {
  const url = process.env.DATABASE_URL;
  if (url) {
    const parsed = new URL(url);
    return {
      host: parsed.hostname,
      port: Number(parsed.port || 5432),
      user: decodeURIComponent(parsed.username),
      password: decodeURIComponent(parsed.password),
      db: parsed.pathname.replace(/^\//, ""),
      ssl: parsed.hostname.endsWith("postgres.render.com")
        ? { rejectUnauthorized: false }
        : undefined,
    };
  }
  return {
    host: required("PG_HOST", "localhost"),
    port: int("PG_PORT", 5432),
    user: required("PG_USER", "scheduler"),
    password: required("PG_PASSWORD", "scheduler"),
    db: required("PG_DB", "scheduler"),
    ssl: undefined,
  };
}

export const env = {
  port: int("PORT", 5001),
  frontendUrl: required("FRONTEND_URL", "http://localhost:5173"),
  jwtSecret: required("JWT_SECRET", "dev-secret"),

  pg: pgConfig(),

  redisUrl: required("REDIS_URL", "redis://localhost:6379"),
  esUrl: required("ES_URL", "http://localhost:9200"),

  worker: {
    concurrency: int("WORKER_CONCURRENCY", 5),
    minDelayBetweenEmailsMs: int("MIN_DELAY_BETWEEN_EMAILS_MS", 2000),
    maxEmailsPerHourPerSender: int("MAX_EMAILS_PER_HOUR_PER_SENDER", 10),
    maxEmailsPerHourGlobal: int("MAX_EMAILS_PER_HOUR_GLOBAL", 200),
  },

  ethereal: {
    host: required("ETHEREAL_HOST", "smtp.ethereal.email"),
    port: int("ETHEREAL_PORT", 587),
    user: process.env.ETHEREAL_USER ?? "",
    pass: process.env.ETHEREAL_PASS ?? "",
  },

  google: {
    clientId: process.env.GOOGLE_CLIENT_ID ?? "",
    clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    callbackUrl: required("GOOGLE_CALLBACK_URL", ""),
  },
};
