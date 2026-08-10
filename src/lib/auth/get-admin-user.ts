import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database";

export type AdminUser = Tables<"admin_users">;

/**
 * The one place that answers "is the current request an authenticated,
 * active admin?" — BLUEPRINT §6.1: being in auth.users is not enough, a
 * matching admin_users row with is_active = true is required. Reused by:
 *   - the admin layout (Server Component), which redirects on null
 *   - every admin Server Action, which must independently re-verify this
 *     itself before doing any work — Server Actions are publicly reachable
 *     endpoints, and a UI guard on the page that "normally" calls them is
 *     not a security boundary.
 *
 * Relies on RLS (admin_users_select_own: id = auth.uid()) rather than the
 * service role — an anon-session user can only ever read their own row,
 * so this can never be tricked into confirming someone else's admin status.
 */
export async function getAdminUser(): Promise<AdminUser | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: admin } = await supabase
    .from("admin_users")
    .select("*")
    .eq("id", user.id)
    .eq("is_active", true)
    .maybeSingle();

  return admin;
}
