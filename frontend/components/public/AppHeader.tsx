"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShoppingCart, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppSelector } from "@/lib/hooks";
import { selectCartItemCount } from "@/lib/slices/cartSlice";
import { useState, useEffect } from "react";

const NAV = [
    { label: "HOME", href: "/" },
    { label: "SHOP", href: "/shop" },
    { label: "UPLOAD", href: "/upload" },
    { label: "DESIGN", href: "/design" },
    { label: "ABOUT", href: "/about" },
];

export function AppHeader() {
    const pathname = usePathname();
    const cartCount = useAppSelector(selectCartItemCount);
    const [mounted, setMounted] = useState(false);
    useEffect(() => { setMounted(true); }, []);

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
                    <Link
                        href="/login"
                        className="text-[#888] hover:text-[#00F0FF] transition-colors"
                        aria-label="Mon compte"
                    >
                        <User size={18} />
                    </Link>
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
