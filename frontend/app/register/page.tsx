"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { AppHeader } from "@/components/public/AppHeader";
import { AppFooter } from "@/components/public/AppFooter";
import { TerminalWindow } from "@/components/public/TerminalWindow";
import { OvfButton } from "@/components/public/OvfButton";
import { useRegisterMutation } from "@/lib/publicApi";

// ── Zod ───────────────────────────────────────────────────────────────────────

const RegisterSchema = z
    .object({
        email: z.string().email("Adresse email invalide."),
        password: z
            .string()
            .min(8, "Mot de passe trop court (min 8 caractères)."),
        confirm_password: z.string(),
        cgv: z.literal(true, {
            error: "Vous devez accepter les CGV.",
        }),
    })
    .refine((d) => d.password === d.confirm_password, {
        message: "Les mots de passe ne correspondent pas.",
        path: ["confirm_password"],
    });

type RegisterForm = {
    email: string;
    password: string;
    confirm_password: string;
    cgv: boolean;
};

type FieldErrors = Partial<Record<keyof RegisterForm, string>>;

// ── Styles ────────────────────────────────────────────────────────────────────

const inputClass =
    "w-full bg-[#0A0E14] border border-[#1A1A1A] focus:border-[#00F0FF] focus:outline-none " +
    "font-mono text-[12px] text-white placeholder-[#333] px-3 py-2.5 transition-colors " +
    "focus:shadow-[0_0_12px_rgba(0,240,255,0.12)]";

const errorInputClass =
    "w-full bg-[#0A0E14] border border-[#FF6B00]/60 focus:border-[#FF6B00] focus:outline-none " +
    "font-mono text-[12px] text-white placeholder-[#333] px-3 py-2.5 transition-colors";

// ── Page ──────────────────────────────────────────────────────────────────────

