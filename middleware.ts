import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/types/supabase";

let maintenanceCache: { enabled: boolean; expires: number } | null = null;

async function isMaintenanceMode(
  supabase: ReturnType<typeof createServerClient<Database>>
): Promise<boolean> {
  const now = Date.now();
  if (maintenanceCache && maintenanceCache.expires > now) {
    return maintenanceCache.enabled;
  }

  try {
    const { data } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", "maintenance")
      .maybeSingle();

    let enabled = false;
    if (data?.value) {
      if (typeof data.value === "boolean") {
        enabled = data.value;
      } else if (
        typeof data.value === "object" &&
        data.value !== null &&
        "enabled" in data.value
      ) {
        enabled = Boolean((data.value as { enabled: unknown }).enabled);
      }
    }

    maintenanceCache = { enabled, expires: now + 30_000 };
    return enabled;
  } catch {
    return false;
  }
}

function copyCookiesAndHeaders(from: NextResponse, to: NextResponse) {
  from.cookies.getAll().forEach((cookie) => {
    to.cookies.set(cookie);
  });
  const reqId = from.headers.get("x-request-id");
  if (reqId) {
    to.headers.set("x-request-id", reqId);
  }
  return to;
}

export async function middleware(request: NextRequest) {
  const requestId = crypto.randomUUID();
  let supabaseResponse = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });
  supabaseResponse.headers.set("x-request-id", requestId);

  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    "";

  const supabase = createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        supabaseResponse = NextResponse.next({
          request,
        });
        supabaseResponse.headers.set("x-request-id", requestId);
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // Fetch profile if user is logged in
  let isAdmin = false;
  let isOnboarded = false;
  let isRestricted = false;

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_admin, onboarded_at, status")
      .eq("id", user.id)
      .maybeSingle();

    isAdmin = Boolean(profile?.is_admin);
    isOnboarded = Boolean(profile?.onboarded_at);
    isRestricted = Boolean(profile && profile.status !== "active");
  }

  // 1. Maintenance mode check
  const isExcludedFromMaintenance =
    pathname === "/maintenance" ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/api");

  if (!isExcludedFromMaintenance && !isAdmin) {
    const inMaintenance = await isMaintenanceMode(supabase);
    if (inMaintenance) {
      const rewriteUrl = new URL("/maintenance", request.url);
      const res = NextResponse.rewrite(rewriteUrl);
      return copyCookiesAndHeaders(supabaseResponse, res);
    }
  }

  // Protected route definitions
  const isAppRoute =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/profile") ||
    pathname.startsWith("/settings") ||
    pathname.startsWith("/subscription") ||
    pathname.startsWith("/notifications") ||
    /^\/tournaments\/[^/]+\/apply-(player|team)\/?$/.test(pathname) ||
    pathname === "/player" ||
    pathname.startsWith("/player/") ||
    pathname === "/manager" ||
    pathname.startsWith("/manager/") ||
    pathname === "/organizer" ||
    pathname.startsWith("/organizer/");

  const isAdminRoute = pathname.startsWith("/admin");
  const isAuthEntryRoute = pathname === "/login" || pathname === "/signup";

  // 2. Logged-out users visiting app/admin routes -> redirect to /login?next=...
  if (!user && (isAppRoute || isAdminRoute)) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname + request.nextUrl.search);
    const res = NextResponse.redirect(loginUrl);
    return copyCookiesAndHeaders(supabaseResponse, res);
  }

  // 2b. Suspended or banned users are blocked from the app (public pages stay open).
  if (user && isRestricted && !isAdmin && (isAppRoute || isAdminRoute || pathname === "/onboarding")) {
    const res = NextResponse.redirect(new URL("/suspended", request.url));
    return copyCookiesAndHeaders(supabaseResponse, res);
  }

  // 3. Logged-in users visiting /login or /signup -> redirect away
  if (user && isAuthEntryRoute) {
    const nextParam = request.nextUrl.searchParams.get("next");
    const target =
      nextParam && nextParam.startsWith("/") ? nextParam : "/dashboard";
    const res = NextResponse.redirect(new URL(target, request.url));
    return copyCookiesAndHeaders(supabaseResponse, res);
  }

  // 4. Logged-in users onboarding check
  if (user) {
    const isSpecialRoute =
      pathname.startsWith("/auth") ||
      pathname.startsWith("/api") ||
      pathname === "/logout" ||
      pathname === "/suspended" ||
      pathname === "/maintenance";

    if (!isOnboarded && !isSpecialRoute && pathname !== "/onboarding") {
      const res = NextResponse.redirect(new URL("/onboarding", request.url));
      return copyCookiesAndHeaders(supabaseResponse, res);
    }

    if (isOnboarded && pathname === "/onboarding") {
      const res = NextResponse.redirect(new URL("/dashboard", request.url));
      return copyCookiesAndHeaders(supabaseResponse, res);
    }
  }

  // 5. Admin protection: block /admin unless profiles.is_admin
  if (isAdminRoute && !isAdmin) {
    // Non-admins get a plain 404, not a hint that the area exists.
    const res = NextResponse.rewrite(new URL("/__not-found", request.url), { status: 404 });
    return copyCookiesAndHeaders(supabaseResponse, res);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
