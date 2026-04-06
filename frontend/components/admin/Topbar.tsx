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
};

export function AdminTopbar() {
    const pathname = usePathname();
    const title =
        Object.entries(TITLES)
            .reverse()
            .find(([prefix]) => pathname === prefix || pathname.startsWith(prefix + "/"))?.[1] ??
        "Admin";

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