export default function RegisterPage() {
    const router = useRouter();
    const [register, { isLoading }] = useRegisterMutation();

    const [form, setForm] = useState<RegisterForm>({
        email: "",
        password: "",
        confirm_password: "",
        cgv: false,
    });
    const [errors, setErrors] = useState<FieldErrors>({});
    const [serverError, setServerError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
        const { name, type, checked, value } = e.target;
        const newValue = type === "checkbox" ? checked : value;
        setForm((prev) => ({ ...prev, [name]: newValue }));
        if (errors[name as keyof RegisterForm]) {
            setErrors((prev) => ({ ...prev, [name]: undefined }));
        }
        setServerError(null);
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setServerError(null);

        const result = RegisterSchema.safeParse(form);
        if (!result.success) {
            const fieldErrors: FieldErrors = {};
            for (const issue of result.error.issues) {
                const field = issue.path[0] as keyof RegisterForm;
                if (!fieldErrors[field]) fieldErrors[field] = issue.message;
            }
            setErrors(fieldErrors);
            return;
        }

        try {
            await register({
                email: result.data.email,
                password: result.data.password,
            }).unwrap();
            setSuccess(true);
            // Pas de redirect immédiat — l'utilisateur doit vérifier son email
        } catch (err) {
            const e = err as { data?: { detail?: string }; status?: number };
            if (e.status === 409) {
                setErrors({ email: "Un compte avec cet email existe déjà." });
            } else {
                setServerError(
                    e.data?.detail ?? "Erreur lors de la création du compte."
                );
            }
        }
    }

    // ── État succès (email envoyé) ─────────────────────────────────────────
    if (success) {
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
                                Compte créé
                            </div>
                        </div>

                        <TerminalWindow title="REGISTER_RESULT">
                            <div className="space-y-2 font-mono text-[11px]">
                                <div className="flex gap-3">
                                    <span className="text-[#555] w-32 shrink-0">STATUS:</span>
                                    <span className="text-[#22C55E] flex items-center gap-1.5">
                                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#22C55E]" />
                                        ACCOUNT_CREATED
                                    </span>
                                </div>
                                <div className="flex gap-3">
                                    <span className="text-[#555] w-32 shrink-0">EMAIL:</span>
                                    <span className="text-[#AAAAAA]">{form.email}</span>
                                </div>
                                <div className="flex gap-3">
                                    <span className="text-[#555] w-32 shrink-0">NEXT:</span>
                                    <span className="text-[#00F0FF]">CHECK_YOUR_INBOX</span>
                                </div>
                                <div className="flex gap-3">
                                    <span className="text-[#555] w-32 shrink-0">TTL:</span>
                                    <span className="text-[#AAAAAA]">Lien valable 24h</span>
                                </div>
                                <div className="flex gap-3">
                                    <span className="text-[#555] w-32 shrink-0">NOTE:</span>
                                    <span className="text-[#555]">Vérifiez aussi vos spams</span>
                                </div>
                            </div>
                        </TerminalWindow>

                        <OvfButton href="/login" subtitle="(après vérification)">
                            CONNEXION
                        </OvfButton>
                    </div>
                </div>
                <AppFooter />
            </div>
        );
    }

    // ── Formulaire ────────────────────────────────────────────────────────────
    const statusLabel = isLoading ? "PROCESSING..." : "AWAITING_INPUT";
    const statusColor = isLoading ? "text-[#F59E0B]" : "text-[#00F0FF]";

    return (
        <div className="min-h-screen bg-[#0A0A0A] flex flex-col">
            <AppHeader />

            {/* Header page */}
            <div className="border-b border-[#111] px-6 py-8 text-center">
                <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-[#555] mb-2">
                    AUTHENTICATION MODULE
                </p>
                <h1 className="font-mono text-xl uppercase tracking-[0.2em] text-white">
                    CRÉER UN COMPTE
                </h1>
                <p className="font-mono text-[11px] text-[#555] mt-2">
                    Rejoignez le chaos.{" "}
                    <span className="text-[#333]">(si vous êtes sûr de vous)</span>
                </p>
            </div>

            {/* Formulaire */}
            <div className="flex-1 flex items-start justify-center px-6 py-12">
                <div className="max-w-md w-full space-y-5">
                    <TerminalWindow title="REGISTER">
                        <div className="space-y-2 font-mono text-[11px] mb-4">
                            <div className="flex gap-3">
                                <span className="text-[#555] w-28 shrink-0">STATUS:</span>
                                <span className={statusColor}>{statusLabel}</span>
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
                                <label className="block font-mono text-[9px] uppercase tracking-[0.3em] text-[#555] mb-1.5">
                                    MOT DE PASSE
                                </label>
                                <input
                                    type="password"
                                    name="password"
                                    autoComplete="new-password"
                                    placeholder="8 caractères minimum"
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
                                    disabled={isLoading}
                                />
                                {errors.confirm_password && (
                                    <p className="font-mono text-[10px] text-[#FF6B00] mt-1">
                                        ⚠ {errors.confirm_password}
                                    </p>
                                )}
                            </div>

                            {/* CGV */}
                            <div>
                                <label className="flex items-start gap-3 cursor-pointer group">
                                    <div className="relative mt-0.5 shrink-0">
                                        <input
                                            type="checkbox"
                                            name="cgv"
                                            checked={form.cgv}
                                            onChange={handleChange}
                                            className="sr-only"
                                            disabled={isLoading}
                                        />
                                        <div
                                            className={`w-4 h-4 border font-mono text-[10px] flex items-center justify-center transition-colors ${form.cgv
                                                    ? "border-[#FF6B00] text-[#FF6B00] bg-[#FF6B00]/10"
                                                    : errors.cgv
                                                        ? "border-[#FF6B00]/60"
                                                        : "border-[#333] group-hover:border-[#555]"
                                                }`}
                                        >
                                            {form.cgv ? "✕" : ""}
                                        </div>
                                    </div>
                                    <span className="font-mono text-[10px] text-[#777] leading-relaxed">
                                        J&apos;accepte les{" "}
                                        <Link
                                            href="/legal"
                                            target="_blank"
                                            className="text-[#00F0FF] hover:underline"
                                        >
                                            Conditions Générales de Vente
                                        </Link>{" "}
                                        et la{" "}
                                        <Link
                                            href="/legal"
                                            target="_blank"
                                            className="text-[#00F0FF] hover:underline"
                                        >
                                            Politique de confidentialité
                                        </Link>
                                        .
                                    </span>
                                </label>
                                {errors.cgv && (
                                    <p className="font-mono text-[10px] text-[#FF6B00] mt-1">
                                        ⚠ {errors.cgv}
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
                                subtitle={isLoading ? "(création en cours...)" : "(vérification email requise)"}
                                onClick={() => { }}
                            >
                                {isLoading ? "CRÉATION..." : "CRÉER MON COMPTE"}
                            </OvfButton>
                        </form>
                    </TerminalWindow>

                    {/* Liens annexes */}
                    <div className="text-center font-mono text-[10px] text-[#555]">
                        Déjà un compte ?{" "}
                        <Link href="/login" className="text-[#00F0FF] hover:underline">
                            Se connecter →
                        </Link>
                    </div>
                </div>
            </div>

            <AppFooter />
        </div>
    );
}
