"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ShoppingCart, User, UserCheck, LayoutDashboard, PackageSearch, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppSelector } from "@/lib/hooks";
import { selectCartItemCount } from "@/lib/slices/cartSlice";
import { useGetMeQuery, useLogoutMutation } from "@/lib/publicApi";
import { useState, useEffect, useRef } from "react";

const NAV = [
    { label: "HOME", href: "/" },
    { label: "SHOP", href: "/shop" },
    { label: "UPLOAD", href: "/upload" },
    { label: "DESIGN", href: "/design" },
    { label: "ABOUT", href: "/about" },
];

export function AppHeader() {
    const pathname = usePathname();
    const router = useRouter();
    const cartCount = useAppSelector(selectCartItemCount);
    const [mounted, setMounted] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    useEffect(() => { setMounted(true); }, []);
    const { isSuccess: isLoggedIn } = useGetMeQuery();
    const [logout] = useLogoutMutation();

    useEffect(() => {
        if (!menuOpen) return;
        function handleClick(e: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setMenuOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, [menuOpen]);

    async function handleLogout() {
        setMenuOpen(false);
        await logout().unwrap().catch(() => {});
        router.push("/");
    }

    return (
        <header className="sticky top-0 z-50 bg-[#0A0A0A]/95 backdrop-blur-sm border-b border-[#00F0FF]/20">
            {/* Row 1 — Logo centré */}
            <div className="relative flex items-center justify-center pt-5 pb-3 px-6">
                {/* Logo SVG centré */}
                <Link href="/" className="block" aria-label="Overfitted">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src="/Titel Overfitted.svg"
                        alt="Overfitted"
                        className="h-16 w-auto object-contain"
                        style={{ filter: "drop-shadow(0 0 18px rgba(255,107,0,0.45)) drop-shadow(0 0 32px rgba(0,240,255,0.2))" }}
                    />
                </Link>

                {/* Icônes positionnées à droite en absolu */}
                <div className="absolute right-6 flex items-center gap-5">
                    <Link
                        href="/cart"
                        className="relative text-[#888] hover:text-[#00F0FF] transition-colors"
                        aria-label="Panier"
                    >
                        <ShoppingCart size={18} />
                        {mounted && cartCount > 0 && (
                            <span className="absolute -top-2 -right-2 min-w-[16px] h-4 px-0.5 flex items-center justify-center bg-[#FF6B00] text-white font-mono text-[9px] font-bold rounded-full leading-none">
                                {cartCount > 99 ? "99+" : cartCount}
                            </span>
                        )}
                    </Link>
                    {mounted && isLoggedIn ? (
                        <div ref={menuRef} className="relative">
                            <button
                                onClick={() => setMenuOpen((o) => !o)}
                                className={cn("text-[#00F0FF] hover:text-white transition-colors", menuOpen && "text-white")}
                                aria-label="Menu compte"
                                aria-expanded={menuOpen}
                            >
                                <UserCheck size={18} />
                            </button>
                            {menuOpen && (
                                <div className="absolute right-0 top-8 w-52 bg-[#0D0D0D] border border-[#00F0FF]/20 shadow-[0_0_24px_rgba(0,240,255,0.08)] z-50">
                                    <div className="px-3 py-2 border-b border-[#1A1A1A]">
                                        <p className="font-mono text-[9px] uppercase tracking-[0.25em] text-[#555]">ACCOUNT</p>
                                    </div>
                                    <Link href="/account/profile" onClick={() => setMenuOpen(false)}
                                        className="flex items-center gap-3 px-3 py-2.5 font-mono text-[11px] text-[#AAAAAA] hover:text-[#00F0FF] hover:bg-[#00F0FF]/5 transition-colors">
                                        <LayoutDashboard size={13} /> Mon profil
                                    </Link>
                                    <Link href="/account/orders" onClick={() => setMenuOpen(false)}
                                        className="flex items-center gap-3 px-3 py-2.5 font-mono text-[11px] text-[#AAAAAA] hover:text-[#00F0FF] hover:bg-[#00F0FF]/5 transition-colors">
                                        <PackageSearch size={13} /> Suivre mes commandes
                                    </Link>
                                    <div className="border-t border-[#1A1A1A]" />
                                    <button onClick={handleLogout}
                                        className="w-full flex items-center gap-3 px-3 py-2.5 font-mono text-[11px] text-[#FF6B00]/70 hover:text-[#FF6B00] hover:bg-[#FF6B00]/5 transition-colors">
                                        <LogOut size={13} /> Déconnexion
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <Link
                            href="/login"
                            className="text-[#888] hover:text-[#00F0FF] transition-colors"
                            aria-label="Se connecter"
                        >
                            <User size={18} />
                        </Link>
                    )}
                </div>
            </div>

            {/* Row 2 — Nav centrée */}
            <nav className="hidden md:flex items-center justify-center gap-8 pb-3 px-6">
                {NAV.map((n) => (
                    <Link
                        key={n.href}
                        href={n.href}
                        className={cn(
                            "font-mono text-[12px] uppercase tracking-[0.22em] pb-0.5 transition-colors",
                            pathname === n.href
                                ? "text-[#00F0FF] border-b-2 border-[#00F0FF]"
                                : "text-[#AAAAAA] hover:text-white"
                        )}
                    >
                        {n.label}
                    </Link>
                ))}
            </nav>
        </header>
    );
}
