"use client";
import { useState } from "react";
import Link from "next/link";
import { z } from "zod";
import { AppHeader } from "@/components/public/AppHeader";
import { AppFooter } from "@/components/public/AppFooter";
import { TerminalWindow } from "@/components/public/TerminalWindow";
import { OvfButton } from "@/components/public/OvfButton";
import { NeonBadge } from "@/components/public/NeonBadge";

// ── Zod schema ───────────────────────────────────────────────────────────────

const SUBJECTS = [
    { value: "general", label: "Question générale" },
    { value: "order", label: "Ma commande" },
    { value: "design", label: "Mon design / Upload" },
    { value: "partnership", label: "Partenariat" },
    { value: "legal", label: "Demande légale / RGPD" },
    { value: "other", label: "Autre" },
] as const;

type SubjectValue = (typeof SUBJECTS)[number]["value"];

const ContactSchema = z.object({
    name: z
        .string()
        .min(1, "Le nom est requis.")
        .max(100, "Nom trop long (max 100 caractères)."),
    email: z
        .string()
        .email("Adresse email invalide."),
    subject: z.enum(
        SUBJECTS.map((s) => s.value) as [SubjectValue, ...SubjectValue[]],
        { error: "Veuillez sélectionner un sujet." }
    ),
    message: z
        .string()
        .min(10, "Message trop court (min 10 caractères).")
        .max(5000, "Message trop long (max 5000 caractères)."),
});

type ContactForm = z.infer<typeof ContactSchema>;

type FieldErrors = Partial<Record<keyof ContactForm, string>>;

// ── Sub-components ────────────────────────────────────────────────────────────

function FieldLabel({ children }: { children: React.ReactNode }) {
    return (
        <label className="block font-mono text-[9px] uppercase tracking-[0.3em] text-[#555] mb-1.5">
            {children}
        </label>
    );
}

function FieldError({ msg }: { msg?: string }) {
    if (!msg) return null;
    return (
        <p className="font-mono text-[10px] text-[#FF6B00] mt-1 tracking-wide">
            ⚠ {msg}
        </p>
    );
}

const inputClass =
    "w-full bg-[#0A0E14] border border-[#1A1A1A] focus:border-[#00F0FF] focus:outline-none " +
    "font-mono text-[12px] text-white placeholder-[#333] px-3 py-2.5 transition-colors " +
    "focus:shadow-[0_0_12px_rgba(0,240,255,0.12)]";

const errorInputClass =
    "w-full bg-[#0A0E14] border border-[#FF6B00]/60 focus:border-[#FF6B00] focus:outline-none " +
    "font-mono text-[12px] text-white placeholder-[#333] px-3 py-2.5 transition-colors";

// ── Page ─────────────────────────────────────────────────────────────────────

