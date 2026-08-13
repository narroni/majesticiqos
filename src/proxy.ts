import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import createMiddleware from "next-intl/middleware";

import { routing } from "@/i18n/routing";

const handleI18nRouting = createMiddleware(routing);

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Dotfile-style probes (/.env, /.env.local, /.git/config, ...) bypass the
  // matcher below (it excludes any path with a dot, so real static assets in
  // public/ pass straight through to Next's own file serving) but are still
  // handled by the app router as a fallback — and, having a first segment
  // that isn't "en"/"sq"/"admin"/"design-system", they'd reach
  // [locale]/layout.tsx's notFound() before it ever renders its own
  // <html>/<body>. This app intentionally has three independent root
  // layouts (admin/, design-system/, [locale]/) and no shared one, so there
  // was nothing to supply those tags — Next returned a 500 instead of a
  // clean 404. Rejecting these here, before any App Router rendering,
  // sidesteps that entirely.
  if (pathname.startsWith("/.")) {
    return new NextResponse(null, { status: 404 });
  }

  const isAdminRoute = pathname.startsWith("/admin");
  const isAdminLoginRoute = pathname === "/admin/login";

  // Admin is English-only and must never be locale-prefixed, so it skips
  // next-intl's routing entirely rather than being excluded from the
  // matcher — it still needs to pass through below for session refresh.
  const response = isAdminRoute
    ? NextResponse.next({ request })
    : handleI18nRouting(request);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Revalidates the session against the Supabase Auth server and refreshes
  // it if needed, writing updated cookies onto `response` via `setAll` above.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // BLUEPRINT §6.1 — fast-path redirect when there's no session at all.
  // This is a UX convenience only, NOT the security boundary: the admin
  // layout (a Server Component) independently re-verifies admin_users
  // membership on every request regardless of what happens here, since a
  // present session cookie proves nothing about admin status.
  if (isAdminRoute && !isAdminLoginRoute && !user) {
    const redirectResponse = NextResponse.redirect(new URL("/admin/login", request.url));
    response.cookies.getAll().forEach((cookie) => redirectResponse.cookies.set(cookie));
    return redirectResponse;
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!api|design-system|_next|_vercel|.*\\..*).*)",
    // Dotfile-style probes only — the pattern above deliberately excludes
    // every dotted path (real static assets in public/ need to reach Next's
    // own file serving untouched), so this narrowly re-includes paths whose
    // first segment starts with a literal dot.
    "/(\\..*)",
  ],
};
