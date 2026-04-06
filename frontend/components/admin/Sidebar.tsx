"use client";
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
} from "lucide-react";
import { useAppDispatch } from "@/lib/hooks";
import { clearToken } from "@/lib/adminAuthSlice";
import { cn } from "@/lib/utils";

const NAV = [
    { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
    { href: "/admin/catalogue", label: "Catalogue", icon: Store },
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

    function handleLogout() {
        dispatch(clearToken());
        router.push("/admin/login");
    }

    return (
        <aside
            style={{ background: "var(--admin-sidebar)", borderRight: "1px solid var(--admin-border)" }}
            className="w-56 min-h-screen flex flex-col shrink-0"
        >
            {/* Logo */}
            <div
                style={{ borderBottom: "1px solid var(--admin-border)" }}
                className="px-5 py-4 flex items-center gap-2"
            >
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
            </div>

            {/* Nav */}
            <nav className="flex-1 px-3 py-4 space-y-0.5">
                {NAV.map(({ href, label, icon: Icon }) => {
                    const active =
                        href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
                    return (
                        <Link
                            key={href}
                            href={href}
                            className={cn(
                                "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
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
                            <Icon size={16} />
                            {label}
                        </Link>
                    );
                })}
            </nav>

            {/* Logout */}
            <div
                style={{ borderTop: "1px solid var(--admin-border)" }}
                className="px-3 py-3"
            >
                <button
                    onClick={handleLogout}
                    className="flex items-center gap-3 w-full px-3 py-2 rounded-md text-sm text-[var(--admin-muted-2)] hover:text-red-400 hover:bg-white/5 transition-colors"
                >
                    <LogOut size={16} />
                    Déconnexion
                </button>
            </div>
        </aside>
    );
}