export default function ContactPage() {
    const [form, setForm] = useState<ContactForm>({
        name: "",
        email: "",
        subject: "general",
        message: "",
    });
    const [errors, setErrors] = useState<FieldErrors>({});
    const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
    const [serverError, setServerError] = useState<string | null>(null);

    const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

    function handleChange(
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
    ) {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
        // Effacer l'erreur du champ modifié
        if (errors[name as keyof ContactForm]) {
            setErrors((prev) => ({ ...prev, [name]: undefined }));
        }
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setServerError(null);

        const result = ContactSchema.safeParse(form);
        if (!result.success) {
            const fieldErrors: FieldErrors = {};
            for (const issue of result.error.issues) {
                const field = issue.path[0] as keyof ContactForm;
                if (!fieldErrors[field]) {
                    fieldErrors[field] = issue.message;
                }
            }
            setErrors(fieldErrors);
            return;
        }

        setStatus("sending");
        try {
            const res = await fetch(`${API_URL}/contact`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(result.data),
            });
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(
                    (data as { detail?: string }).detail ??
                    "Erreur lors de l'envoi du message."
                );
            }
            setStatus("sent");
        } catch (err) {
            setStatus("error");
            setServerError(err instanceof Error ? err.message : "Erreur inconnue.");
        }
    }

    // ── État succès ──────────────────────────────────────────────────────────
    if (status === "sent") {
        return (
            <div className="min-h-screen bg-[#0A0A0A] flex flex-col">
                <AppHeader />
                <div className="flex-1 flex items-center justify-center px-6 py-20">
                    <div className="max-w-lg w-full space-y-6">
                        <TerminalWindow title="TRANSMISSION_RESULT">
                            <div className="space-y-2 font-mono text-[11px]">
                                <div className="flex gap-3">
                                    <span className="text-[#555] w-32 shrink-0">STATUS:</span>
                                    <span className="text-[#22C55E] flex items-center gap-1.5">
                                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#22C55E]" />
                                        MESSAGE_TRANSMITTED
                                    </span>
                                </div>
                                <div className="flex gap-3">
                                    <span className="text-[#555] w-32 shrink-0">FROM:</span>
                                    <span className="text-white">{form.name}</span>
                                </div>
                                <div className="flex gap-3">
                                    <span className="text-[#555] w-32 shrink-0">EMAIL:</span>
                                    <span className="text-[#AAAAAA]">{form.email}</span>
                                </div>
                                <div className="flex gap-3">
                                    <span className="text-[#555] w-32 shrink-0">VERDICT:</span>
                                    <span className="text-[#00F0FF]">
                                        NOUS_AVONS_BIEN_RECU_VOTRE_SIGNAL
                                    </span>
                                </div>
                                <div className="flex gap-3">
                                    <span className="text-[#555] w-32 shrink-0">RESPONSE_TIME:</span>
                                    <span className="text-[#AAAAAA]">
                                        Sous 48h (humains, pas des LLM)
                                    </span>
                                </div>
                            </div>
                        </TerminalWindow>
                        <OvfButton href="/" subtitle="(RETOUR AU CHAOS PRINCIPAL)">
                            RETOUR À LA BASE
                        </OvfButton>
                    </div>
                </div>
                <AppFooter />
            </div>
        );
    }

    // ── Formulaire ───────────────────────────────────────────────────────────
    const statusColor =
        status === "sending" ? "text-[#F59E0B]" :
            status === "error" ? "text-[#FF6B00]" :
                "text-[#00F0FF]";
    const statusLabel =
        status === "sending" ? "SENDING..." :
            status === "error" ? "ERROR" :
                "READY";

    return (
        <div className="min-h-screen bg-[#0A0A0A] flex flex-col">
            <AppHeader />

            {/* Page header */}
            <section className="border-b border-[#00F0FF]/10 py-8 px-6">
                <div className="max-w-7xl mx-auto">
                    <p className="font-mono text-[10px] text-[#444] uppercase tracking-widest mb-2">
                        <Link href="/" className="hover:text-[#00F0FF] transition-colors">HOME</Link>
                        {" "}›{" "}
                        <span className="text-[#AAAAAA]">CONTACT</span>
                    </p>
                    <h1 className="font-mono text-xl text-white uppercase tracking-[0.15em]">
                        <span className="text-[#FF6B00]">SIGNAL</span>_TRANSMISSION
                    </h1>
                    <p className="font-mono text-[11px] text-[#555] mt-1 uppercase tracking-widest">
                        Envoyez votre message — on répondra, promis
                    </p>
                </div>
            </section>

            <div className="max-w-7xl mx-auto w-full px-6 py-10 flex gap-10 flex-1 items-start">

                {/* ── Formulaire principal ── */}
                <div className="flex-1 min-w-0 max-w-2xl">
                    <form onSubmit={handleSubmit} noValidate>
                        <TerminalWindow title="CONTACT_FORM.exe" className="mb-6">
                            <div className="space-y-5">

                                {/* Nom */}
                                <div>
                                    <FieldLabel>Nom *</FieldLabel>
                                    <input
                                        type="text"
                                        name="name"
                                        value={form.name}
                                        onChange={handleChange}
                                        placeholder="VOTRE_NOM_ICI"
                                        className={errors.name ? errorInputClass : inputClass}
                                        autoComplete="name"
                                    />
                                    <FieldError msg={errors.name} />
                                </div>

                                {/* Email */}
                                <div>
                                    <FieldLabel>Email *</FieldLabel>
                                    <input
                                        type="email"
                                        name="email"
                                        value={form.email}
                                        onChange={handleChange}
                                        placeholder="human@domain.io"
                                        className={errors.email ? errorInputClass : inputClass}
                                        autoComplete="email"
                                    />
                                    <FieldError msg={errors.email} />
                                </div>

                                {/* Sujet */}
                                <div>
                                    <FieldLabel>Sujet *</FieldLabel>
                                    <select
                                        name="subject"
                                        value={form.subject}
                                        onChange={handleChange}
                                        className={`${errors.subject ? errorInputClass : inputClass} cursor-pointer`}
                                    >
                                        {SUBJECTS.map((s) => (
                                            <option key={s.value} value={s.value}>
                                                {s.label}
                                            </option>
                                        ))}
                                    </select>
                                    <FieldError msg={errors.subject} />
                                </div>

                                {/* Message */}
                                <div>
                                    <FieldLabel>Message * ({form.message.length}/5000)</FieldLabel>
                                    <textarea
                                        name="message"
                                        value={form.message}
                                        onChange={handleChange}
                                        placeholder="Exprimez votre situation ici. L'IA ne lira pas ce message. Des humains si."
                                        rows={7}
                                        className={`${errors.message ? errorInputClass : inputClass} resize-none`}
                                    />
                                    <FieldError msg={errors.message} />
                                </div>

                                {/* Erreur serveur */}
                                {status === "error" && serverError && (
                                    <div className="border border-[#FF6B00]/40 bg-[#FF6B00]/5 px-3 py-2 font-mono text-[11px] text-[#FF6B00]">
                                        ⚠ {serverError}
                                    </div>
                                )}

                                {/* Submit */}
                                <OvfButton
                                    disabled={status === "sending"}
                                    subtitle={status === "sending" ? "(TRANSMISSION EN COURS...)" : "(VOS DONNÉES RESTERONT DANS L'ESPACE-TEMPS)"}
                                >
                                    {status === "sending" ? "ENVOI EN COURS..." : "ENVOYER LE MESSAGE"}
                                </OvfButton>

                            </div>
                        </TerminalWindow>
                    </form>
                </div>

                {/* ── Sidebar infos ── */}
                <aside className="hidden lg:block w-72 shrink-0 space-y-4">
                    <TerminalWindow title="CONTACT_INFO.txt">
                        <div className="space-y-3 font-mono text-[11px]">
                            <div>
                                <p className="text-[9px] text-[#FF6B00] uppercase tracking-widest mb-1">
                                    // Email direct
                                </p>
                                <a
                                    href="mailto:contact@overfitted.io"
                                    className="text-[#00F0FF] hover:underline underline-offset-2 break-all"
                                >
                                    contact@overfitted.io
                                </a>
                                <p className="text-[#444] text-[10px] mt-0.5">
                                    Fallback si le formulaire échoue
                                </p>
                            </div>
                            <hr className="border-[#1A1A1A]" />
                            <div>
                                <p className="text-[9px] text-[#FF6B00] uppercase tracking-widest mb-1">
                                    // RGPD / Légal
                                </p>
                                <a
                                    href="mailto:privacy@overfitted.io"
                                    className="text-[#AAAAAA] hover:text-[#00F0FF] transition-colors break-all"
                                >
                                    privacy@overfitted.io
                                </a>
                                <p className="text-[#444] text-[10px] mt-0.5">
                                    Droits d&apos;accès, rectification, effacement (RGPD)
                                </p>
                            </div>
                            <hr className="border-[#1A1A1A]" />
                            <div>
                                <p className="text-[9px] text-[#FF6B00] uppercase tracking-widest mb-1">
                                    // Support commandes
                                </p>
                                <a
                                    href="mailto:support@overfitted.io"
                                    className="text-[#AAAAAA] hover:text-[#00F0FF] transition-colors break-all"
                                >
                                    support@overfitted.io
                                </a>
                                <p className="text-[#444] text-[10px] mt-0.5">
                                    Annulation dans les 2h post-commande uniquement
                                </p>
                            </div>
                            <hr className="border-[#1A1A1A]" />
                            <div className="flex items-center gap-2">
                                <span className="text-[#555]">RESPONSE_TIME:</span>
                                <NeonBadge label="&lt; 48H" />
                            </div>
                        </div>
                    </TerminalWindow>

                    <div
                        className="border border-[#1A1A1A] bg-[#0D1117] p-4 font-mono text-[10px] text-[#444]"
                    >
                        <p className="text-[#555] mb-1 uppercase tracking-wider">Conformité LCEN</p>
                        <p className="leading-relaxed">
                            Tout éditeur de site est tenu de rendre ses coordonnées de contact
                            accessibles aux utilisateurs (Art. 6-III LCEN).
                            Cette page satisfait à cette obligation.
                        </p>
                        <Link
                            href="/legal"
                            className="text-[#555] hover:text-[#00F0FF] transition-colors mt-2 inline-block"
                        >
                            → Mentions légales complètes
                        </Link>
                    </div>
                </aside>
            </div>

            {/* Status bar */}
            <div
                className="fixed bottom-0 left-0 right-0 h-6 bg-[#000] border-t border-[#1A1A1A] flex items-center px-4 gap-6 z-40"
            >
                <span className="font-mono text-[9px] text-[#555] uppercase tracking-widest">
                    Contact State:{" "}
                    <span className={statusColor}>
                        {statusLabel}
                    </span>
                </span>
                <span className="font-mono text-[9px] text-[#333]">|</span>
                <span className="font-mono text-[9px] text-[#555] uppercase tracking-widest">
                    LCEN: <span className="text-[#22C55E]">COMPLIANT</span>
                </span>
            </div>

            <div className="pb-6">
                <AppFooter />
            </div>
        </div>
    );
}
