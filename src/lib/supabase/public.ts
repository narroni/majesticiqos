import "server-only";

import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";

interface CacheConfig {
  revalidate?: number | false;
  tags?: string[];
}

/**
 * Anon-key client with no cookie access at all — for anon-only storefront
 * reads (products, categories, shipping rates). Using this instead of the
 * cookie-aware server client is what lets these routes stay static/ISR:
 * calling `cookies()` anywhere in a render forces the whole route dynamic,
 * even for reads that never touch a session.
 *
 * `cache` bakes Next.js's `next: {revalidate, tags}` fetch directive into
 * every request this client instance makes, via a custom `fetch` — see
 * BLUEPRINT §1.2 for the per-entity revalidate/tag values. Create a fresh
 * instance per call with the tags that call actually needs; instances are
 * cheap (no network I/O happens at construction time).
 */
export function createPublicClient(cache?: CacheConfig) {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      global: cache
        ? {
            fetch: (input, init) => fetch(input, { ...init, next: cache }),
          }
        : undefined,
    },
  );
}
