import { type NextRequest, NextResponse } from "next/server";

import { AUTH_ROUTES, PUBLIC_ROUTES } from "@/lib/auth/constants";
import {
  isIdleSessionExpired,
  parseActivityTimestamp,
  resolveActivityCookieMaxAge,
  shouldRefreshActivityInMiddleware,
  IDLE_ACTIVITY_COOKIE,
} from "@/lib/auth/idle-session";
import {
  attachPermissionCache,
  getCachedPermissionPayload,
} from "@/lib/auth/permission-cache";
import {
  resolveUserPermissionCodes,
  resolveUserPortalRoute,
  resolveUserRoleCodes,
  userAccountAllowsPortalAccess,
} from "@/lib/auth/permission-resolver";
import {
  canAccessPortalPath,
  getPortalRedirectPath,
  getPrimaryPortalRedirectForPath,
  normalizePortalRoute,
} from "@/lib/auth/portals";
import { HR_PORTAL_HOME } from "@/lib/auth/portal-paths";
import { SYSTEM_ADMIN_PERMISSION } from "@/lib/system-admin/constants";
import { isSystemAdminPath } from "@/lib/system-admin/paths";
import { updateSession } from "@/lib/supabase/middleware";

/** Bound permission RPCs so a slow DB cannot hold Edge middleware open. */
const MIDDLEWARE_PERMISSION_TIMEOUT_MS = 4_000;

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

