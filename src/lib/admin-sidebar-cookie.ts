// Deliberately its own plain (non-"use client") module: a "use client" file's
// exports — even a plain string constant — become client-reference proxies
// when imported by a Server Component, so the server layout that needs the
// real string to call cookies().get() can't import it from admin-shell.tsx
// directly (this silently breaks — no build error, just a stub value at
// runtime that never matches any real cookie).
export const ADMIN_SIDEBAR_COLLAPSED_COOKIE = "admin-sidebar-collapsed";
export const ADMIN_SIDEBAR_COLLAPSED_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;
