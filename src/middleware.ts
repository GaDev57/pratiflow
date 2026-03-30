import { type NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  // Session refresh and auth redirects are handled by server components
  // (dashboard layout redirects to /login, auth pages redirect to /dashboard)
  // This middleware is kept minimal for Netlify Edge Function compatibility
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
