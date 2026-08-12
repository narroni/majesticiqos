"use server";

import "server-only";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getAdminUser } from "@/lib/auth/get-admin-user";
import { checkLoginRateLimit, hashIp } from "@/lib/rate-limit";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

export interface AdminLoginState {
  error?: string;
}

// BLUEPRINT §6.1/§8.2. Deliberately vague on failure — never reveals
// whether an email exists, whether the password was wrong, or whether the
// account simply isn't an admin, beyond the one case that needs a distinct
// message so a legitimate but de-authorized admin understands what happened.
export async function signInAdmin(
  _prevState: AdminLoginState,
  formData: FormData,
): Promise<AdminLoginState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: "Enter a valid email and password." };
  }

  const headerList = await headers();
  const ip =
    headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headerList.get("x-real-ip") ||
    "unknown";
  const ipHash = hashIp(ip);

  if (!(await checkLoginRateLimit(ipHash, parsed.data.email)).allowed) {
    return { error: "Too many attempts. Try again in a few minutes." };
  }

  const supabase = await createClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (signInError) {
    return { error: "Invalid email or password." };
  }

  // Being in auth.users is not enough — require a matching, active
  // admin_users row, and sign out immediately if there isn't one.
  const admin = await getAdminUser();
  if (!admin) {
    await supabase.auth.signOut();
    return { error: "This account doesn't have admin access." };
  }

  // Uses the service role client: admin_users has no self-UPDATE RLS
  // policy (only self-SELECT), and it should stay that way — an admin
  // updating their own row is otherwise a path to self-promoting role or
  // is_active. This one field is safe to write server-side because the
  // value (now()) is never client input.
  await supabaseAdmin
    .from("admin_users")
    .update({ last_login_at: new Date().toISOString() })
    .eq("id", admin.id);

  redirect("/admin");
}

export async function signOutAdmin(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}
