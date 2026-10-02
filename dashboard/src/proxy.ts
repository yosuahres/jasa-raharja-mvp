import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

import { supabaseEnv } from "@/lib/supabase/env";

const AUTH_PAGES = ["/sign-in", "/sign-up"];

/**
 * Refreshes the Supabase session on every page request and keeps signed-out
 * visitors on the auth pages. Data access itself is enforced by row-level
 * security in the database, not here.
 */
export async function proxy(request: NextRequest) {
  const { url, key } = supabaseEnv();
  let response = NextResponse.next({ request });

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet, headers) => {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, options);
        for (const [header, value] of Object.entries(headers ?? {})) response.headers.set(header, value);
      },
    },
  });

  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims);
  const onAuthPage = AUTH_PAGES.some((path) => request.nextUrl.pathname.startsWith(path));

  if (!signedIn && !onAuthPage) return redirectKeepingCookies(request, "/sign-in", response);
  if (signedIn && onAuthPage) return redirectKeepingCookies(request, "/", response);
  return response;
}

const redirectKeepingCookies = (request: NextRequest, path: string, from: NextResponse) => {
  const redirect = NextResponse.redirect(new URL(path, request.url));
  for (const cookie of from.cookies.getAll()) redirect.cookies.set(cookie);
  return redirect;
};

export const config = {
  // Every page, but not static files or images.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|apple-icon.png|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
