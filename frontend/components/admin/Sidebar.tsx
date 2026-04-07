"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
    LayoutDashboard,
    ImageIcon,
    ShoppingCart,
    Package,
    Users,
    Tag,
    BarChart2,
    Settings,
    LogOut,
    Store,
    Receipt,
    ChevronLeft,
    ChevronRight,
    Palette,
} from "lucide-react";
import { useAppDispatch } from "@/lib/hooks";
import { clearToken } from "@/lib/adminAuthSlice";
import { cn } from "@/lib/utils";

const NAV = [
    { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
    { href: "/admin/catalogue", label: "Catalogue", icon: Store },
    { href: "/admin/designs-shop", label: "Designs Shop", icon: Palette },
    { href: "/admin/designs", label: "Designs users", icon: ImageIcon },
    { href: "/admin/orders", label: "Commandes", icon: ShoppingCart },
    { href: "/admin/products", label: "Produits Printful", icon: Package },
    { href: "/admin/users", label: "Utilisateurs", icon: Users },
    { href: "/admin/promo", label: "Codes promo", icon: Tag },
    { href: "/admin/invoices", label: "Factures", icon: Receipt },
    { href: "/admin/stats", label: "Statistiques", icon: BarChart2 },
    { href: "/admin/settings", label: "Paramètres", icon: Settings },
];

export function AdminSidebar() {
    const pathname = usePathname();
    const router = useRouter();
    const dispatch = useAppDispatch();
    const [collapsed, setCollapsed] = useState(false);

    function handleLogout() {
        dispatch(clearToken());
        router.push("/admin/login");
    }

    return (
        <aside
            style={{
                background: "var(--admin-sidebar)",
                borderRight: "1px solid var(--admin-border)",
                width: collapsed ? 64 : 224,
                transition: "width 200ms ease",
            }}
            className="min-h-screen flex flex-col shrink-0 overflow-hidden"
        >
            {/* Logo + collapse button */}
            <div
                style={{ borderBottom: "1px solid var(--admin-border)" }}
                className="px-3 py-4 flex items-center gap-2 h-14"
            >
                {!collapsed && (
                    <>
                        <span className="text-[var(--admin-accent)] font-mono font-bold text-lg tracking-tight">
                            OVER
                        </span>
                        <span className="text-white font-mono font-bold text-lg tracking-tight">
                            FITTED
                        </span>
                        <span
                            style={{ background: "var(--admin-accent)" }}
                            className="ml-auto text-[10px] font-mono text-black px-1.5 py-0.5 rounded"
                        >
                            ADMIN
                        </span>
                    </>
                )}
                <button
                    onClick={() => setCollapsed((c) => !c)}
                    className={cn(
                        "text-[var(--admin-muted-2)] hover:text-white transition-colors rounded p-0.5 hover:bg-white/5",
                        collapsed ? "mx-auto" : "ml-1"
                    )}
                    title={collapsed ? "Déplier la sidebar" : "Réduire la sidebar"}
                >
                    {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
                </button>
            </div>

            {/* Nav */}
            <nav className="flex-1 px-2 py-4 space-y-0.5">
                {NAV.map(({ href, label, icon: Icon }) => {
                    const active =
                        href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
                    return (
                        <Link
                            key={href}
                            href={href}
                            title={collapsed ? label : undefined}
                            className={cn(
                                "flex items-center gap-3 px-2 py-2 rounded-md text-sm transition-colors",
                                collapsed ? "justify-center" : "",
                                active
                                    ? "text-white font-medium"
                                    : "text-[var(--admin-muted-2)] hover:text-white hover:bg-white/5"
                            )}
                            style={
                                active
                                    ? { background: "var(--admin-accent)", color: "white" }
                                    : undefined
                            }
                        >
                            <Icon size={16} className="shrink-0" />
                            {!collapsed && <span className="truncate">{label}</span>}
                        </Link>
                    );
                })}
            </nav>

            {/* Logout */}
            <div
                style={{ borderTop: "1px solid var(--admin-border)" }}
                className="px-2 py-3"
            >
                <button
                    onClick={handleLogout}
                    title={collapsed ? "Déconnexion" : undefined}
                    className={cn(
                        "flex items-center gap-3 w-full px-2 py-2 rounded-md text-sm text-[var(--admin-muted-2)] hover:text-red-400 hover:bg-white/5 transition-colors",
                        collapsed ? "justify-center" : ""
                    )}
                >
                    <LogOut size={16} className="shrink-0" />
                    {!collapsed && "Déconnexion"}
                </button>
            </div>
        </aside>
    );
}


