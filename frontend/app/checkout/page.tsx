"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AppHeader } from "@/components/public/AppHeader";
import { AppFooter } from "@/components/public/AppFooter";
import { TerminalWindow } from "@/components/public/TerminalWindow";
import { useAppSelector } from "@/lib/hooks";
import { useGetMeQuery, useCreateCheckoutSessionMutation } from "@/lib/publicApi";
import { AlertTriangle, ExternalLink } from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

type CheckoutState =
    | "idle"
    | "auth_check"
    | "creating_session"
    | "redirecting"
    | "error_empty"
    | "error_auth"
    | "error_api";

// ── Page ──────────────────────────────────────────────────────────────────────

export default function CheckoutPage() {
    const router = useRouter();

    // ── Redux cart ────────────────────────────────────────────────────────────
    const items = useAppSelector((s) => s.cart.items);
    const promoCode = useAppSelector((s) => s.cart.promoCode);

    // ── Auth check ────────────────────────────────────────────────────────────
    const { data: me, isLoading: meLoading } = useGetMeQuery();

    // ── Mutation ──────────────────────────────────────────────────────────────
    const [createSession] = useCreateCheckoutSessionMutation();

    // ── State ─────────────────────────────────────────────────────────────────
    const [status, setStatus] = useState<CheckoutState>("idle");
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [stripeUrl, setStripeUrl] = useState<string | null>(null);

    // Protège contre le double-fire en StrictMode (React 18)
    const hasFired = useRef(false);

    // ── Effet principal ───────────────────────────────────────────────────────
    useEffect(() => {
        if (meLoading) {
            setStatus("auth_check");
            return;
        }

        // Panier vide → retour au shop
        if (items.length === 0) {
            setStatus("error_empty");
            return;
        }

        // Non connecté → redirect login avec next=/checkout
        if (!me) {
            setStatus("error_auth");
            router.replace("/login?next=/checkout");
            return;
        }

        if (hasFired.current) return;
        hasFired.current = true;

        setStatus("creating_session");

        const lineItems = items.map((i) => ({
            variant_id: i.variantId,
            quantity: i.quantity,
        }));

        const body: { items: typeof lineItems; promo_code?: string } = { items: lineItems };
        if (promoCode) body.promo_code = promoCode;

        createSession(body)
            .unwrap()
            .then(({ session_url }) => {
                setStripeUrl(session_url);
                setStatus("redirecting");
                // Hard redirect vers Stripe Checkout hosted
                window.location.href = session_url;
            })
            .catch((err: unknown) => {
                const detail =
                    (err as { data?: { detail?: string } })?.data?.detail ??
                    "Impossible de créer la session Stripe.";
                setErrorMsg(detail);
                setStatus("error_api");
            });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [meLoading, me, items.length]);

    // ── Lignes terminal ───────────────────────────────────────────────────────
    const terminalLines: { key: string; value: string }[] = [];

    switch (status) {
        case "idle":
        case "auth_check":
            terminalLines.push(
                { key: "STATUS", value: "INITIALIZING..." },
                { key: "AUTH", value: "CHECKING_SESSION" }
            );
            break;
        case "creating_session":
            terminalLines.push(
                { key: "STATUS", value: "CREATING_STRIPE_SESSION" },
                { key: "ITEMS", value: `${items.length} ITEM(S)` },
                { key: "PROMO", value: promoCode ?? "NONE" },
                { key: "PAYMENT_PROVIDER", value: "STRIPE_HOSTED_CHECKOUT" }
            );
            break;
        case "redirecting":
            terminalLines.push(
                { key: "STATUS", value: "SESSION_CREATED — REDIRECTING" },
                { key: "TARGET", value: "STRIPE_SECURE_CHECKOUT" },
                { key: "PROMO", value: promoCode ?? "NONE" }
            );
            break;
        case "error_empty":
            terminalLines.push(
                { key: "STATUS", value: "ERROR: CART_IS_EMPTY" },
                { key: "SUGGESTION", value: "GO_SHOPPING_HUMAN" }
            );
            break;
        case "error_auth":
            terminalLines.push(
                { key: "STATUS", value: "ERROR: NOT_AUTHENTICATED" },
                { key: "ACTION", value: "REDIRECTING_TO_LOGIN..." }
            );
            break;
        case "error_api":
            terminalLines.push(
                { key: "STATUS", value: "ERROR: SESSION_CREATION_FAILED" },
                { key: "DETAIL", value: errorMsg ?? "UNKNOWN_ERROR" },
                { key: "SUGGESTION", value: "RETRY_OR_GO_BACK" }
            );
            break;
    }

    const isError = status.startsWith("error_");
    const isLoading = !isError && status !== "redirecting";

    return (
        <div className="min-h-screen bg-[#0A0A0A] flex flex-col">
            <AppHeader />

            <main className="flex-1 flex flex-col items-center justify-center px-4 py-16 gap-8">
                {/* Titre */}
                <div className="text-center">
                    <h1 className="font-mono text-[11px] uppercase tracking-[0.4em] text-[#00F0FF]">
                        {isError ? "CHECKOUT_ERROR" : "CHECKOUT_SEQUENCE"}
                    </h1>
                    <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#475569] mt-1">
                        {status === "redirecting"
                            ? "Redirection vers Stripe — gardez la page ouverte"
                            : status === "error_empty"
                                ? "Votre panier est vide"
                                : status === "error_api"
                                    ? "Erreur lors de la création de session"
                                    : "Initialisation du paiement sécurisé..."}
                    </p>
                </div>

                {/* Terminal log */}
                <div className="w-full max-w-lg">
                    <TerminalWindow title={isError ? "CHECKOUT.ERR" : "CHECKOUT.LOG"}>
                        <div className="space-y-1">
                            {terminalLines.map(({ key, value }) => (
                                <p key={key} className="text-[11px]">
                                    <span
                                        className={
                                            isError ? "text-red-400" : "text-[#FF6B00]"
                                        }
                                    >
                                        {key}
                                    </span>
                                    <span className="text-[#444]"> : </span>
                                    <span className="text-[#AAAAAA]">{value}</span>
                                </p>
                            ))}
                            {/* Curseur animé pendant chargement */}
                            {isLoading && (
                                <p className="text-[#00F0FF] text-[11px] animate-pulse mt-2">
                                    █
                                </p>
                            )}
                        </div>
                    </TerminalWindow>
                </div>

                {/* Spinner pendant la création */}
                {isLoading && (
                    <div className="flex items-center gap-3">
                        <span className="inline-block w-4 h-4 border-2 border-[#FF6B00] border-t-transparent rounded-full animate-spin" />
                        <span className="font-mono text-[10px] uppercase tracking-widest text-[#475569]">
                            {status === "creating_session"
                                ? "Contacte Stripe..."
                                : "Vérification de l'authentification..."}
                        </span>
                    </div>
                )}

                {/* Lien de secours si la redirection ne se déclenche pas */}
                {status === "redirecting" && stripeUrl && (
                    <a
                        href={stripeUrl}
                        className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-[#00F0FF] border border-[#00F0FF]/30 px-4 py-2 hover:border-[#00F0FF] transition-colors"
                    >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Ouvrir Stripe manuellement
                    </a>
                )}

                {/* Actions erreur */}
                {isError && (
                    <div className="flex flex-col sm:flex-row items-center gap-3">
                        {status === "error_api" && (
                            <button
                                onClick={() => {
                                    hasFired.current = false;
                                    setStatus("idle");
                                    setErrorMsg(null);
                                }}
                                className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.2em] border border-[#FF6B00] text-[#FF6B00] px-6 py-2.5 hover:bg-[#FF6B00] hover:text-black transition-colors"
                            >
                                <AlertTriangle className="w-3.5 h-3.5" />
                                Réessayer
                            </button>
                        )}
                        <button
                            onClick={() =>
                                router.push(status === "error_empty" ? "/shop" : "/cart")
                            }
                            className="font-mono text-[11px] uppercase tracking-[0.2em] border border-[#1E293B] text-[#475569] px-6 py-2.5 hover:border-[#475569] hover:text-white transition-colors"
                        >
                            {status === "error_empty" ? "Aller au shop" : "Retour au panier"}
                        </button>
                    </div>
                )}

                {/* Note sécurité Stripe */}
                {(status === "creating_session" || status === "redirecting") && (
                    <p className="font-mono text-[9px] uppercase tracking-widest text-[#1E293B] text-center max-w-xs">
                        Paiement sécurisé par Stripe — Overfitted ne stocke aucune
                        donnée de carte bancaire.
                    </p>
                )}
            </main>

            <AppFooter />
        </div>
    );
}
