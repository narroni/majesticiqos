import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import createMiddleware from "next-intl/middleware";

import { routing } from "@/i18n/routing";

const handleI18nRouting = createMiddleware(routing);

export default async function proxy(request: NextRequest) {
  const isAdminRoute = request.nextUrl.pathname.startsWith("/admin");
  const isAdminLoginRoute = request.nextUrl.pathname === "/admin/login";

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
  matcher: ["/((?!api|design-system|_next|_vercel|.*\\..*).*)"],
};
