import { NextResponse } from "next/server";
import { auth } from "@/auth";

export default auth(async (request) => {
  const { pathname } = request.nextUrl;

  if (
    pathname === "/" ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/sign") ||
    pathname.startsWith("/pdfjs") ||
    pathname === "/api/chat"
  ) {
    return NextResponse.next();
  }

  if (request.auth) {
    return NextResponse.next();
  }

  return Response.redirect(new URL("/auth/sign-in", request.nextUrl.origin));
});

export const config = {
  matcher: [
    // Skip Next.js internals, static files, and certain file types
    "/((?!_next|manifest\\.json|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
