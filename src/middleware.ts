import { type NextRequest, NextResponse } from "next/server";

import { AUTH_ROUTES, PUBLIC_ROUTES } from "@/lib/auth/constants";
import { updateSession } from "@/lib/supabase/middleware";

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

function isAuthRoute(pathname: string): boolean {
  return (
    pathname === AUTH_ROUTES.login ||
    pathname === AUTH_ROUTES.forgotPassword ||
    pathname === AUTH_ROUTES.resetPassword
  );
}

export async function middleware(request: NextRequest) {
  const { supabaseResponse, user } = await updateSession(request);
  const { pathname, searchParams } = request.nextUrl;

  if (isPublicRoute(pathname)) {
    if (user && isAuthRoute(pathname)) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = AUTH_ROUTES.dashboard;
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

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
