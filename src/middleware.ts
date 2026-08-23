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

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
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

  if (pathname === "/" || pathname === "/settings") {
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
    if (user && isAuthRoute(pathname) && request.method === "GET") {
      const [permissionCodes, portalRoute, roleCodes] = await Promise.all([
        resolveUserPermissionCodes(supabase, user.id),
        resolveUserPortalRoute(supabase, user.id),
        resolveUserRoleCodes(supabase, user.id),
      ]);
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = getPortalRedirectPath(
        permissionCodes,
        roleCodes.map((code) => ({ id: "", name: code, code, isSystemRole: true, status: "active" })),
        portalRoute,
      );
      redirectUrl.search = "";
      return NextResponse.redirect(redirectUrl);
    }

    return supabaseResponse;
  }

  if (!user) {
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
    const accountAllowed =
      cachedPermissionPayload.accountAllowed ??
      await userAccountAllowsPortalAccess(supabase, user.id);
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
      roleCodes = await resolveUserRoleCodes(supabase, user.id);
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
      const portalRoute = await resolveUserPortalRoute(supabase, user.id);
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname =
        normalizePortalRoute(portalRoute) ??
        getPortalRedirectPath(cachedPermissionCodes, [], portalRoute);
      redirectUrl.search = "";
      return NextResponse.redirect(redirectUrl);
    }

    return supabaseResponse;
  }

  const [accountAllowed, permissionCodes, roleCodes] = await Promise.all([
    userAccountAllowsPortalAccess(supabase, user.id),
    resolveUserPermissionCodes(supabase, user.id),
    resolveUserRoleCodes(supabase, user.id),
  ]);
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
    const portalRoute = await resolveUserPortalRoute(supabase, user.id);
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
