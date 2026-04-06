import { NextRequest, NextResponse } from "next/server";

const ADMIN_PANEL_PREFIX = "/admin";
const LOGIN_PATH = "/admin/login";

export function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Ne protéger que les routes /admin/* (sauf /admin/login)
    if (!pathname.startsWith(ADMIN_PANEL_PREFIX) || pathname === LOGIN_PATH) {
        return NextResponse.next();
    }

    // Le token est stocké côté client uniquement (localStorage).
    // Pour la protection SSR, on vérifie un cookie optionnel.
    // Si absent, on redirige vers login — le client hydratera ensuite.
    const token = request.cookies.get("admin_token")?.value;

    if (!token) {
        const loginUrl = request.nextUrl.clone();
        loginUrl.pathname = LOGIN_PATH;
        return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
}

export const config = {
    matcher: ["/admin/:path*"],
};