async function withMiddlewareTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  label: string,
): Promise<T | null> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  try {
    const result = await Promise.race([
      promise,
      new Promise<null>((resolve) => {
        timeoutId = setTimeout(() => {
          console.error("[middleware] operation timed out", {
            label,
            timeoutMs,
          });
          resolve(null);
        }, timeoutMs);
      }),
    ]);
    return result;
  } catch (error) {
    console.error("[middleware] operation failed", {
      label,
      name: error instanceof Error ? error.name : "unknown",
      message: error instanceof Error ? error.message : "unknown",
    });
    return null;
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

function isAuthRoute(pathname: string): boolean {
  return (
    pathname === AUTH_ROUTES.login ||
    pathname === AUTH_ROUTES.forgotPassword
  );
}

function touchIdleActivityIfNeeded(
  request: NextRequest,
  response: NextResponse,
): void {
  if (
    !shouldRefreshActivityInMiddleware({
      method: request.method,
      pathname: request.nextUrl.pathname,
      headers: request.headers,
    })
  ) {
    return;
  }

  const rememberMe = request.cookies.get("remember_me")?.value === "1";
  response.cookies.set(IDLE_ACTIVITY_COOKIE, Date.now().toString(), {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: resolveActivityCookieMaxAge(rememberMe),
  });
}

async function signOutExpiredIdleSession(
  request: NextRequest,
  supabase: NonNullable<Awaited<ReturnType<typeof updateSession>>["supabase"]>,
): Promise<NextResponse> {
  try {
    await supabase.auth.signOut();
  } catch (error) {
    console.error("[middleware] idle session sign-out failed", error);
  }

  const redirectUrl = request.nextUrl.clone();
  redirectUrl.pathname = AUTH_ROUTES.login;
  redirectUrl.search = "expired=1";
  const redirectResponse = NextResponse.redirect(redirectUrl);
  redirectResponse.cookies.delete(IDLE_ACTIVITY_COOKIE);
  return redirectResponse;
}

export async function middleware(request: NextRequest) {
  const { supabase, supabaseResponse, user } = await updateSession(request);
  const { pathname, searchParams } = request.nextUrl;

  if (pathname === "/") {
    if (user) {
      let destination: string = HR_PORTAL_HOME;
      try {
        const cached = await getCachedPermissionPayload(request, user.id);
        if (cached) {
          destination = getPortalRedirectPath(
            cached.codes,
            (cached.roleCodes ?? []).map((code) => ({
              id: "",
              name: code,
              code,
              isSystemRole: true,
              status: "active" as const,
            })),
          );
        }
      } catch (error) {
        console.error("[middleware] home portal cache read failed", error);
      }

      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = destination;
      redirectUrl.search = "";
      return NextResponse.redirect(redirectUrl);
    }

    return supabaseResponse;
  }

  if (pathname === "/settings") {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = HR_PORTAL_HOME;
    redirectUrl.search = "";
    return NextResponse.redirect(redirectUrl);
  }

  if (pathname === "/executive" || pathname.startsWith("/executive/")) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = pathname.replace(/^\/executive/, "/ceo");
    return NextResponse.redirect(redirectUrl);
  }

  if (isPublicRoute(pathname)) {
    if (user && supabase && isAuthRoute(pathname) && request.method === "GET") {
      const cached = await getCachedPermissionPayload(request, user.id).catch(
        () => null,
      );
      if (cached) {
        const redirectUrl = request.nextUrl.clone();
        redirectUrl.pathname = getPortalRedirectPath(
          cached.codes,
          (cached.roleCodes ?? []).map((code) => ({
            id: "",
            name: code,
            code,
            isSystemRole: true,
            status: "active" as const,
          })),
        );
        redirectUrl.search = "";
        return NextResponse.redirect(redirectUrl);
      }

      const resolved = await withMiddlewareTimeout(
        Promise.all([
          resolveUserPermissionCodes(supabase, user.id),
          resolveUserPortalRoute(supabase, user.id),
          resolveUserRoleCodes(supabase, user.id),
        ]),
        MIDDLEWARE_PERMISSION_TIMEOUT_MS,
        "public-auth-portal-redirect",
      );

      if (!resolved) {
        // Session is valid; avoid 504. Layouts still enforce auth.
        const redirectUrl = request.nextUrl.clone();
        redirectUrl.pathname = HR_PORTAL_HOME;
        redirectUrl.search = "";
        return NextResponse.redirect(redirectUrl);
      }

      const [permissionCodes, portalRoute, roleCodes] = resolved;
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = getPortalRedirectPath(
        permissionCodes,
        roleCodes.map((code) => ({
          id: "",
          name: code,
          code,
          isSystemRole: true,
          status: "active" as const,
        })),
        portalRoute,
      );
      redirectUrl.search = "";
      return NextResponse.redirect(redirectUrl);
    }

    return supabaseResponse;
  }

  if (!user || !supabase) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = AUTH_ROUTES.login;
    redirectUrl.searchParams.set(
      "redirectTo",
      `${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ""}`,
    );

    if (searchParams.get("expired") === "1") {
      redirectUrl.searchParams.set("expired", "1");
    }

    return NextResponse.redirect(redirectUrl);
  }

  const lastActivity = parseActivityTimestamp(
    request.cookies.get(IDLE_ACTIVITY_COOKIE)?.value,
  );
  if (lastActivity && isIdleSessionExpired(lastActivity)) {
    if (supabase) {
      return signOutExpiredIdleSession(request, supabase);
    }

    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = AUTH_ROUTES.login;
    redirectUrl.search = "expired=1";
    return NextResponse.redirect(redirectUrl);
  }

  touchIdleActivityIfNeeded(request, supabaseResponse);

  if (pathname === AUTH_ROUTES.unauthorized) {
    return supabaseResponse;
  }

  let cachedPermissionPayload: Awaited<ReturnType<typeof getCachedPermissionPayload>> = null;
  try {
    cachedPermissionPayload = await getCachedPermissionPayload(request, user.id);
  } catch (error) {
    console.error("[middleware] permission cache read failed", error);
  }

  if (cachedPermissionPayload) {
    const cachedPermissionCodes = cachedPermissionPayload.codes;
    let accountAllowed = cachedPermissionPayload.accountAllowed;
    if (typeof accountAllowed !== "boolean") {
      const allowed = await withMiddlewareTimeout(
        userAccountAllowsPortalAccess(supabase, user.id),
        MIDDLEWARE_PERMISSION_TIMEOUT_MS,
        "cached-account-allowed",
      );
      if (allowed == null) {
        // Session is valid; avoid 504. Portal layouts still require a live profile.
        return supabaseResponse;
      }
      accountAllowed = allowed;
    }
    if (!accountAllowed) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = AUTH_ROUTES.login;
      redirectUrl.searchParams.set("suspended", "1");
      redirectUrl.search = redirectUrl.searchParams.toString();
      return NextResponse.redirect(redirectUrl);
    }

    if (
      isSystemAdminPath(pathname) &&
      !cachedPermissionCodes.includes(SYSTEM_ADMIN_PERMISSION)
    ) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = AUTH_ROUTES.unauthorized;
      redirectUrl.search = "";
      return NextResponse.redirect(redirectUrl);
    }

    let roleCodes = cachedPermissionPayload.roleCodes;
    if (!Array.isArray(roleCodes) || roleCodes.length === 0) {
      const resolvedRoles = await withMiddlewareTimeout(
        resolveUserRoleCodes(supabase, user.id),
        MIDDLEWARE_PERMISSION_TIMEOUT_MS,
        "cached-role-codes",
      );
      if (!resolvedRoles) {
        return supabaseResponse;
      }
      roleCodes = resolvedRoles;
      try {
        await attachPermissionCache(
          supabaseResponse,
          user.id,
          cachedPermissionCodes,
          accountAllowed,
          roleCodes,
        );
      } catch (error) {
        console.error("[middleware] permission cache upgrade failed", error);
      }
    }
    const primaryRedirect = getPrimaryPortalRedirectForPath(
      pathname,
      cachedPermissionCodes,
      roleCodes,
    );
    if (primaryRedirect) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = primaryRedirect;
      redirectUrl.search = "";
      return NextResponse.redirect(redirectUrl);
    }

    if (!canAccessPortalPath(pathname, cachedPermissionCodes, roleCodes)) {
      const portalRoute = await withMiddlewareTimeout(
        resolveUserPortalRoute(supabase, user.id),
        MIDDLEWARE_PERMISSION_TIMEOUT_MS,
        "cached-portal-route",
      );
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname =
        normalizePortalRoute(portalRoute) ??
        getPortalRedirectPath(cachedPermissionCodes, [], portalRoute);
      redirectUrl.search = "";
      return NextResponse.redirect(redirectUrl);
    }

    return supabaseResponse;
  }

  const bootstrapped = await withMiddlewareTimeout(
    Promise.all([
      userAccountAllowsPortalAccess(supabase, user.id),
      resolveUserPermissionCodes(supabase, user.id),
      resolveUserRoleCodes(supabase, user.id),
    ]),
    MIDDLEWARE_PERMISSION_TIMEOUT_MS,
    "permission-bootstrap",
  );

  if (!bootstrapped) {
    // Authenticated session is present; do not hold Edge open for a slow DB.
    // PortalShellLayout + RLS still enforce access on the page itself.
    return supabaseResponse;
  }

  const [accountAllowed, permissionCodes, roleCodes] = bootstrapped;
  if (!accountAllowed) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = AUTH_ROUTES.login;
    redirectUrl.searchParams.set("suspended", "1");
    redirectUrl.search = redirectUrl.searchParams.toString();
    return NextResponse.redirect(redirectUrl);
  }

  try {
    await attachPermissionCache(
      supabaseResponse,
      user.id,
      permissionCodes,
      accountAllowed,
      roleCodes,
    );
  } catch (error) {
    console.error("[middleware] permission cache attach failed", error);
  }

  if (isSystemAdminPath(pathname) && !permissionCodes.includes(SYSTEM_ADMIN_PERMISSION)) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = AUTH_ROUTES.unauthorized;
    redirectUrl.search = "";
    return NextResponse.redirect(redirectUrl);
  }

  const primaryRedirect = getPrimaryPortalRedirectForPath(
    pathname,
    permissionCodes,
    roleCodes,
  );
  if (primaryRedirect) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = primaryRedirect;
    redirectUrl.search = "";
    return NextResponse.redirect(redirectUrl);
  }

  if (!canAccessPortalPath(pathname, permissionCodes, roleCodes)) {
    const portalRoute = await withMiddlewareTimeout(
      resolveUserPortalRoute(supabase, user.id),
      MIDDLEWARE_PERMISSION_TIMEOUT_MS,
      "portal-route",
    );
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname =
      normalizePortalRoute(portalRoute) ??
      getPortalRedirectPath(permissionCodes, [], portalRoute);
    redirectUrl.search = "";
    return NextResponse.redirect(redirectUrl);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
