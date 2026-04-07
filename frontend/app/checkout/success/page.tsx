"use client";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { AppHeader } from "@/components/public/AppHeader";
import { AppFooter } from "@/components/public/AppFooter";
import { TerminalWindow } from "@/components/public/TerminalWindow";
import { OvfButton } from "@/components/public/OvfButton";
import { useAppDispatch } from "@/lib/hooks";
import { clearCart } from "@/lib/slices/cartSlice";

// ── Types ─────────────────────────────────────────────────────────────────────

interface ConfirmResult {
    order_id: number;
    invoice_number: string;
    status: string;
    amount_ttc: number;
    email: string;
}

type PageStatus = "loading" | "success" | "error";

// ── Inner component (uses useSearchParams) ────────────────────────────────────

function CheckoutSuccessContent() {
    const searchParams = useSearchParams();
    const dispatch = useAppDispatch();
    const sessionId = searchParams.get("session_id");

    const [pageStatus, setPageStatus] = useState<PageStatus>("loading");
    const [confirm, setConfirm] = useState<ConfirmResult | null>(null);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

    useEffect(() => {
        if (!sessionId) {
            setPageStatus("error");
            setErrorMsg("Paramètre session_id manquant.");
            return;
        }

        let cancelled = false;
        fetch(
            `${API_URL}/commerce/checkout/confirm?session_id=${encodeURIComponent(sessionId)}`,
            { credentials: "include" }
        )
            .then(async (res) => {
                if (cancelled) return;
                if (res.ok) {
                    const data = (await res.json()) as ConfirmResult;
                    setConfirm(data);
                    setPageStatus("success");
                    // Vider le panier Redux
                    dispatch(clearCart());
                } else {
                    const data = await res.json().catch(() => ({}));
                    const detail = (data as { detail?: string }).detail ?? "Erreur de confirmation.";
                    setErrorMsg(detail);
                    setPageStatus("error");
                }
            })
            .catch(() => {
                if (!cancelled) {
                    setErrorMsg("Impossible de contacter le serveur.");
                    setPageStatus("error");
                }
            });

        return () => { cancelled = true; };
    }, [sessionId, API_URL, dispatch]);

    // ── Chargement ────────────────────────────────────────────────────────────
    if (pageStatus === "loading") {
        return (
            <div className="flex-1 flex items-center justify-center px-6 py-20">
                <div className="max-w-md w-full space-y-6">
                    <TerminalWindow title="ORDER_CONFIRMATION">
                        <div className="space-y-2 font-mono text-[11px]">
                            <div className="flex gap-3">
                                <span className="text-[#555] w-32 shrink-0">STATUS:</span>
                                <span className="text-[#F59E0B] flex items-center gap-2">
                                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#F59E0B] animate-pulse" />
                                    VERIFYING_PAYMENT...
                                </span>
                            </div>
                            <div className="flex gap-3">
                                <span className="text-[#555] w-32 shrink-0">STRIPE:</span>
                                <span className="text-[#AAAAAA]">Vérification session en cours</span>
                            </div>
                        </div>
                    </TerminalWindow>
                </div>
            </div>
        );
    }

    // ── Erreur ────────────────────────────────────────────────────────────────
    if (pageStatus === "error") {
        return (
            <div className="flex-1 flex items-center justify-center px-6 py-20">
                <div className="max-w-md w-full space-y-6">
                    <TerminalWindow title="ORDER_CONFIRMATION_ERROR">
                        <div className="space-y-2 font-mono text-[11px]">
                            <div className="flex gap-3">
                                <span className="text-[#555] w-32 shrink-0">STATUS:</span>
                                <span className="text-[#FF6B00]">VERIFICATION_FAILED</span>
                            </div>
                            <div className="flex gap-3">
                                <span className="text-[#555] w-32 shrink-0">DETAIL:</span>
                                <span className="text-[#AAAAAA]">{errorMsg}</span>
                            </div>
                            <div className="flex gap-3">
                                <span className="text-[#555] w-32 shrink-0">NOTE:</span>
                                <span className="text-[#555]">
                                    Si le paiement a été effectué, la confirmation arrivera par email.
                                </span>
                            </div>
                        </div>
                    </TerminalWindow>
                    <div className="flex gap-3">
                        <OvfButton href="/account/orders" variant="ghost" subtitle="(vos commandes)">
                            MES COMMANDES
                        </OvfButton>
                        <OvfButton href="/" subtitle="(retour)">
                            ACCUEIL
                        </OvfButton>
                    </div>
                </div>
            </div>
        );
    }

    // ── Succès ────────────────────────────────────────────────────────────────
    return (
        <div className="flex-1 flex items-center justify-center px-6 py-20">
            <div className="max-w-lg w-full space-y-6">
                {/* Badge succès */}
                <div className="flex flex-col items-center gap-3">
                    <div className="flex items-center justify-center w-16 h-16 border-2 border-[#22C55E] rounded-full shadow-[0_0_32px_rgba(34,197,94,0.45)]">
                        <span className="text-[#22C55E] text-2xl font-bold">✓</span>
                    </div>
                    <div className="font-mono text-[11px] uppercase tracking-[0.3em] text-[#22C55E]">
                        Paiement confirmé
                    </div>
                </div>

                <TerminalWindow title="ORDER_CONFIRMATION">
                    <div className="space-y-2 font-mono text-[11px]">
                        <div className="flex gap-3">
                            <span className="text-[#555] w-36 shrink-0">STATUS:</span>
                            <span className="text-[#22C55E] flex items-center gap-1.5">
                                <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#22C55E]" />
                                PAID
                            </span>
                        </div>
                        {confirm?.order_id && (
                            <div className="flex gap-3">
                                <span className="text-[#555] w-36 shrink-0">ORDER_ID:</span>
                                <span className="text-[#00F0FF]">#{confirm.order_id}</span>
                            </div>
                        )}
                        {confirm?.invoice_number && (
                            <div className="flex gap-3">
                                <span className="text-[#555] w-36 shrink-0">INVOICE:</span>
                                <span className="text-white">{confirm.invoice_number}</span>
                            </div>
                        )}
                        {confirm?.amount_ttc !== undefined && (
                            <div className="flex gap-3">
                                <span className="text-[#555] w-36 shrink-0">AMOUNT_TTC:</span>
                                <span className="text-white">
                                    {confirm.amount_ttc.toFixed(2)} €
                                </span>
                            </div>
                        )}
                        <div className="flex gap-3">
                            <span className="text-[#555] w-36 shrink-0">CONFIRMATION:</span>
                            <span className="text-[#AAAAAA]">
                                ENVOYÉE_PAR_EMAIL{confirm?.email ? ` → ${confirm.email}` : ""}
                            </span>
                        </div>
                        <div className="flex gap-3">
                            <span className="text-[#555] w-36 shrink-0">PRODUCTION:</span>
                            <span className="text-[#AAAAAA]">En cours chez Printful</span>
                        </div>
                    </div>
                </TerminalWindow>

                {/* Actions */}
                <div className="flex flex-col gap-3">
                    {confirm?.order_id && (
                        <a
                            href={`${API_URL}/commerce/invoice/${confirm.order_id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex flex-col items-center justify-center w-full py-3 px-6 rounded-lg
                                bg-[#FF6B00] text-white font-mono text-sm uppercase tracking-widest font-bold
                                hover:bg-[#FF8A2B] hover:shadow-[0_0_28px_rgba(255,107,0,0.55)]
                                active:scale-[0.97] transition-all duration-200"
                        >
                            <span>TÉLÉCHARGER MA FACTURE (PDF)</span>
                            <span className="text-xs opacity-60 font-normal normal-case tracking-normal mt-0.5">
                                ({confirm.invoice_number})
                            </span>
                        </a>
                    )}
                    <div className="flex gap-3">
                        <OvfButton href="/account/orders" variant="ghost" subtitle="(suivi Printful)">
                            SUIVI COMMANDE
                        </OvfButton>
                        <OvfButton href="/shop" variant="ghost" subtitle="(encore ?)">
                            SHOP
                        </OvfButton>
                    </div>
                </div>

                {/* Note légale */}
                <p className="font-mono text-[9px] text-[#333] text-center leading-relaxed">
                    Produit fabriqué à la demande — art. L221-28 Code de la consommation.
                    Droit de rétractation non applicable.{" "}
                    <Link href="/legal" className="hover:text-[#555] transition-colors">
                        Mentions légales →
                    </Link>
                </p>
            </div>
        </div>
    );
}

// ── Page principale avec Suspense ─────────────────────────────────────────────

export default function CheckoutSuccessPage() {
    return (
        <div className="min-h-screen bg-[#0A0A0A] flex flex-col">
            <AppHeader />
            <Suspense
                fallback={
                    <div className="flex-1 flex items-center justify-center">
                        <span className="font-mono text-[#555] text-[11px] tracking-widest animate-pulse">
                            INITIALIZING...
                        </span>
                    </div>
                }
            >
                <CheckoutSuccessContent />
            </Suspense>
            <AppFooter />
        </div>
    );
}
