import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Refresh the Supabase session on every matched request and guard /app/**.
 * Returns a response with refreshed auth cookies. If an unauthenticated user
 * hits a protected route we redirect to /login?next=<original path>.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  // Not configured yet (e.g. a first deploy before the database exists): the
  // public pages (landing, /demo) still work; the app itself sends people to
  // sign-in, which explains that accounts are not open yet.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    if (request.nextUrl.pathname.startsWith("/app")) {
      const login = request.nextUrl.clone();
      login.pathname = "/login";
      login.search = "";
      return NextResponse.redirect(login);
    }
    return response;
  }

  const supabase = createServerClient(
    url,
    anonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // IMPORTANT: getUser() revalidates the token with Supabase Auth. Do not put
  // logic between createServerClient and getUser or sessions may not refresh.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isProtected = pathname.startsWith("/app");

  if (isProtected && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("next", pathname + request.nextUrl.search);
    return NextResponse.redirect(url);
  }

  return response;
}
