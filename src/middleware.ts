import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth;

  const publicPaths = ["/login", "/register"];
  const isPublicPath = publicPaths.some((path) => pathname.startsWith(path));

  if (isPublicPath) {
    if (isLoggedIn) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    return NextResponse.next();
  }

  // M-Pesa callbacks come from Safaricom, no auth required
  if (pathname.startsWith("/api/mpesa")) {
    return NextResponse.next();
  }

  if (!isLoggedIn && !pathname.startsWith("/api/auth")) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // Tenant portal protection (only /tenant/... paths, not /tenants)
  if ((pathname === "/tenant" || pathname.startsWith("/tenant/")) && req.auth?.user?.role !== "TENANT") {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  // Landlord route protection
  const landlordPaths = ["/properties", "/units", "/tenants", "/payments", "/invoices", "/maintenance"];
  const isLandlordPath = landlordPaths.some((path) => pathname === path || pathname.startsWith(path + "/"));
  if (isLandlordPath && req.auth?.user?.role === "TENANT") {
    return NextResponse.redirect(new URL("/tenant/dashboard", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
