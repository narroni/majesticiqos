import type { Metadata } from "next";

import { fontVariables } from "@/app/fonts";
import { AppProviders } from "@/components/providers/app-providers";

import "../globals.css";

export const metadata: Metadata = {
  title: "Design system review",
  description: "Internal design system review tool.",
};

export default function DesignSystemLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${fontVariables} dark h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
