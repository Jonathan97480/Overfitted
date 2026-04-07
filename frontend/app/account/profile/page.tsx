"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { Eye, EyeOff, Download, Trash2, Save, AlertTriangle } from "lucide-react";
import { AppHeader } from "@/components/public/AppHeader";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
    useGetMeQuery,
    useGetMyOrdersQuery,
    usePatchMeMutation,
    useDeleteMeMutation,
    useLogoutMutation,
} from "@/lib/publicApi";

// ─── Constantes ───────────────────────────────────────────────────────────────

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const ACTIVE_STATUSES = new Set(["pending", "paid", "submitted"]);

const pwdSchema = z
    .object({
        current_password: z.string().min(1, "Mot de passe actuel requis"),
        new_password: z.string().min(8, "Minimum 8 caractères"),
        confirm_password: z.string().min(1, "Confirmation requise"),
    })
    .refine((d) => d.new_password === d.confirm_password, {
        message: "Les mots de passe ne correspondent pas",
        path: ["confirm_password"],
    });

// ─── SectionCard ──────────────────────────────────────────────────────────────

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="border border-[#00F0FF]/15 rounded-lg bg-[#0A1628] p-6">
            <h2 className="text-xs font-mono uppercase tracking-widest text-[#00F0FF] mb-5">
                {title}
            </h2>
            {children}
        </div>
    );
}

// ─── FieldGroup ───────────────────────────────────────────────────────────────

function FieldGroup({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="space-y-1">
            <label className="text-xs text-[#475569] uppercase tracking-widest font-mono">
                {label}
            </label>
            {children}
        </div>
    );
}

function CyberInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
    return (
        <input
            {...props}
            className={`w-full bg-[#050A14] border border-[#00F0FF]/20 rounded px-3 py-2 text-sm text-white font-mono placeholder-[#334155] focus:outline-none focus:border-[#00F0FF]/60 transition-colors ${props.className ?? ""}`}
        />
    );
}

function InlineError({ msg }: { msg: string }) {
    return <p className="text-red-400 text-xs font-mono mt-1">{msg}</p>;
}

function Toast({
    msg,
    variant,
}: {
    msg: string;
    variant: "success" | "error";
}) {
    return (
        <p
            className={`text-xs font-mono mt-3 ${variant === "success" ? "text-green-400" : "text-red-400"
                }`}
        >
            {msg}
        </p>
    );
}

// ─── Section Informations personnelles ───────────────────────────────────────

