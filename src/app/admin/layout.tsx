import type { Metadata } from "next";

import { fontVariables } from "@/app/fonts";
import { Toaster } from "@/components/ui/sonner";

import "../globals.css";

// Applies to every route under /admin, including /admin/login — the whole
// tree is internal-only (BLUEPRINT §8.2) and must never be indexed or show
// up in the sitemap (there is no sitemap entry generator for it either).
export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

// A separate root layout (its own <html>/<body>) rather than nesting under
// [locale] — admin is English-only and never locale-prefixed, so it isn't
// part of next-intl's routing tree at all (see proxy.ts).
export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${fontVariables} dark h-full antialiased`}>
      <body className="bg-bg-base flex min-h-full flex-col">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
