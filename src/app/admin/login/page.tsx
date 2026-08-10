import type { Metadata } from "next";

import { AdminLoginForm } from "@/components/admin/admin-login-form";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: "Admin login",
};

interface AdminLoginPageProps {
  searchParams: Promise<{ error?: string }>;
}

export default async function AdminLoginPage({ searchParams }: AdminLoginPageProps) {
  const { error } = await searchParams;

  return (
    <div className="flex min-h-dvh flex-1 items-center justify-center px-4 py-16">
      <div className="flex w-full max-w-sm flex-col gap-8">
        <div className="flex flex-col gap-1 text-center">
          <span className="font-display text-fg-primary text-lg tracking-[0.1em] uppercase">
            {siteConfig.name} Admin
          </span>
          <p className="text-fg-secondary font-body text-sm">Sign in to manage the store.</p>
        </div>

        <AdminLoginForm
          initialError={
            error === "unauthorized" ? "This account doesn't have admin access." : undefined
          }
        />
      </div>
    </div>
  );
}
