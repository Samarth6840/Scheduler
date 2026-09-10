import { redis } from "../config/redis.js";
import { env } from "../config/env.js";

const HOUR_SECONDS = 60 * 60;

const RESERVE_SCRIPT = `
local sc = redis.call('INCR', KEYS[1])
if sc == 1 then redis.call('EXPIRE', KEYS[1], ARGV[2]) end
if sc > tonumber(ARGV[1]) then
  redis.call('DECR', KEYS[1])
  return -1
end
local gc = redis.call('INCR', KEYS[2])
if gc == 1 then redis.call('EXPIRE', KEYS[2], ARGV[4]) end
if gc > tonumber(ARGV[3]) then
  redis.call('DECR', KEYS[2])
  redis.call('DECR', KEYS[1])
  return -2
end
return 0
`;

export type SlotResult =
  | { ok: true; reason: null }
  | { ok: false; reason: "sender" | "global" };

export async function acquireSendSlot(sender: string): Promise<SlotResult> {
  const { maxEmailsPerHourPerSender, maxEmailsPerHourGlobal } = env.worker;
  const result = (await redis.eval(
    RESERVE_SCRIPT,
    2,
    `email:rate:sender:${sender}`,
    "email:rate:global",
    maxEmailsPerHourPerSender,
    HOUR_SECONDS,
    maxEmailsPerHourGlobal,
    HOUR_SECONDS,
  )) as number;

  if (result === -1) return { ok: false, reason: "sender" };
  if (result === -2) return { ok: false, reason: "global" };
  return { ok: true, reason: null };
}

const MIN_DELAY_SCRIPT = `
local t = redis.call('TIME')
local now = tonumber(t[1]) * 1000 + math.floor(tonumber(t[2]) / 1000)
local last = redis.call('GET', KEYS[1])
local wait = 0
if last then
  wait = tonumber(ARGV[1]) - (now - tonumber(last))
  if wait < 0 then wait = 0 end
end
redis.call('SET', KEYS[1], now, 'PX', 86400000)
return wait
`;

const LAST_SENT_KEY = "email:rate:lastSentAt";

export async function waitForMinDelay(): Promise<void> {
  const delayMs = env.worker.minDelayBetweenEmailsMs;
  if (delayMs <= 0) return;

  const waitMs = (await redis.eval(MIN_DELAY_SCRIPT, 1, LAST_SENT_KEY, delayMs)) as number;
  if (waitMs > 0) {
    await new Promise((resolve) => setTimeout(resolve, waitMs));
  }
}