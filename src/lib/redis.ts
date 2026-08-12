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
const url = process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN;

export const redis = url && token ? new Redis({ url, token }) : null;

if (!redis) {
  const message =
    "[redis] UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN are not set. " +
    "Falling back to in-memory rate limiting and idempotency caching. This is " +
    "fine for local development, but MUST NOT happen in production: in-memory " +
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
