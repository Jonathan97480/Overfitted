"use client";
import { usePathname } from "next/navigation";
import { Bell } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const TITLES: Record<string, string> = {
    "/admin": "Dashboard",
    "/admin/designs": "Designs",
    "/admin/orders": "Commandes",
    "/admin/products": "Produits",
    "/admin/users": "Utilisateurs",
    "/admin/promo": "Codes promo",
    "/admin/stats": "Statistiques",
    "/admin/settings": "Paramètres",
    "/admin/catalogue": "Catalogue",
    "/admin/invoices": "Factures",
};

function getTitle(pathname: string): string {
    // Exact match first
    if (TITLES[pathname]) return TITLES[pathname];
    // Dynamic route: /admin/designs/[id]
    const designsMatch = pathname.match(/^\/admin\/designs\/(\d+)$/);
    if (designsMatch) return `Design #${designsMatch[1]}`;
    // Fallback: longest prefix
    const found = Object.entries(TITLES)
        .reverse()
        .find(([prefix]) => pathname.startsWith(prefix + "/"));
    return found?.[1] ?? "Admin";
}

export function AdminTopbar() {
    const pathname = usePathname();
    const title = getTitle(pathname);

    return (
        <header
            style={{
                background: "var(--admin-sidebar)",
                borderBottom: "1px solid var(--admin-border)",
            }}
            className="h-14 flex items-center justify-between px-6 shrink-0"
        >
            <h1 className="text-white font-semibold text-base">{title}</h1>
            <div className="flex items-center gap-3">
                <button className="text-[var(--admin-muted-2)] hover:text-white transition-colors">
                    <Bell size={18} />
                </button>
                <Avatar className="w-8 h-8">
                    <AvatarFallback
                        style={{ background: "var(--admin-accent)" }}
                        className="text-black text-xs font-bold"
                    >
                        A
                    </AvatarFallback>
                </Avatar>
            </div>
        </header>
    );
}
