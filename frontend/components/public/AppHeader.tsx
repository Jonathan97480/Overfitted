"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShoppingCart, User } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
    { label: "HOME", href: "/" },
    { label: "SHOP", href: "/shop" },
    { label: "UPLOAD", href: "/upload" },
    { label: "DESIGN", href: "/design" },
    { label: "ABOUT", href: "/about" },
];

export function AppHeader() {
    const pathname = usePathname();

    return (
        <header className="sticky top-0 z-50 bg-[#0A0A0A]/95 backdrop-blur-sm border-b border-[#00F0FF]/20">
            <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-8">
                {/* Logo */}
                <Link href="/" className="shrink-0 font-mono font-black text-xl tracking-wider select-none">
                    <span
                        className="text-[#FF6B00]"
                        style={{
                            textShadow:
                                "0 0 12px rgba(255,107,0,0.6), -2px 0 rgba(0,240,255,0.4), 2px 0 rgba(255,0,0,0.3)",
                        }}
                    >
                        OVERFITTED
                    </span>
                    <span className="text-[#AAAAAA] text-xs">.io</span>
                </Link>

                {/* Nav */}
                <nav className="hidden md:flex items-center gap-7">
                    {NAV.map((n) => (
                        <Link
                            key={n.href}
                            href={n.href}
                            className={cn(
                                "font-mono text-[11px] uppercase tracking-[0.18em] pb-0.5 transition-colors",
                                pathname === n.href
                                    ? "text-[#FF6B00] border-b border-[#FF6B00]"
                                    : "text-[#888] hover:text-white"
                            )}
                        >
                            {n.label}
                        </Link>
                    ))}
                </nav>

                {/* Icons */}
                <div className="flex items-center gap-5">
                    <Link
                        href="/cart"
                        className="text-[#888] hover:text-[#00F0FF] transition-colors relative"
                        aria-label="Panier"
                    >
                        <ShoppingCart size={17} />
                    </Link>
                    <Link
                        href="/login"
                        className="text-[#888] hover:text-[#00F0FF] transition-colors"
                        aria-label="Mon compte"
                    >
                        <User size={17} />
                    </Link>
                </div>
            </div>
        </header>
    );
}
