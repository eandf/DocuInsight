export { auth as middleware } from "@/auth";

// import { NextResponse } from "next/server";
// import { auth } from "@/auth";

// export default auth(async (req) => {
//   const { pathname } = req.nextUrl;

//   console.log("MIDDLEWARE:", pathname);

//   // 1. Allow any request under `/auth` to pass through without restriction
//   if (pathname.startsWith("/auth")) {
//     return NextResponse.next();
//   }

//   // 2. For all other routes, redirect to sign-in if not authenticated
//   if (!req.auth) {
//     return Response.redirect(new URL("/auth/sign-in", req.nextUrl.origin));
//   }

//   // Otherwise, allow the request to continue
//   return NextResponse.next();
// });

// export const config = {
//   matcher: [
//     // Skip Next.js internals, static files, and certain file types
//     "/((?!_next|manifest\\.json|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
//     // Always run for API routes
//     "/(api|trpc)(.*)",
//   ],
// };
