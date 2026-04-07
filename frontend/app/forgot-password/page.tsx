"use client";
import { useState } from "react";
import Link from "next/link";
import { z } from "zod";
import { AppHeader } from "@/components/public/AppHeader";
import { AppFooter } from "@/components/public/AppFooter";
import { TerminalWindow } from "@/components/public/TerminalWindow";
import { OvfButton } from "@/components/public/OvfButton";

// ── Zod ───────────────────────────────────────────────────────────────────────

const ForgotSchema = z.object({
    email: z.string().email("Adresse email invalide."),
});

type ForgotForm = z.infer<typeof ForgotSchema>;
type FieldErrors = Partial<Record<keyof ForgotForm, string>>;

// ── Styles partagés ──────────────────────────────────────────────────────────

const inputClass =
    "w-full bg-[#0A0E14] border border-[#1A1A1A] focus:border-[#00F0FF] focus:outline-none " +
    "font-mono text-[12px] text-white placeholder-[#333] px-3 py-2.5 transition-colors " +
    "focus:shadow-[0_0_12px_rgba(0,240,255,0.12)]";

const errorInputClass =
    "w-full bg-[#0A0E14] border border-[#FF6B00]/60 focus:border-[#FF6B00] focus:outline-none " +
    "font-mono text-[12px] text-white placeholder-[#333] px-3 py-2.5 transition-colors";

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ForgotPasswordPage() {
    const [form, setForm] = useState<ForgotForm>({ email: "" });
    const [errors, setErrors] = useState<FieldErrors>({});
    const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
    const [serverError, setServerError] = useState<string | null>(null);

    const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

    function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
        if (errors[name as keyof ForgotForm]) {
            setErrors((prev) => ({ ...prev, [name]: undefined }));
        }
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setServerError(null);

        const result = ForgotSchema.safeParse(form);
        if (!result.success) {
            const fieldErrors: FieldErrors = {};
            for (const issue of result.error.issues) {
                const field = issue.path[0] as keyof ForgotForm;
                if (!fieldErrors[field]) fieldErrors[field] = issue.message;
            }
            setErrors(fieldErrors);
            return;
        }

        setStatus("sending");
        try {
            const res = await fetch(`${API_URL}/auth/forgot-password`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(result.data),
            });
            // Réponse identique qu'il existe ou non — sécurité OWASP A01
            if (res.ok || res.status === 404) {
                setStatus("sent");
            } else {
                const data = await res.json().catch(() => ({}));
                throw new Error(
                    (data as { detail?: string }).detail ?? "Erreur inattendue."
                );
            }
        } catch (err) {
            setStatus("error");
            setServerError(err instanceof Error ? err.message : "Erreur inconnue.");
        }
    }

    // ── État envoyé ───────────────────────────────────────────────────────────
    if (status === "sent") {
        return (
            <div className="min-h-screen bg-[#0A0A0A] flex flex-col">
                <AppHeader />
                <div className="flex-1 flex items-center justify-center px-6 py-20">
                    <div className="max-w-md w-full space-y-6">
                        <div className="flex flex-col items-center gap-3">
                            <div className="flex items-center justify-center w-16 h-16 border-2 border-[#00F0FF] rounded-full shadow-[0_0_24px_rgba(0,240,255,0.35)]">
                                <span className="text-[#00F0FF] text-2xl">✉</span>
                            </div>
                            <div className="font-mono text-[11px] uppercase tracking-[0.3em] text-[#00F0FF]">
                                Signal envoyé
                            </div>
                        </div>

                        <TerminalWindow title="RESET_REQUEST_RESULT">
                            <div className="space-y-2 font-mono text-[11px]">
                                <div className="flex gap-3">
                                    <span className="text-[#555] w-32 shrink-0">STATUS:</span>
                                    <span className="text-[#22C55E] flex items-center gap-1.5">
                                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#22C55E]" />
                                        REQUEST_PROCESSED
                                    </span>
                                </div>
                                <div className="flex gap-3">
                                    <span className="text-[#555] w-32 shrink-0">MESSAGE:</span>
                                    <span className="text-[#AAAAAA] leading-relaxed">
                                        Si cet email est enregistré, un lien vous a été envoyé.
                                    </span>
                                </div>
                                <div className="flex gap-3">
                                    <span className="text-[#555] w-32 shrink-0">TTL:</span>
                                    <span className="text-[#AAAAAA]">Lien valable 1h</span>
                                </div>
                                <div className="flex gap-3">
                                    <span className="text-[#555] w-32 shrink-0">SPAM:</span>
                                    <span className="text-[#555]">Vérifiez aussi vos spams</span>
                                </div>
                            </div>
                        </TerminalWindow>

                        <OvfButton href="/login" subtitle="(RETOUR À L'AUTH)">
                            RETOUR À LA CONNEXION
                        </OvfButton>
                    </div>
                </div>
                <AppFooter />
            </div>
        );
    }

    // ── Formulaire ────────────────────────────────────────────────────────────
    const statusLabel =
        status === "sending" ? "SENDING..." :
            status === "error" ? "ERROR" :
                "AWAITING_INPUT";
    const statusColor =
        status === "sending" ? "text-[#F59E0B]" :
            status === "error" ? "text-[#FF6B00]" :
                "text-[#00F0FF]";

    return (
        <div className="min-h-screen bg-[#0A0A0A] flex flex-col">
            <AppHeader />

            {/* Header page */}
            <div className="border-b border-[#111] px-6 py-8 text-center">
                <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-[#555] mb-2">
                    AUTHENTICATION MODULE
                </p>
                <h1 className="font-mono text-xl uppercase tracking-[0.2em] text-white">
                    MOT DE PASSE OUBLIÉ
                </h1>
                <p className="font-mono text-[11px] text-[#555] mt-2">
                    Entrez votre email — on gère le reste.{" "}
                    <span className="text-[#333]">(si vous existez dans notre base)</span>
                </p>
            </div>

            {/* Contenu */}
            <div className="flex-1 flex items-start justify-center px-6 py-12">
                <div className="max-w-md w-full space-y-5">
                    <TerminalWindow title="RESET_PASSWORD_REQUEST">
                        <div className="space-y-2 font-mono text-[11px] mb-4">
                            <div className="flex gap-3">
                                <span className="text-[#555] w-28 shrink-0">STATUS:</span>
                                <span className={statusColor}>{statusLabel}</span>
                            </div>
                            <div className="flex gap-3">
                                <span className="text-[#555] w-28 shrink-0">SECURITY:</span>
                                <span className="text-[#AAAAAA]">OWASP_A01_COMPLIANT</span>
                            </div>
                        </div>

                        <form onSubmit={handleSubmit} noValidate className="space-y-4">
                            {/* Email */}
                            <div>
                                <label className="block font-mono text-[9px] uppercase tracking-[0.3em] text-[#555] mb-1.5">
                                    ADRESSE EMAIL
                                </label>
                                <input
                                    type="email"
                                    name="email"
                                    autoComplete="email"
                                    placeholder="votre@email.com"
                                    value={form.email}
                                    onChange={handleChange}
                                    className={errors.email ? errorInputClass : inputClass}
                                    disabled={status === "sending"}
                                />
                                {errors.email && (
                                    <p className="font-mono text-[10px] text-[#FF6B00] mt-1 tracking-wide">
                                        ⚠ {errors.email}
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

                            {/* Note sécurité */}
                            <p className="font-mono text-[10px] text-[#333] leading-relaxed">
                                // Réponse identique que l&apos;email existe ou non — prévention énumération.
                            </p>

                            {/* Submit */}
                            <OvfButton
                                disabled={status === "sending"}
                                subtitle={status === "sending" ? "(envoi en cours...)" : "(lien valable 1h)"}
                                onClick={() => { }}
                            >
                                {status === "sending" ? "ENVOI..." : "ENVOYER LE LIEN"}
                            </OvfButton>
                        </form>
                    </TerminalWindow>

                    {/* Liens annexes */}
                    <div className="flex justify-between font-mono text-[10px] text-[#555]">
                        <Link href="/login" className="hover:text-[#00F0FF] transition-colors">
                            ← Retour à la connexion
                        </Link>
                        <Link href="/register" className="hover:text-[#00F0FF] transition-colors">
                            Créer un compte →
                        </Link>
                    </div>
                </div>
            </div>

            <AppFooter />
        </div>
    );
}
