import { NextResponse, type NextRequest } from "next/server";
import { updateSupabaseSession } from "@system2026/database/middleware";

const PUBLIC_PATHS = ["/login"];

export async function middleware(request: NextRequest) {
  const { response, user } = await updateSupabaseSession(request);
  const isPublicPath = PUBLIC_PATHS.some((path) => request.nextUrl.pathname.startsWith(path));
  const isAuthorized = user?.app_metadata?.role === "rep";

  if ((!user || !isAuthorized) && !isPublicPath) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (user && isAuthorized && isPublicPath) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