function InfoSection({ email, displayName }: { email: string; displayName: string | null }) {
    const [name, setName] = useState(displayName ?? "");
    const [feedback, setFeedback] = useState<{ msg: string; variant: "success" | "error" } | null>(null);
    const [patchMe, { isLoading }] = usePatchMeMutation();

    const handleSave = async () => {
        setFeedback(null);
        try {
            await patchMe({ display_name: name }).unwrap();
            setFeedback({ msg: "Nom d'affichage mis à jour.", variant: "success" });
        } catch {
            setFeedback({ msg: "Erreur lors de la mise à jour.", variant: "error" });
        }
    };

    return (
        <SectionCard title="INFOS_PERSONNELLES">
            <div className="space-y-4">
                <FieldGroup label="Email">
                    <p className="text-sm text-[#CBD5E1] font-mono bg-[#050A14] border border-[#1E293B] rounded px-3 py-2">
                        {email}
                    </p>
                    <p className="text-xs text-[#334155] font-mono mt-1">
                        Pour modifier l'email, contactez le support.
                    </p>
                </FieldGroup>

                <FieldGroup label="Nom d'affichage">
                    <CyberInput
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Ton alias dans le système"
                        maxLength={50}
                    />
                </FieldGroup>

                <button
                    onClick={handleSave}
                    disabled={isLoading}
                    className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-widest border border-[#00F0FF]/30 text-[#00F0FF] px-4 py-2 rounded hover:bg-[#00F0FF]/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <Save className="w-3 h-3" />
                    {isLoading ? "Sauvegarde…" : "Sauvegarder"}
                </button>

                {feedback && <Toast msg={feedback.msg} variant={feedback.variant} />}
            </div>
        </SectionCard>
    );
}

// ─── Section Mot de passe ─────────────────────────────────────────────────────

function PasswordSection() {
    const [form, setForm] = useState({
        current_password: "",
        new_password: "",
        confirm_password: "",
    });
    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [errors, setErrors] = useState<Partial<typeof form>>({});
    const [feedback, setFeedback] = useState<{ msg: string; variant: "success" | "error" } | null>(null);
    const [patchMe, { isLoading }] = usePatchMeMutation();

    const handleChange = (k: keyof typeof form, v: string) => {
        setForm((f) => ({ ...f, [k]: v }));
        setErrors((e) => ({ ...e, [k]: undefined }));
    };

    const handleSubmit = async (ev: React.FormEvent) => {
        ev.preventDefault();
        setFeedback(null);
        const parsed = pwdSchema.safeParse(form);
        if (!parsed.success) {
            const fe: Partial<typeof form> = {};
            for (const e of parsed.error.issues) {
                const key = e.path[0] as keyof typeof form;
                if (key) fe[key] = e.message;
            }
            setErrors(fe);
            return;
        }
        try {
            await patchMe({
                current_password: form.current_password,
                new_password: form.new_password,
            }).unwrap();
            setForm({ current_password: "", new_password: "", confirm_password: "" });
            setFeedback({ msg: "Mot de passe modifié avec succès.", variant: "success" });
        } catch (err: unknown) {
            const detail = (err as { data?: { detail?: string } })?.data?.detail;
            setFeedback({ msg: detail ?? "Erreur lors du changement.", variant: "error" });
        }
    };

    return (
        <SectionCard title="CHANGER_MOT_DE_PASSE">
            <form onSubmit={handleSubmit} className="space-y-4">
                <FieldGroup label="Mot de passe actuel">
                    <div className="relative">
                        <CyberInput
                            type={showCurrent ? "text" : "password"}
                            value={form.current_password}
                            onChange={(e) => handleChange("current_password", e.target.value)}
                            placeholder="••••••••"
                            autoComplete="current-password"
                        />
                        <button
                            type="button"
                            onClick={() => setShowCurrent((v) => !v)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#475569] hover:text-white"
                        >
                            {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                    </div>
                    {errors.current_password && <InlineError msg={errors.current_password} />}
                </FieldGroup>

                <FieldGroup label="Nouveau mot de passe">
                    <div className="relative">
                        <CyberInput
                            type={showNew ? "text" : "password"}
                            value={form.new_password}
                            onChange={(e) => handleChange("new_password", e.target.value)}
                            placeholder="8 caractères minimum"
                            autoComplete="new-password"
                        />
                        <button
                            type="button"
                            onClick={() => setShowNew((v) => !v)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#475569] hover:text-white"
                        >
                            {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                    </div>
                    {errors.new_password && <InlineError msg={errors.new_password} />}
                </FieldGroup>

                <FieldGroup label="Confirmer le nouveau mot de passe">
                    <CyberInput
                        type="password"
                        value={form.confirm_password}
                        onChange={(e) => handleChange("confirm_password", e.target.value)}
                        placeholder="••••••••"
                        autoComplete="new-password"
                    />
                    {errors.confirm_password && <InlineError msg={errors.confirm_password} />}
                </FieldGroup>

                <button
                    type="submit"
                    disabled={isLoading}
                    className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-widest border border-[#00F0FF]/30 text-[#00F0FF] px-4 py-2 rounded hover:bg-[#00F0FF]/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <Save className="w-3 h-3" />
                    {isLoading ? "Sauvegarde…" : "Mettre à jour le mot de passe"}
                </button>

                {feedback && <Toast msg={feedback.msg} variant={feedback.variant} />}
            </form>
        </SectionCard>
    );
}

// ─── Section Mes données (RGPD Art. 15) ──────────────────────────────────────

function DataExportSection() {
    const [loading, setLoading] = useState(false);

    const handleExport = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/auth/me/export`, { credentials: "include" });
            if (!res.ok) throw new Error("Erreur serveur");
            const data = await res.json();
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `overfitted-data-${Date.now()}.json`;
            a.click();
            URL.revokeObjectURL(url);
        } catch {
            // silencieux — l'utilisateur verra que le téléchargement n'a pas commencé
        } finally {
            setLoading(false);
        }
    };

    return (
        <SectionCard title="MES_DONNÉES — ART. 15 RGPD">
            <p className="text-sm text-[#94A3B8] font-mono mb-4 leading-relaxed">
                Téléchargez l'intégralité des données stockées sur votre compte : email, designs,
                commandes et factures au format JSON.
            </p>
            <button
                onClick={handleExport}
                disabled={loading}
                className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-widest border border-[#00F0FF]/30 text-[#00F0FF] px-4 py-2 rounded hover:bg-[#00F0FF]/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
                <Download className="w-3.5 h-3.5" />
                {loading ? "Préparation…" : "Télécharger mes données"}
            </button>
        </SectionCard>
    );
}

// ─── Section Suppression de compte (RGPD Art. 17) ────────────────────────────

function DeleteAccountSection({ userEmail }: { userEmail: string }) {
    const router = useRouter();
    const [confirmEmail, setConfirmEmail] = useState("");
    const [acknowledged, setAcknowledged] = useState(false);
    const [feedback, setFeedback] = useState<string | null>(null);

    const { data: orders } = useGetMyOrdersQuery();
    const [deleteMe, { isLoading }] = useDeleteMeMutation();
    const [logout] = useLogoutMutation();

    const hasActiveOrders = orders?.some((o) => ACTIVE_STATUSES.has(o.status)) ?? false;
    const canDelete = confirmEmail === userEmail && acknowledged && !hasActiveOrders;

    const handleDelete = async () => {
        if (!canDelete) return;
        try {
            await deleteMe().unwrap();
            await logout().unwrap();
            router.push("/");
        } catch (err: unknown) {
            const detail = (err as { data?: { detail?: string } })?.data?.detail;
            setFeedback(detail ?? "Erreur lors de la suppression.");
        }
    };

    return (
        <SectionCard title="SUPPRESSION_COMPTE — ART. 17 RGPD">
            <p className="text-sm text-[#94A3B8] font-mono mb-2 leading-relaxed">
                Votre compte sera anonymisé de façon irréversible. Les factures sont conservées
                conformément aux obligations comptables (Art. 17 §3 RGPD).
            </p>

            {hasActiveOrders && (
                <div className="flex items-start gap-2 border border-yellow-500/30 bg-yellow-500/5 rounded p-3 mb-4 text-yellow-400 text-xs font-mono">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>
                        Impossible de supprimer le compte — une commande est en cours de traitement.
                        Attendez qu'elle soit livrée ou annulée.
                    </span>
                </div>
            )}

            <AlertDialog>
                <AlertDialogTrigger
                    disabled={hasActiveOrders}
                    className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-widest border border-red-500/30 text-red-400 px-4 py-2 rounded hover:bg-red-500/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    title={
                        hasActiveOrders
                            ? "Une commande est en cours — suppression bloquée"
                            : undefined
                    }
                >
                    <Trash2 className="w-3.5 h-3.5" />
                    Supprimer mon compte
                </AlertDialogTrigger>

                <AlertDialogContent className="bg-[#0A1628] border border-red-500/30 text-white max-w-md">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-red-400 font-mono text-base">
                            SUPPRESSION_IRRÉVERSIBLE
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-[#94A3B8] text-sm font-mono space-y-3">
                            <span className="block mt-2">
                                Cette action anonymisera définitivement votre compte. Vos designs et
                                données personnelles seront effacés. Vos factures seront conservées
                                pour obligations légales.
                            </span>
                        </AlertDialogDescription>
                    </AlertDialogHeader>

                    <div className="space-y-4 py-2">
                        {/* Confirmation email */}
                        <div className="space-y-1">
                            <label className="text-xs text-[#475569] uppercase tracking-widest font-mono">
                                Saisir votre email pour confirmer
                            </label>
                            <input
                                type="email"
                                value={confirmEmail}
                                onChange={(e) => {
                                    setConfirmEmail(e.target.value);
                                    setFeedback(null);
                                }}
                                placeholder={userEmail}
                                className="w-full bg-[#050A14] border border-red-500/20 rounded px-3 py-2 text-sm text-white font-mono placeholder-[#334155] focus:outline-none focus:border-red-400/60 transition-colors"
                            />
                        </div>

                        {/* Checkbox irréversible */}
                        <label className="flex items-start gap-3 cursor-pointer group">
                            <input
                                type="checkbox"
                                checked={acknowledged}
                                onChange={(e) => setAcknowledged(e.target.checked)}
                                className="mt-0.5 accent-red-500 cursor-pointer"
                            />
                            <span className="text-xs text-[#94A3B8] font-mono leading-relaxed group-hover:text-white transition-colors">
                                Je comprends que cette action est irréversible et que mes données
                                personnelles seront anonymisées.
                            </span>
                        </label>

                        {feedback && (
                            <p className="text-red-400 text-xs font-mono">{feedback}</p>
                        )}
                    </div>

                    <AlertDialogFooter>
                        <AlertDialogCancel className="bg-transparent border border-[#1E293B] text-[#94A3B8] hover:text-white hover:bg-[#1E293B] font-mono text-xs">
                            Annuler
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            disabled={!canDelete || isLoading}
                            className="bg-red-600 hover:bg-red-700 text-white font-mono text-xs disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            {isLoading ? "Suppression…" : "Confirmer la suppression"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </SectionCard>
    );
}

// ─── Section Consentements ────────────────────────────────────────────────────

function ConsentSection({ createdAt }: { createdAt?: string }) {
    const fmtDate = (iso: string) =>
        new Date(iso).toLocaleDateString("fr-FR", {
            day: "2-digit",
            month: "long",
            year: "numeric",
        });

    return (
        <SectionCard title="CONSENTEMENTS">
            <div className="text-sm font-mono text-[#94A3B8] space-y-2">
                <p>
                    CGV acceptées le :{" "}
                    <span className="text-[#CBD5E1]">
                        {createdAt ? fmtDate(createdAt) : "—"}
                    </span>
                </p>
                <a
                    href="/legal"
                    className="text-xs text-[#00F0FF] hover:underline"
                >
                    Consulter les CGV et la politique de confidentialité →
                </a>
            </div>
        </SectionCard>
    );
}

// ─── Page intérieure ──────────────────────────────────────────────────────────

function ProfilePageInner() {
    const router = useRouter();
    const { data: me, isError: authError, isLoading: authLoading } = useGetMeQuery();

    useEffect(() => {
        if (!authLoading && authError) {
            router.push("/login?next=/account/profile");
        }
    }, [authError, authLoading, router]);

    if (authLoading || authError) {
        return (
            <p className="text-[#475569] text-sm py-20 text-center animate-pulse">
                Authentification…
            </p>
        );
    }

    if (!me) return null;

    return (
        <main className="min-h-screen bg-[#050A14] text-white">
            <AppHeader />

            <div className="max-w-2xl mx-auto px-4 pt-28 pb-16 space-y-6">
                {/* Heading */}
                <div>
                    <h1 className="text-2xl font-mono font-bold text-[#00F0FF] tracking-tight">
                        MON_COMPTE
                    </h1>
                    <p className="text-[#475569] text-sm mt-1 font-mono">
                        {me.email}
                        {me.created_at && (
                            <span className="ml-3 text-[#334155]">
                                — membre depuis{" "}
                                {new Date(me.created_at).toLocaleDateString("fr-FR", {
                                    month: "long",
                                    year: "numeric",
                                })}
                            </span>
                        )}
                    </p>
                </div>

                <InfoSection email={me.email} displayName={me.display_name} />
                <PasswordSection />
                <DataExportSection />
                <ConsentSection createdAt={me.created_at} />
                <DeleteAccountSection userEmail={me.email} />
            </div>
        </main>
    );
}

// ─── Export ───────────────────────────────────────────────────────────────────

export default function ProfilePage() {
    return <ProfilePageInner />;
}
