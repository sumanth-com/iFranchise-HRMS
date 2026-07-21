import { type NextRequest, NextResponse } from "next/server";

import { AUTH_ROUTES, PUBLIC_ROUTES } from "@/lib/auth/constants";
import {
  canAccessPortalPath,
  getPortalRedirectPath,
} from "@/lib/auth/portals";
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

async function loadPermissionCodes(
  supabase: Awaited<ReturnType<typeof updateSession>>["supabase"],
  userId: string,
) {
  if (!supabase) return [];

  const { data: userRoles, error: userRolesError } = await supabase
    .schema("hrms")
    .from("user_roles")
    .select("role_id")
    .eq("user_id", userId)
    .eq("status", "active")
    .is("deleted_at", null);

  if (userRolesError || !userRoles?.length) return [];

  const roleIds = [...new Set(userRoles.map((row) => row.role_id as string))];
  const { data: rolePermissions, error: rolePermissionsError } = await supabase
    .schema("hrms")
    .from("role_permissions")
    .select("permission_id")
    .in("role_id", roleIds)
    .eq("status", "active")
    .is("deleted_at", null);

  if (rolePermissionsError || !rolePermissions?.length) return [];

  const permissionIds = [
    ...new Set(rolePermissions.map((row) => row.permission_id as string)),
  ];
  const { data: permissions, error: permissionsError } = await supabase
    .schema("hrms")
    .from("permissions")
    .select("code")
    .in("id", permissionIds)
    .eq("status", "active")
    .is("deleted_at", null);

  if (permissionsError || !permissions?.length) return [];
  return permissions.map((permission) => permission.code as string);
}

export async function middleware(request: NextRequest) {
  const { supabase, supabaseResponse, user } = await updateSession(request);
  const { pathname, searchParams } = request.nextUrl;

  if (isPublicRoute(pathname)) {
    // Only redirect page navigations — server actions POST to /login and must not
    // receive a 307 HTML redirect or the client shows "unexpected response".
    if (user && isAuthRoute(pathname) && request.method === "GET") {
      const permissionCodes = await loadPermissionCodes(supabase, user.id);
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = getPortalRedirectPath(permissionCodes);
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

  const permissionCodes = await loadPermissionCodes(supabase, user.id);
  if (!canAccessPortalPath(pathname, permissionCodes)) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = getPortalRedirectPath(permissionCodes);
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
