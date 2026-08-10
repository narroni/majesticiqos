import { redirect } from "next/navigation";

import { AdminShell } from "@/components/admin/admin-shell";
import { getAdminUser } from "@/lib/auth/get-admin-user";
import { createClient } from "@/lib/supabase/server";

// BLUEPRINT §6.1 — the actual security boundary. Runs on every request to
// anything under this group, independent of proxy.ts's fast-path redirect:
// being in auth.users is not enough, a matching admin_users row with
// is_active = true is required, checked fresh every time.
export default async function ProtectedAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await getAdminUser();

  if (!admin) {
    const supabase = await createClient();
    await supabase.auth.signOut();
    redirect("/admin/login?error=unauthorized");
  }

  return <AdminShell admin={admin}>{children}</AdminShell>;
}
