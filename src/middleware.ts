import { type NextRequest, NextResponse } from "next/server";

import { AUTH_ROUTES, PUBLIC_ROUTES } from "@/lib/auth/constants";
import {
  attachPermissionCache,
  getCachedPermissionPayload,
} from "@/lib/auth/permission-cache";
import {
  resolveUserPermissionCodes,
  resolveUserPortalRoute,
  userAccountAllowsPortalAccess,
} from "@/lib/auth/permission-resolver";
import {
  canAccessPortalPath,
  getPortalRedirectPath,
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

function isNavigationPrefetch(request: NextRequest) {
  return request.headers.get("next-router-prefetch") === "1";
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
      const [permissionCodes, portalRoute] = await Promise.all([
        resolveUserPermissionCodes(supabase, user.id),
        resolveUserPortalRoute(supabase, user.id),
      ]);
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = getPortalRedirectPath(permissionCodes, [], portalRoute);
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

  if (pathname === AUTH_ROUTES.unauthorized) {
    return supabaseResponse;
  }

  if (isNavigationPrefetch(request)) {
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

    if (!canAccessPortalPath(pathname, cachedPermissionCodes)) {
      const portalRoute = await resolveUserPortalRoute(supabase, user.id);
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname =
        normalizePortalRoute(portalRoute) ?? getPortalRedirectPath(cachedPermissionCodes);
      redirectUrl.search = "";
      return NextResponse.redirect(redirectUrl);
    }

    return supabaseResponse;
  }

  const [accountAllowed, permissionCodes] = await Promise.all([
    userAccountAllowsPortalAccess(supabase, user.id),
    resolveUserPermissionCodes(supabase, user.id),
  ]);
  if (!accountAllowed) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = AUTH_ROUTES.login;
    redirectUrl.searchParams.set("suspended", "1");
    redirectUrl.search = redirectUrl.searchParams.toString();
    return NextResponse.redirect(redirectUrl);
  }

  try {
    await attachPermissionCache(supabaseResponse, user.id, permissionCodes, accountAllowed);
  } catch (error) {
    console.error("[middleware] permission cache attach failed", error);
  }

  if (isSystemAdminPath(pathname) && !permissionCodes.includes(SYSTEM_ADMIN_PERMISSION)) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = AUTH_ROUTES.unauthorized;
    redirectUrl.search = "";
    return NextResponse.redirect(redirectUrl);
  }

  if (!canAccessPortalPath(pathname, permissionCodes)) {
    const portalRoute = await resolveUserPortalRoute(supabase, user.id);
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = normalizePortalRoute(portalRoute) ?? getPortalRedirectPath(permissionCodes);
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
