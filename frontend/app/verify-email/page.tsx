"use client";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { AppHeader } from "@/components/public/AppHeader";
import { AppFooter } from "@/components/public/AppFooter";
import { TerminalWindow } from "@/components/public/TerminalWindow";
import { OvfButton } from "@/components/public/OvfButton";

// ── Types ─────────────────────────────────────────────────────────────────────

type PageStatus = "loading" | "success" | "expired" | "error" | "no-token";
type ResendStatus = "idle" | "sending" | "sent" | "auth_required" | "error";

// ── Inner component (uses useSearchParams) ────────────────────────────────────

function VerifyEmailContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const token = searchParams.get("token");
    const resendParam = searchParams.get("resend");

    const [pageStatus, setPageStatus] = useState<PageStatus>("loading");
    const [resendStatus, setResendStatus] = useState<ResendStatus>("idle");

    const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

    // ── Vérification automatique du token ────────────────────────────────────
    useEffect(() => {
        if (!token) {
            setPageStatus(resendParam === "true" ? "expired" : "no-token");
            return;
        }

        let cancelled = false;
        fetch(`${API_URL}/auth/verify-email?token=${encodeURIComponent(token)}`, {
            method: "GET",
            credentials: "include",
        })
            .then(async (res) => {
                if (cancelled) return;
                if (res.ok) {
                    setPageStatus("success");
                    // Redirect vers /account après 3s
                    setTimeout(() => router.push("/"), 3000);
                } else {
                    const data = await res.json().catch(() => ({}));
                    const detail = (data as { detail?: string }).detail ?? "";
                    if (detail.toLowerCase().includes("expir") || res.status === 400) {
                        setPageStatus("expired");
                    } else {
                        setPageStatus("error");
                    }
                }
            })
            .catch(() => {
                if (!cancelled) setPageStatus("error");
            });

        return () => { cancelled = true; };
    }, [token, resendParam, API_URL, router]);

    // ── Renvoyer l'email de vérification ─────────────────────────────────────
    async function handleResend() {
        setResendStatus("sending");
        try {
            const res = await fetch(`${API_URL}/auth/resend-verification`, {
                method: "POST",
                credentials: "include",
            });
            if (res.ok) {
                setResendStatus("sent");
            } else if (res.status === 401 || res.status === 403) {
                setResendStatus("auth_required");
            } else {
                setResendStatus("error");
            }
        } catch {
            setResendStatus("error");
        }
    }

    // ── États ─────────────────────────────────────────────────────────────────

    // Chargement
    if (pageStatus === "loading") {
        return (
            <div className="flex-1 flex items-center justify-center px-6 py-20">
                <div className="max-w-md w-full space-y-6">
                    <TerminalWindow title="EMAIL_VERIFICATION">
                        <div className="space-y-2 font-mono text-[11px]">
                            <div className="flex gap-3">
                                <span className="text-[#555] w-32 shrink-0">STATUS:</span>
                                <span className="text-[#F59E0B] flex items-center gap-2">
                                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#F59E0B] animate-pulse" />
                                    VERIFYING_TOKEN...
                                </span>
                            </div>
                            <div className="flex gap-3">
                                <span className="text-[#555] w-32 shrink-0">ACTION:</span>
                                <span className="text-[#AAAAAA]">Validation cryptographique en cours</span>
                            </div>
                        </div>
                    </TerminalWindow>
                </div>
            </div>
        );
    }

    // Succès
    if (pageStatus === "success") {
        return (
            <div className="flex-1 flex items-center justify-center px-6 py-20">
                <div className="max-w-md w-full space-y-6">
                    {/* Badge succès */}
                    <div className="flex flex-col items-center gap-3">
                        <div className="flex items-center justify-center w-16 h-16 border-2 border-[#22C55E] rounded-full shadow-[0_0_24px_rgba(34,197,94,0.4)]">
                            <span className="text-[#22C55E] text-2xl font-bold">✓</span>
                        </div>
                        <div className="font-mono text-[11px] uppercase tracking-[0.3em] text-[#22C55E]">
                            Email vérifié
                        </div>
                    </div>

                    <TerminalWindow title="VERIFICATION_RESULT">
                        <div className="space-y-2 font-mono text-[11px]">
                            <div className="flex gap-3">
                                <span className="text-[#555] w-32 shrink-0">STATUS:</span>
                                <span className="text-[#22C55E] flex items-center gap-1.5">
                                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#22C55E]" />
                                    EMAIL_VERIFIED
                                </span>
                            </div>
                            <div className="flex gap-3">
                                <span className="text-[#555] w-32 shrink-0">AUTH:</span>
                                <span className="text-[#00F0FF]">SESSION_INITIATED</span>
                            </div>
                            <div className="flex gap-3">
                                <span className="text-[#555] w-32 shrink-0">NEXT:</span>
                                <span className="text-[#AAAAAA]">
                                    Redirect automatique dans 3s...
                                </span>
                            </div>
                        </div>
                    </TerminalWindow>

                    <OvfButton href="/" subtitle="(CHAOS PRINCIPAL)">
                        RETOUR À LA BASE
                    </OvfButton>
                </div>
            </div>
        );
    }

    // Lien expiré
    if (pageStatus === "expired") {
        return (
            <div className="flex-1 flex items-center justify-center px-6 py-20">
                <div className="max-w-md w-full space-y-6">
                    {/* Badge erreur */}
                    <div className="flex flex-col items-center gap-3">
                        <div className="flex items-center justify-center w-16 h-16 border-2 border-[#FF6B00] rounded-full shadow-[0_0_24px_rgba(255,107,0,0.4)]">
                            <span className="text-[#FF6B00] text-2xl font-bold">✕</span>
                        </div>
                        <div className="font-mono text-[11px] uppercase tracking-[0.3em] text-[#FF6B00]">
                            Lien expiré
                        </div>
                    </div>

                    <TerminalWindow title="VERIFICATION_RESULT">
                        <div className="space-y-2 font-mono text-[11px]">
                            <div className="flex gap-3">
                                <span className="text-[#555] w-32 shrink-0">STATUS:</span>
                                <span className="text-[#FF6B00] flex items-center gap-1.5">
                                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#FF6B00]" />
                                    TOKEN_EXPIRED
                                </span>
                            </div>
                            <div className="flex gap-3">
                                <span className="text-[#555] w-32 shrink-0">TTL:</span>
                                <span className="text-[#AAAAAA]">24h — délai dépassé</span>
                            </div>
                            <div className="flex gap-3">
                                <span className="text-[#555] w-32 shrink-0">ACTION:</span>
                                <span className="text-[#00F0FF]">RESEND_REQUIRED</span>
                            </div>
                        </div>
                    </TerminalWindow>

                    {/* Renvoyer l'email */}
                    {resendStatus === "idle" && (
                        <div className="space-y-3">
                            <button
                                onClick={handleResend}
                                className="w-full flex flex-col items-center justify-center py-3 px-6 rounded-lg
                                    bg-[#FF6B00] text-white font-mono text-sm uppercase tracking-widest font-bold
                                    hover:bg-[#FF8A2B] hover:shadow-[0_0_28px_rgba(255,107,0,0.55)]
                                    active:scale-[0.97] transition-all duration-200"
                            >
                                <span>RENVOYER L&apos;EMAIL</span>
                                <span className="text-xs opacity-60 font-normal normal-case tracking-normal mt-0.5">
                                    (nouveau lien valable 24h)
                                </span>
                            </button>
                            <p className="font-mono text-[10px] text-[#555] text-center">
                                Vous devez être connecté pour renvoyer le lien.{" "}
                                <Link
                                    href="/login?next=/verify-email?resend=true"
                                    className="text-[#00F0FF] hover:underline"
                                >
                                    Se connecter d&apos;abord →
                                </Link>
                            </p>
                        </div>
                    )}

                    {resendStatus === "sending" && (
                        <TerminalWindow title="RESEND_STATUS">
                            <div className="font-mono text-[11px] flex gap-3">
                                <span className="text-[#555] w-32 shrink-0">STATUS:</span>
                                <span className="text-[#F59E0B] flex items-center gap-2">
                                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#F59E0B] animate-pulse" />
                                    SENDING...
                                </span>
                            </div>
                        </TerminalWindow>
                    )}

                    {resendStatus === "sent" && (
                        <TerminalWindow title="RESEND_STATUS">
                            <div className="space-y-2 font-mono text-[11px]">
                                <div className="flex gap-3">
                                    <span className="text-[#555] w-32 shrink-0">STATUS:</span>
                                    <span className="text-[#22C55E]">EMAIL_DISPATCHED</span>
                                </div>
                                <div className="flex gap-3">
                                    <span className="text-[#555] w-32 shrink-0">ACTION:</span>
                                    <span className="text-[#AAAAAA]">Vérifiez votre boîte mail</span>
                                </div>
                            </div>
                        </TerminalWindow>
                    )}

                    {resendStatus === "auth_required" && (
                        <TerminalWindow title="RESEND_STATUS">
                            <div className="space-y-2 font-mono text-[11px]">
                                <div className="flex gap-3">
                                    <span className="text-[#555] w-32 shrink-0">STATUS:</span>
                                    <span className="text-[#FF6B00]">AUTH_REQUIRED</span>
                                </div>
                                <div className="flex gap-3">
                                    <span className="text-[#555] w-32 shrink-0">ACTION:</span>
                                    <Link
                                        href="/login?next=/verify-email?resend=true"
                                        className="text-[#00F0FF] hover:underline"
                                    >
                                        Connectez-vous d&apos;abord →
                                    </Link>
                                </div>
                            </div>
                        </TerminalWindow>
                    )}

                    {resendStatus === "error" && (
                        <TerminalWindow title="RESEND_STATUS">
                            <div className="font-mono text-[11px] flex gap-3">
                                <span className="text-[#555] w-32 shrink-0">STATUS:</span>
                                <span className="text-[#FF6B00]">SEND_FAILED — réessayez</span>
                            </div>
                        </TerminalWindow>
                    )}

                    <OvfButton href="/" variant="ghost" subtitle="(sans vérification)">
                        RETOUR À LA BASE
                    </OvfButton>
                </div>
            </div>
        );
    }

    // Pas de token / erreur générique
    return (
        <div className="flex-1 flex items-center justify-center px-6 py-20">
            <div className="max-w-md w-full space-y-6">
                <TerminalWindow title="VERIFICATION_ERROR">
                    <div className="space-y-2 font-mono text-[11px]">
                        <div className="flex gap-3">
                            <span className="text-[#555] w-32 shrink-0">STATUS:</span>
                            <span className="text-[#FF6B00]">
                                {pageStatus === "no-token" ? "NO_TOKEN_PROVIDED" : "VERIFICATION_FAILED"}
                            </span>
                        </div>
                        <div className="flex gap-3">
                            <span className="text-[#555] w-32 shrink-0">DETAIL:</span>
                            <span className="text-[#AAAAAA]">
                                {pageStatus === "no-token"
                                    ? "Lien de vérification manquant ou invalide."
                                    : "Une erreur s'est produite. Réessayez depuis le lien reçu par email."}
                            </span>
                        </div>
                    </div>
                </TerminalWindow>
                <OvfButton href="/" variant="ghost">
                    RETOUR À LA BASE
                </OvfButton>
            </div>
        </div>
    );
}

// ── Page principale avec Suspense (requis pour useSearchParams en App Router) ─

export default function VerifyEmailPage() {
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
                <VerifyEmailContent />
            </Suspense>
            <AppFooter />
        </div>
    );
}
