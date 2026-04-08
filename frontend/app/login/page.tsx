"use client";
import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { z } from "zod";
import { AppHeader } from "@/components/public/AppHeader";
import { AppFooter } from "@/components/public/AppFooter";
import { TerminalWindow } from "@/components/public/TerminalWindow";
import { OvfButton } from "@/components/public/OvfButton";
import { useLoginMutation } from "@/lib/publicApi";

// ── Zod ───────────────────────────────────────────────────────────────────────

const LoginSchema = z.object({
    email: z.string().email("Adresse email invalide."),
    password: z.string().min(1, "Mot de passe requis."),
});

type LoginForm = z.infer<typeof LoginSchema>;
type FieldErrors = Partial<Record<keyof LoginForm, string>>;

// ── Styles ────────────────────────────────────────────────────────────────────

const inputClass =
    "w-full bg-[#0A0E14] border border-[#1A1A1A] focus:border-[#00F0FF] focus:outline-none " +
    "font-mono text-[12px] text-white placeholder-[#333] px-3 py-2.5 transition-colors " +
    "focus:shadow-[0_0_12px_rgba(0,240,255,0.12)]";

const errorInputClass =
    "w-full bg-[#0A0E14] border border-[#FF6B00]/60 focus:border-[#FF6B00] focus:outline-none " +
    "font-mono text-[12px] text-white placeholder-[#333] px-3 py-2.5 transition-colors";

// ── Inner component (uses useSearchParams) ────────────────────────────────────

function LoginContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const nextUrl = searchParams.get("next") ?? "/";

    const [login, { isLoading }] = useLoginMutation();

    const [form, setForm] = useState<LoginForm>({ email: "", password: "" });
    const [errors, setErrors] = useState<FieldErrors>({});
    const [serverError, setServerError] = useState<string | null>(null);

    function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
        if (errors[name as keyof LoginForm]) {
            setErrors((prev) => ({ ...prev, [name]: undefined }));
        }
        setServerError(null);
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setServerError(null);

        const result = LoginSchema.safeParse(form);
        if (!result.success) {
            const fieldErrors: FieldErrors = {};
            for (const issue of result.error.issues) {
                const field = issue.path[0] as keyof LoginForm;
                if (!fieldErrors[field]) fieldErrors[field] = issue.message;
            }
            setErrors(fieldErrors);
            return;
        }

        try {
            await login(result.data).unwrap();
            // Cookie HttpOnly posé par le backend — redirect vers la page précédente
            router.push(nextUrl);
        } catch (err) {
            const e = err as { data?: { detail?: string }; status?: number | string };
            if (e.status === 401) {
                setServerError("Email ou mot de passe incorrect.");
            } else if (e.status === 403) {
                setServerError("Compte désactivé — contactez le support.");
            } else {
                setServerError(
                    (e.data?.detail) ?? "Erreur de connexion. Vérifiez vos identifiants."
                );
            }
        }
    }

    const statusLabel = isLoading ? "AUTHENTICATING..." : "AWAITING_INPUT";
    const statusColor = isLoading ? "text-[#F59E0B]" : "text-[#00F0FF]";

    return (
        <div className="flex-1 flex items-start justify-center px-6 py-12">
            <div className="max-w-md w-full space-y-5">
                <TerminalWindow title="LOGIN">
                    <div className="space-y-2 font-mono text-[11px] mb-4">
                        <div className="flex gap-3">
                            <span className="text-[#555] w-28 shrink-0">STATUS:</span>
                            <span className={statusColor}>{statusLabel}</span>
                        </div>
                        {nextUrl !== "/" && (
                            <div className="flex gap-3">
                                <span className="text-[#555] w-28 shrink-0">REDIRECT:</span>
                                <span className="text-[#AAAAAA] truncate max-w-[200px]">
                                    {nextUrl}
                                </span>
                            </div>
                        )}
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
                                disabled={isLoading}
                            />
                            {errors.email && (
                                <p className="font-mono text-[10px] text-[#FF6B00] mt-1">
                                    ⚠ {errors.email}
                                </p>
                            )}
                        </div>

                        {/* Mot de passe */}
                        <div>
                            <div className="flex items-center justify-between mb-1.5">
                                <label className="font-mono text-[9px] uppercase tracking-[0.3em] text-[#555]">
                                    MOT DE PASSE
                                </label>
                                <Link
                                    href="/forgot-password"
                                    className="font-mono text-[9px] text-[#555] hover:text-[#00F0FF] transition-colors"
                                    tabIndex={-1}
                                >
                                    Oublié ?
                                </Link>
                            </div>
                            <input
                                type="password"
                                name="password"
                                autoComplete="current-password"
                                placeholder="••••••••"
                                value={form.password}
                                onChange={handleChange}
                                className={errors.password ? errorInputClass : inputClass}
                                disabled={isLoading}
                            />
                            {errors.password && (
                                <p className="font-mono text-[10px] text-[#FF6B00] mt-1">
                                    ⚠ {errors.password}
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
                            disabled={isLoading}
                            subtitle={isLoading ? "(vérification en cours...)" : "(cookie HttpOnly — pas de localStorage)"}
                            onClick={() => { }}
                        >
                            {isLoading ? "CONNEXION..." : "SE CONNECTER"}
                        </OvfButton>
                    </form>
                </TerminalWindow>

                {/* Liens annexes */}
                <div className="flex justify-between font-mono text-[10px] text-[#555]">
                    <Link href="/register" className="hover:text-[#00F0FF] transition-colors">
                        Pas encore de compte ? →
                    </Link>
                    <Link href="/forgot-password" className="hover:text-[#00F0FF] transition-colors">
                        Mot de passe oublié →
                    </Link>
                </div>
            </div>
        </div>
    );
}

// ── Page principale avec Suspense ─────────────────────────────────────────────

export default function LoginPage() {
    return (
        <div className="min-h-screen bg-[#0A0A0A] flex flex-col">
            <AppHeader />

            {/* Header page */}
            <div className="border-b border-[#111] px-6 py-8 text-center">
                <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-[#555] mb-2">
                    AUTHENTICATION MODULE
                </p>
                <h1 className="font-mono text-xl uppercase tracking-[0.2em] text-white">
                    CONNEXION
                </h1>
                <p className="font-mono text-[11px] text-[#555] mt-2">
                    Identifiez-vous.{" "}
                    <span className="text-[#333]">(si vous avez un compte)</span>
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
                <LoginContent />
            </Suspense>

            <AppFooter />
        </div>
    );
}
