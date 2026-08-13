import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { fontVariables } from "@/app/fonts";
import { AppProviders } from "@/components/providers/app-providers";
import { getAdminUser } from "@/lib/auth/get-admin-user";

import "../globals.css";

export const metadata: Metadata = {
  title: "Design system review",
  description: "Internal design system review tool.",
};

// Internal dev/QA tool, not part of the storefront or admin route trees, so
// it doesn't inherit the admin layout's auth check — it needs its own. Same
// gate as src/app/admin/(protected)/layout.tsx (an authenticated, active
// admin_users row), just without AdminShell's chrome, since this page is
// meant to preview the design system full-bleed, not inside the admin nav.
export default async function DesignSystemLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await getAdminUser();

  if (!admin) {
    redirect("/admin/login?error=unauthorized");
  }

  return (
    <html lang="en" className={`${fontVariables} dark h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
