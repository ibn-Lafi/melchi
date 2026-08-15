import { NextResponse, type NextRequest } from "next/server";
import { updateSupabaseSession } from "@system2026/database/middleware";
import { DASHBOARD_ROLES } from "./lib/permissions";

const PUBLIC_PATHS = ["/login"];

export async function middleware(request: NextRequest) {
  const { response, user } = await updateSupabaseSession(request);
  const isPublicPath = PUBLIC_PATHS.some((path) => request.nextUrl.pathname.startsWith(path));

  const role = user?.app_metadata?.role;
  const isAuthorized = DASHBOARD_ROLES.includes(role);

  if ((!user || !isAuthorized) && !isPublicPath) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  if (user && isAuthorized && isPublicPath) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
