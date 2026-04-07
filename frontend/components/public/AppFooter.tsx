import Link from "next/link";

export function AppFooter() {
    return (
        <footer className="border-t border-[#00F0FF]/15 bg-[#0A0A0A] mt-auto">
            <div className="max-w-7xl mx-auto px-6 py-8 flex flex-col md:flex-row items-center justify-between gap-6">
                {/* Nav secondaire */}
                <nav className="flex flex-wrap items-center gap-6 font-mono text-[11px] text-[#666] uppercase tracking-widest">
                    <Link href="/legal" className="hover:text-[#AAAAAA] transition-colors">
                        Mentions Légales
                    </Link>
                    <Link href="/legal#cgv" className="hover:text-[#AAAAAA] transition-colors">
                        CGV
                    </Link>
                    <Link href="/contact" className="hover:text-[#AAAAAA] transition-colors">
                        Contact
                    </Link>
                    <Link href="/about" className="hover:text-[#AAAAAA] transition-colors">
                        À propos
                    </Link>
                </nav>

                {/* Badge HUMAN CHAOS APPROVED */}
                <div className="flex items-center gap-3">
                    <div
                        className="relative w-11 h-11 rounded-full border-2 border-[#00F0FF] flex items-center justify-center"
                        style={{ boxShadow: "0 0 12px rgba(0,240,255,0.35), inset 0 0 6px rgba(0,240,255,0.1)" }}
                    >
                        <svg viewBox="0 0 24 24" className="w-5 h-5 fill-[#00F0FF]">
                            <circle cx="12" cy="7" r="3" />
                            <path d="M6 21v-2a6 6 0 0 1 12 0v2" />
                        </svg>
                    </div>
                    <div className="flex flex-col">
                        <span className="font-mono text-[10px] text-[#00F0FF] uppercase tracking-[0.2em]">
                            Human Chaos
                        </span>
                        <span className="font-mono text-[10px] text-[#00F0FF] uppercase tracking-[0.2em]">
                            Approved ✓
                        </span>
                    </div>
                </div>
            </div>
        </footer>
    );
}
