// Global 404 for requests that match none of this app's three root layouts
// (admin/, design-system/, [locale]/ — see next.config.ts's globalNotFound
// comment). Bypasses normal layout rendering entirely, so global styles and
// fonts have to be imported directly here rather than inherited.
import type { Metadata } from "next";

import { fontVariables } from "@/app/fonts";

import "./globals.css";

export const metadata: Metadata = {
  title: "Not Found",
  description: "The page you are looking for does not exist.",
};

export default function GlobalNotFound() {
  return (
    <html lang="en" className={`${fontVariables} dark h-full antialiased`}>
      <body className="flex min-h-full flex-col items-center justify-center bg-bg-base text-center">
        <h1 className="text-h2 font-display text-fg-primary">404</h1>
        <p className="text-fg-secondary font-body mt-2">Page not found.</p>
      </body>
    </html>
  );
}
