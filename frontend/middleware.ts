import { NextRequest, NextResponse } from "next/server";

const PUBLIC_ADMIN_PATHS = ["/admin/login"];

export function middleware(req: NextRequest) {
    const { pathname } = req.nextUrl;

    // Seules les routes /admin/* sont protégées
    if (!pathname.startsWith("/admin")) return NextResponse.next();

    // Laisser passer la page de login
    if (PUBLIC_ADMIN_PATHS.some((p) => pathname.startsWith(p))) {
        return NextResponse.next();
    }

    // Vérifier le cookie posé par adminAuthSlice.setToken
    const token = req.cookies.get("admin_token")?.value;

    if (!token) {
        const loginUrl = req.nextUrl.clone();
        loginUrl.pathname = "/admin/login";
        loginUrl.searchParams.set("next", pathname);
        return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
}

export const config = {
    matcher: ["/admin/:path*"],
};
