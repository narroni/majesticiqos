import "server-only";

import { createHash } from "node:crypto";

// TODO(production): this is a process-local, in-memory limiter. It resets on
// every deploy/restart and does not share state across multiple server
// instances — fine for a single-region low-volume store during development,
// but must be replaced with Upstash Redis (BLUEPRINT §8.2) before launch, or
// a scaled deployment lets each instance independently grant its own 5/hour
// and 20/day, multiplying the real limit by instance count.
const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

const HOURLY_LIMIT = 5;
const DAILY_LIMIT = 20;

const submissionLog = new Map<string, number[]>();

// Never a real production secret rotation strategy — just enough that raw
// IPs never sit in memory or logs unhashed. Set IP_HASH_SALT in production.
const IP_HASH_SALT = process.env.IP_HASH_SALT ?? "ember-dev-salt-not-for-production";

export function hashIp(ip: string): string {
  return createHash("sha256").update(`${IP_HASH_SALT}:${ip}`).digest("hex");
}

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

export interface RateLimitResult {
  allowed: boolean;
  reason?: "hourly" | "daily";
}

export function checkRateLimit(ipHash: string): RateLimitResult {
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

// BLUEPRINT §6.1/§8.2 — admin login: 5 attempts per 15 minutes, per IP AND
// per email independently (either one tripping blocks the attempt). Same
// in-memory caveat as above: needs Redis before production, and before a
// multi-instance deployment — each instance would otherwise grant its own
// separate 5, multiplying the real limit by instance count.
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_LIMIT = 5;

const loginAttemptsByIp = new Map<string, number[]>();
const loginAttemptsByEmail = new Map<string, number[]>();

export interface LoginRateLimitResult {
  allowed: boolean;
  reason?: "ip" | "email";
}

export function checkLoginRateLimit(ipHash: string, email: string): LoginRateLimitResult {
  const normalizedEmail = email.trim().toLowerCase();
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
