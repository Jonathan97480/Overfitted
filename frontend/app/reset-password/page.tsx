"use client";
import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { z } from "zod";
import { AppHeader } from "@/components/public/AppHeader";
import { AppFooter } from "@/components/public/AppFooter";
import { TerminalWindow } from "@/components/public/TerminalWindow";
import { OvfButton } from "@/components/public/OvfButton";

// ── Zod ───────────────────────────────────────────────────────────────────────

const ResetSchema = z
    .object({
        new_password: z
            .string()
            .min(8, "Le mot de passe doit contenir au moins 8 caractères."),
        confirm_password: z.string(),
    })
    .refine((d) => d.new_password === d.confirm_password, {
        message: "Les mots de passe ne correspondent pas.",
        path: ["confirm_password"],
    });

type ResetForm = z.infer<typeof ResetSchema>;
type FieldErrors = Partial<Record<keyof ResetForm, string>>;

// ── Styles partagés ──────────────────────────────────────────────────────────

const inputClass =
    "w-full bg-[#0A0E14] border border-[#1A1A1A] focus:border-[#00F0FF] focus:outline-none " +
    "font-mono text-[12px] text-white placeholder-[#333] px-3 py-2.5 transition-colors " +
    "focus:shadow-[0_0_12px_rgba(0,240,255,0.12)]";

const errorInputClass =
    "w-full bg-[#0A0E14] border border-[#FF6B00]/60 focus:border-[#FF6B00] focus:outline-none " +
    "font-mono text-[12px] text-white placeholder-[#333] px-3 py-2.5 transition-colors";

// ── Inner component (uses useSearchParams) ────────────────────────────────────

function ResetPasswordContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const token = searchParams.get("token");

    const [form, setForm] = useState<ResetForm>({
        new_password: "",
        confirm_password: "",
    });
    const [errors, setErrors] = useState<FieldErrors>({});
    const [status, setStatus] = useState<
        "idle" | "submitting" | "success" | "expired" | "error"
    >("idle");
    const [serverError, setServerError] = useState<string | null>(null);

    const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

    // Pas de token dans l'URL
    if (!token) {
        return (
            <div className="flex-1 flex items-center justify-center px-6 py-20">
                <div className="max-w-md w-full space-y-6">
                    <TerminalWindow title="RESET_PASSWORD_ERROR">
                        <div className="space-y-2 font-mono text-[11px]">
                            <div className="flex gap-3">
                                <span className="text-[#555] w-32 shrink-0">STATUS:</span>
                                <span className="text-[#FF6B00]">NO_TOKEN_PROVIDED</span>
                            </div>
                            <div className="flex gap-3">
                                <span className="text-[#555] w-32 shrink-0">DETAIL:</span>
                                <span className="text-[#AAAAAA]">
                                    Lien invalide. Utilisez le lien reçu par email.
                                </span>
                            </div>
                        </div>
                    </TerminalWindow>
                    <OvfButton href="/forgot-password" subtitle="(DEMANDER UN NOUVEAU LIEN)">
                        MOT DE PASSE OUBLIÉ
                    </OvfButton>
                </div>
            </div>
        );
    }

    function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
        if (errors[name as keyof ResetForm]) {
            setErrors((prev) => ({ ...prev, [name]: undefined }));
        }
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setServerError(null);

        const result = ResetSchema.safeParse(form);
        if (!result.success) {
            const fieldErrors: FieldErrors = {};
            for (const issue of result.error.issues) {
                const field = issue.path[0] as keyof ResetForm;
                if (!fieldErrors[field]) fieldErrors[field] = issue.message;
            }
            setErrors(fieldErrors);
            return;
        }

        setStatus("submitting");
        try {
            const res = await fetch(`${API_URL}/auth/reset-password`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                    token,
                    new_password: result.data.new_password,
                }),
            });

            if (res.ok) {
                setStatus("success");
                // Redirect après 3s
                setTimeout(() => router.push("/"), 3000);
            } else {
                const data = await res.json().catch(() => ({}));
                const detail = (data as { detail?: string }).detail ?? "";
                if (
                    detail.toLowerCase().includes("expir") ||
                    detail.toLowerCase().includes("invalid") ||
                    res.status === 400
                ) {
                    setStatus("expired");
                } else {
                    throw new Error(detail || "Erreur inattendue.");
                }
            }
        } catch (err) {
            if (status !== "expired") {
                setStatus("error");
                setServerError(err instanceof Error ? err.message : "Erreur inconnue.");
            }
        }
    }

    // ── Succès ────────────────────────────────────────────────────────────────
    if (status === "success") {
        return (
            <div className="flex-1 flex items-center justify-center px-6 py-20">
                <div className="max-w-md w-full space-y-6">
                    <div className="flex flex-col items-center gap-3">
                        <div className="flex items-center justify-center w-16 h-16 border-2 border-[#22C55E] rounded-full shadow-[0_0_24px_rgba(34,197,94,0.4)]">
                            <span className="text-[#22C55E] text-2xl font-bold">✓</span>
                        </div>
                        <div className="font-mono text-[11px] uppercase tracking-[0.3em] text-[#22C55E]">
                            Mot de passe mis à jour
                        </div>
                    </div>

                    <TerminalWindow title="RESET_RESULT">
                        <div className="space-y-2 font-mono text-[11px]">
                            <div className="flex gap-3">
                                <span className="text-[#555] w-32 shrink-0">STATUS:</span>
                                <span className="text-[#22C55E] flex items-center gap-1.5">
                                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#22C55E]" />
                                    PASSWORD_UPDATED
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

    // ── Token expiré ──────────────────────────────────────────────────────────
    if (status === "expired") {
        return (
            <div className="flex-1 flex items-center justify-center px-6 py-20">
                <div className="max-w-md w-full space-y-6">
                    <div className="flex flex-col items-center gap-3">
                        <div className="flex items-center justify-center w-16 h-16 border-2 border-[#FF6B00] rounded-full shadow-[0_0_24px_rgba(255,107,0,0.4)]">
                            <span className="text-[#FF6B00] text-2xl font-bold">✕</span>
                        </div>
                        <div className="font-mono text-[11px] uppercase tracking-[0.3em] text-[#FF6B00]">
                            Lien expiré
                        </div>
                    </div>

                    <TerminalWindow title="RESET_RESULT">
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
                                <span className="text-[#AAAAAA]">1h — délai dépassé</span>
                            </div>
                            <div className="flex gap-3">
                                <span className="text-[#555] w-32 shrink-0">ACTION:</span>
                                <span className="text-[#00F0FF]">NEW_REQUEST_REQUIRED</span>
                            </div>
                        </div>
                    </TerminalWindow>

                    <OvfButton href="/forgot-password" subtitle="(NOUVEAU LIEN VALABLE 1H)">
                        REDEMANDER UN LIEN
                    </OvfButton>
                </div>
            </div>
        );
    }

    // ── Formulaire ────────────────────────────────────────────────────────────
    const statusLabel =
        status === "submitting" ? "PROCESSING..." :
            status === "error" ? "ERROR" :
                "AWAITING_INPUT";
    const statusColor =
        status === "submitting" ? "text-[#F59E0B]" :
            status === "error" ? "text-[#FF6B00]" :
                "text-[#00F0FF]";

    return (
        <div className="flex-1 flex items-start justify-center px-6 py-12">
            <div className="max-w-md w-full space-y-5">
                <TerminalWindow title="RESET_PASSWORD">
                    <div className="space-y-2 font-mono text-[11px] mb-4">
                        <div className="flex gap-3">
                            <span className="text-[#555] w-28 shrink-0">STATUS:</span>
                            <span className={statusColor}>{statusLabel}</span>
                        </div>
                        <div className="flex gap-3">
                            <span className="text-[#555] w-28 shrink-0">TOKEN:</span>
                            <span className="text-[#AAAAAA] truncate max-w-[180px]">
                                {token.slice(0, 20)}...
                            </span>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} noValidate className="space-y-4">
                        {/* Nouveau mot de passe */}
                        <div>
                            <label className="block font-mono text-[9px] uppercase tracking-[0.3em] text-[#555] mb-1.5">
                                NOUVEAU MOT DE PASSE
                            </label>
                            <input
                                type="password"
                                name="new_password"
                                autoComplete="new-password"
                                placeholder="8 caractères minimum"
                                value={form.new_password}
                                onChange={handleChange}
                                className={errors.new_password ? errorInputClass : inputClass}
                                disabled={status === "submitting"}
                            />
                            {errors.new_password && (
                                <p className="font-mono text-[10px] text-[#FF6B00] mt-1 tracking-wide">
                                    ⚠ {errors.new_password}
                                </p>
                            )}
                        </div>

                        {/* Confirmation */}
                        <div>
                            <label className="block font-mono text-[9px] uppercase tracking-[0.3em] text-[#555] mb-1.5">
                                CONFIRMER LE MOT DE PASSE
                            </label>
                            <input
                                type="password"
                                name="confirm_password"
                                autoComplete="new-password"
                                placeholder="Répétez le mot de passe"
                                value={form.confirm_password}
                                onChange={handleChange}
                                className={errors.confirm_password ? errorInputClass : inputClass}
                                disabled={status === "submitting"}
                            />
                            {errors.confirm_password && (
                                <p className="font-mono text-[10px] text-[#FF6B00] mt-1 tracking-wide">
                                    ⚠ {errors.confirm_password}
                                </p>
                            )}
                        </div>

                        {/* Erreur serveur */}
                        {serverError && (
                            <div className="border border-[#FF6B00]/30 bg-[#FF6B00]/5 p-3">
                                <p className="font-mono text-[10px] text-[#FF6B00]">
                                    ⚠ {serverError}
                                </p>
                            </div>
                        )}

                        {/* Submit */}
                        <OvfButton
                            disabled={status === "submitting"}
                            subtitle={
                                status === "submitting"
                                    ? "(traitement en cours...)"
                                    : "(connexion automatique après succès)"
                            }
                            onClick={() => { }}
                        >
                            {status === "submitting" ? "MISE À JOUR..." : "RÉINITIALISER"}
                        </OvfButton>
                    </form>
                </TerminalWindow>

                {/* Lien retour */}
                <div className="font-mono text-[10px] text-center">
                    <Link href="/forgot-password" className="text-[#555] hover:text-[#00F0FF] transition-colors">
                        ← Demander un nouveau lien
                    </Link>
                </div>
            </div>
        </div>
    );
}

// ── Page principale avec Suspense ─────────────────────────────────────────────

export default function ResetPasswordPage() {
    return (
        <div className="min-h-screen bg-[#0A0A0A] flex flex-col">
            <AppHeader />

            {/* Header page */}
            <div className="border-b border-[#111] px-6 py-8 text-center">
                <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-[#555] mb-2">
                    AUTHENTICATION MODULE
                </p>
                <h1 className="font-mono text-xl uppercase tracking-[0.2em] text-white">
                    RÉINITIALISATION MOT DE PASSE
                </h1>
                <p className="font-mono text-[11px] text-[#555] mt-2">
                    Choisissez un nouveau mot de passe.{" "}
                    <span className="text-[#333]">(min. 8 caractères)</span>
                </p>
            </div>

            <Suspense
                fallback={
                    <div className="flex-1 flex items-center justify-center">
                        <span className="font-mono text-[#555] text-[11px] tracking-widest animate-pulse">
                            INITIALIZING...
                        </span>
                    </div>
                }
            >
                <ResetPasswordContent />
            </Suspense>

            <AppFooter />
        </div>
    );
}
