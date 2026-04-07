"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppHeader } from "@/components/public/AppHeader";
import { AppFooter } from "@/components/public/AppFooter";
import { TerminalWindow } from "@/components/public/TerminalWindow";

export default function CheckoutCancelPage() {
    const router = useRouter();

    useEffect(() => {
        // Redirect immédiat vers /cart avec flag toast
        router.replace("/cart?cancelled=true");
    }, [router]);

    // Affichage intermédiaire pendant la redirection
    return (
        <div className="min-h-screen bg-[#0A0A0A] flex flex-col">
            <AppHeader />
            <div className="flex-1 flex items-center justify-center px-6 py-20">
                <div className="max-w-md w-full">
                    <TerminalWindow title="CHECKOUT_CANCELLED">
                        <div className="space-y-2 font-mono text-[11px]">
                            <div className="flex gap-3">
                                <span className="text-[#555] w-32 shrink-0">STATUS:</span>
                                <span className="text-[#F59E0B] flex items-center gap-2">
                                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#F59E0B] animate-pulse" />
                                    PAYMENT_CANCELLED
                                </span>
                            </div>
                            <div className="flex gap-3">
                                <span className="text-[#555] w-32 shrink-0">CART:</span>
                                <span className="text-[#22C55E]">INTACT</span>
                            </div>
                            <div className="flex gap-3">
                                <span className="text-[#555] w-32 shrink-0">REDIRECT:</span>
                                <span className="text-[#AAAAAA]">Retour au panier...</span>
                            </div>
                        </div>
                    </TerminalWindow>
                </div>
            </div>
            <AppFooter />
        </div>
    );
}
