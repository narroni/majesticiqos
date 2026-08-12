import "server-only";

import { Redis } from "@upstash/redis";

// Single shared client, created once at module load (outside any request
// handler) so connections are reused across invocations on a warm
// serverless instance — the pattern Upstash's own docs recommend.
//
// `null` when the env vars aren't set, rather than throwing: local dev
// shouldn't require a Redis account. Every caller (rate-limit.ts,
// checkout.ts's idempotency cache) must handle the `null` case by falling
// back to in-memory behaviour, and must treat a *configured* client that
// still throws at request time (Redis down/unreachable) as a separate,
// deliberate failure mode — see each caller's own fail-open/fail-closed
// reasoning.
//
// Two naming schemes, same database: UPSTASH_REDIS_REST_URL/TOKEN is what
// you get creating a database directly on Upstash; KV_REST_API_URL/TOKEN is
// what Vercel's Upstash Marketplace integration injects instead (a legacy
// name carried over from the old Vercel KV product). Prefer the UPSTASH_
// names when both are somehow set.
const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

export const redis = url && token ? new Redis({ url, token }) : null;

if (!redis) {
  const message =
    "[redis] Neither UPSTASH_REDIS_REST_URL/TOKEN nor KV_REST_API_URL/TOKEN are " +
    "set. Falling back to in-memory rate limiting and idempotency caching. This " +
    "is fine for local development, but MUST NOT happen in production: in-memory " +
    "state resets on every deploy/restart and is not shared across serverless " +
    "instances, so spam protection and double-submit protection are effectively " +
    "disabled. See README/deployment notes for Upstash setup.";

  // Vercel sets VERCEL_ENV=production only on production deployments (preview
  // and dev deployments get "preview"/"development") — that's the signal
  // worth escalating on, not just NODE_ENV, which is "production" for every
  // `next build` including previews.
  if (process.env.VERCEL_ENV === "production") {
    console.error(message);
  } else {
    console.warn(message);
  }
}
