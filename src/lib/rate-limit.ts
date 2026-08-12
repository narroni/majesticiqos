import "server-only";

import { createHash } from "node:crypto";
import { Ratelimit } from "@upstash/ratelimit";

import { redis } from "@/lib/redis";

// Never a real production secret rotation strategy — just enough that raw
// IPs never sit in memory or logs unhashed. Set IP_HASH_SALT in production.
const IP_HASH_SALT = process.env.IP_HASH_SALT ?? "ember-dev-salt-not-for-production";

export function hashIp(ip: string): string {
  return createHash("sha256").update(`${IP_HASH_SALT}:${ip}`).digest("hex");
}

const HOURLY_LIMIT = 5;
const DAILY_LIMIT = 20;
const LOGIN_LIMIT = 5;

// ---------------------------------------------------------------------------
// In-memory fallback — used only when Redis isn't configured (src/lib/redis.ts
// logs a warning in that case). Resets on every deploy/restart and doesn't
// share state across instances; fine for single-instance local dev only.
// ---------------------------------------------------------------------------

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;

const submissionLog = new Map<string, number[]>();
const loginAttemptsByIp = new Map<string, number[]>();
const loginAttemptsByEmail = new Map<string, number[]>();

/**
 * Shared sliding-window primitive: true (and records the attempt) if `key`
 * is under `limit` hits within `windowMs`; false (without recording — a
 * rejected attempt shouldn't extend its own window) otherwise.
 */
function withinWindow(
  store: Map<string, number[]>,
  key: string,
  windowMs: number,
  limit: number,
): boolean {
  const now = Date.now();
  const history = (store.get(key) ?? []).filter((timestamp) => now - timestamp < windowMs);

  if (history.length >= limit) {
    store.set(key, history);
    return false;
  }

  history.push(now);
  store.set(key, history);
  return true;
}

function checkRateLimitInMemory(ipHash: string): RateLimitResult {
  // The daily check must not consume a slot when the hourly check already
  // rejected, so hourly is evaluated against a read-only view first.
  const now = Date.now();
  const recentHistory = (submissionLog.get(ipHash) ?? []).filter(
    (timestamp) => now - timestamp < DAY_MS,
  );
  const hourlyCount = recentHistory.filter((timestamp) => now - timestamp < HOUR_MS).length;

  if (hourlyCount >= HOURLY_LIMIT) {
    submissionLog.set(ipHash, recentHistory);
    return { allowed: false, reason: "hourly" };
  }

  if (recentHistory.length >= DAILY_LIMIT) {
    submissionLog.set(ipHash, recentHistory);
    return { allowed: false, reason: "daily" };
  }

  recentHistory.push(now);
  submissionLog.set(ipHash, recentHistory);
  return { allowed: true };
}

function checkLoginRateLimitInMemory(ipHash: string, normalizedEmail: string): LoginRateLimitResult {
  const ipAllowed = withinWindow(loginAttemptsByIp, ipHash, LOGIN_WINDOW_MS, LOGIN_LIMIT);
  const emailAllowed = withinWindow(
    loginAttemptsByEmail,
    normalizedEmail,
    LOGIN_WINDOW_MS,
    LOGIN_LIMIT,
  );

  if (!ipAllowed || !emailAllowed) {
    return { allowed: false, reason: !ipAllowed ? "ip" : "email" };
  }

  return { allowed: true };
}

// ---------------------------------------------------------------------------
// Redis-backed limiters — used whenever Upstash is configured. Each pair
// (hourly/daily, ip/email) is a separate Ratelimit instance rather than one
// shared window, per Upstash's own recommended pattern for combining
// multiple limits; each records independently in Redis, keyed by `prefix`.
// ---------------------------------------------------------------------------

const orderHourlyLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(HOURLY_LIMIT, "1 h"),
      prefix: "ratelimit:order:hourly",
    })
  : null;

const orderDailyLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(DAILY_LIMIT, "1 d"),
      prefix: "ratelimit:order:daily",
    })
  : null;

// timeout: 0 disables Ratelimit's own "treat a slow Redis call as success
// after 5s" default — admin login must fail CLOSED on Redis trouble
// (including a hang), not silently open just because it was slow rather
// than an outright error. See withManualTimeout below for the actual
// closed-on-timeout behaviour.
const loginIpLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(LOGIN_LIMIT, "15 m"),
      prefix: "ratelimit:login:ip",
      timeout: 0,
    })
  : null;

const loginEmailLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(LOGIN_LIMIT, "15 m"),
      prefix: "ratelimit:login:email",
      timeout: 0,
    })
  : null;

const LOGIN_REDIS_TIMEOUT_MS = 3000;

function withManualTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Redis call exceeded ${ms}ms`)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

export interface RateLimitResult {
  allowed: boolean;
  reason?: "hourly" | "daily";
}

/**
 * Order-submission rate limit — 5/hour and 20/day, by hashed IP.
 *
 * Fails OPEN: if Redis is unreachable, the request is allowed through.
 * Blocking a real customer's order because Redis had a bad moment is worse
 * than letting some spam through — the honeypot and min-time-on-form checks
 * in the checkout action still apply regardless.
 */
export async function checkRateLimit(ipHash: string): Promise<RateLimitResult> {
  if (!orderHourlyLimiter || !orderDailyLimiter) {
    return checkRateLimitInMemory(ipHash);
  }

  try {
    // Hourly first — a request the hourly limit already rejects must not
    // also consume a slot from the daily limit.
    const hourly = await orderHourlyLimiter.limit(ipHash);
    if (!hourly.success) {
      return { allowed: false, reason: "hourly" };
    }

    const daily = await orderDailyLimiter.limit(ipHash);
    if (!daily.success) {
      return { allowed: false, reason: "daily" };
    }

    return { allowed: true };
  } catch (error) {
    console.error(
      "[rate-limit] Redis error while checking the order rate limit — failing open (request allowed).",
      error,
    );
    return { allowed: true };
  }
}

// BLUEPRINT §6.1/§8.2 — admin login: 5 attempts per 15 minutes, per IP AND
// per email independently (either one tripping blocks the attempt).
export interface LoginRateLimitResult {
  allowed: boolean;
  reason?: "ip" | "email";
}

/**
 * Admin login rate limit — 5 attempts per 15 minutes, by IP and by email
 * independently.
 *
 * Fails CLOSED: if Redis is unreachable, the login attempt is rejected.
 * Unlike a customer order, a blocked admin can just retry once Redis is
 * back — but silently running an unthrottled login endpoint (even
 * temporarily) is a real credential-stuffing exposure.
 */
export async function checkLoginRateLimit(
  ipHash: string,
  email: string,
): Promise<LoginRateLimitResult> {
  const normalizedEmail = email.trim().toLowerCase();

  if (!loginIpLimiter || !loginEmailLimiter) {
    return checkLoginRateLimitInMemory(ipHash, normalizedEmail);
  }

  try {
    const [ipResult, emailResult] = await Promise.all([
      withManualTimeout(loginIpLimiter.limit(ipHash), LOGIN_REDIS_TIMEOUT_MS),
      withManualTimeout(loginEmailLimiter.limit(normalizedEmail), LOGIN_REDIS_TIMEOUT_MS),
    ]);

    if (!ipResult.success || !emailResult.success) {
      return { allowed: false, reason: !ipResult.success ? "ip" : "email" };
    }

    return { allowed: true };
  } catch (error) {
    console.error(
      "[rate-limit] Redis error while checking the admin login rate limit — failing closed (attempt rejected).",
      error,
    );
    return { allowed: false, reason: "ip" };
  }
}
