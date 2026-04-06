"use client";
import { useState } from "react";
import {
    useListPromoQuery,
    useCreatePromoCodeMutation,
    useUpdatePromoCodeMutation,
    useDeletePromoCodeMutation,
    type PromoCodeOut,
    type PromoCodeCreate,
} from "@/lib/adminEndpoints";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Trash2, Copy, Check } from "lucide-react";

const EMPTY_FORM = { code: "", discount_percent: "10", max_uses: "", expires_at: "" };

function promoStatus(c: PromoCodeOut): { label: string; color: string } {
    if (!c.is_active) return { label: "Inactif", color: "#6B7280" };
    if (c.expires_at && new Date(c.expires_at) < new Date())
        return { label: "Expiré", color: "#EF4444" };
    if (c.max_uses !== null && c.uses_count >= c.max_uses)
        return { label: "Épuisé", color: "#EF4444" };
    return { label: "Actif", color: "#10B981" };
}

export default function AdminPromoPage() {
    const { data: codes, isLoading } = useListPromoQuery();
    const [createCode] = useCreatePromoCodeMutation();
    const [updateCode] = useUpdatePromoCodeMutation();
    const [deleteCode] = useDeletePromoCodeMutation();

    const [open, setOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [copied, setCopied] = useState<number | null>(null);
    const [form, setForm] = useState(EMPTY_FORM);

    function field(key: keyof typeof EMPTY_FORM) {
        return {
            value: form[key],
            onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
                setForm((f) => ({ ...f, [key]: e.target.value })),
        };
    }

    async function handleCreate() {
        if (!form.code || !form.discount_percent) return;
        setSaving(true);
        try {
            await createCode({
                code: form.code.toUpperCase(),
                discount_percent: parseInt(form.discount_percent),
                max_uses: form.max_uses ? parseInt(form.max_uses) : null,
                expires_at: form.expires_at || null,
            }).unwrap();
            setOpen(false);
            setForm(EMPTY_FORM);
        } catch {
            // tableau rafraîchi via RTK cache invalidation
        } finally {
            setSaving(false);
        }
    }

    async function handleToggle(c: PromoCodeOut) {
        await updateCode({ id: c.id, is_active: !c.is_active });
    }

    async function handleDelete(id: number) {
        if (!confirm("Supprimer ce code promo ?")) return;
        await deleteCode(id);
    }

    function handleCopy(c: PromoCodeOut) {
        navigator.clipboard.writeText(c.code);
        setCopied(c.id);
        setTimeout(() => setCopied(null), 1500);
    }

    return (
        <>
            <div
                style={{ background: "var(--admin-card)", border: "1px solid var(--admin-border)" }}
                className="rounded-xl overflow-hidden"
            >
                <div
                    style={{ borderBottom: "1px solid var(--admin-border)" }}
                    className="px-6 py-4 flex items-center justify-between"
                >
                    <div>
                        <h2 className="text-white font-semibold">Codes promo</h2>
                        <p className="text-xs text-[var(--admin-muted-2)] mt-0.5">
                            {codes?.length ?? 0} code{(codes?.length ?? 0) !== 1 ? "s" : ""}
                        </p>
                    </div>
                    <button
                        onClick={() => setOpen(true)}
                        style={{ background: "var(--admin-accent)" }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold text-black hover:opacity-90 transition"
                    >
                        <Plus size={13} /> Nouveau code
                    </button>
                </div>

                <Table>
                    <TableHeader>
                        <TableRow style={{ borderColor: "var(--admin-border)" }}>
                            <TableHead className="text-[var(--admin-muted-2)]">Code</TableHead>
                            <TableHead className="text-[var(--admin-muted-2)]">Remise</TableHead>
                            <TableHead className="text-[var(--admin-muted-2)]">Utilisations</TableHead>
                            <TableHead className="text-[var(--admin-muted-2)]">Expire</TableHead>
                            <TableHead className="text-[var(--admin-muted-2)]">Statut</TableHead>
                            <TableHead className="text-[var(--admin-muted-2)]" />
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading
                            ? Array.from({ length: 3 }).map((_, i) => (
                                <TableRow key={i} style={{ borderColor: "var(--admin-border)" }}>
                                    {Array.from({ length: 6 }).map((__, j) => (
                                        <TableCell key={j}>
                                            <Skeleton className="h-4 w-20 bg-white/10" />
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                            : codes?.map((c: PromoCodeOut) => {
                                const status = promoStatus(c);
                                const toggleable = status.label === "Actif" || status.label === "Inactif";
                                return (
                                    <TableRow
                                        key={c.id}
                                        style={{ borderColor: "var(--admin-border)" }}
                                        className="hover:bg-white/5 transition-colors"
                                    >
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <span className="font-mono text-white font-semibold text-sm">
                                                    {c.code}
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => handleCopy(c)}
                                                    className="text-[var(--admin-muted)] hover:text-white transition"
                                                    title="Copier"
                                                >
                                                    {copied === c.id
                                                        ? <Check size={12} className="text-emerald-400" />
                                                        : <Copy size={12} />}
                                                </button>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-white text-sm font-semibold">
                                            -{c.discount_percent}%
                                        </TableCell>
                                        <TableCell className="text-[var(--admin-muted-2)] text-sm">
                                            {c.uses_count}{c.max_uses != null ? ` / ${c.max_uses}` : " / ∞"}
                                        </TableCell>
                                        <TableCell className="text-[var(--admin-muted-2)] text-sm">
                                            {c.expires_at
                                                ? new Date(c.expires_at).toLocaleDateString("fr-FR")
                                                : "—"}
                                        </TableCell>
                                        <TableCell>
                                            <Badge
                                                style={{
                                                    background: status.color + "22",
                                                    color: status.color,
                                                    border: `1px solid ${status.color}40`,
                                                    cursor: toggleable ? "pointer" : "default",
                                                }}
                                                onClick={() => toggleable && handleToggle(c)}
                                                title={toggleable ? "Cliquer pour basculer" : undefined}
                                            >
                                                {status.label}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <button
                                                onClick={() => handleDelete(c.id)}
                                                className="text-[var(--admin-muted)] hover:text-red-400 transition-colors"
                                            >
                                                <Trash2 size={13} />
                                            </button>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                    </TableBody>
                </Table>
            </div>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent
                    style={{ background: "var(--admin-card)", border: "1px solid var(--admin-border)" }}
                    className="text-white"
                >
                    <DialogHeader>
                        <DialogTitle className="text-white">Nouveau code promo</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3 mt-2">
                        {[
                            { key: "code" as const, label: "Code", placeholder: "SUMMER30", type: "text" },
                            { key: "discount_percent" as const, label: "Remise (%)", placeholder: "20", type: "number" },
                            { key: "max_uses" as const, label: "Utilisations max (vide = illimité)", placeholder: "100", type: "number" },
                            { key: "expires_at" as const, label: "Expiration", placeholder: "", type: "date" },
                        ].map(({ key, label, placeholder, type }) => (
                            <div key={key}>
                                <label className="block text-xs text-[var(--admin-muted-2)] mb-1">
                                    {label}
                                </label>
                                <input
                                    type={type}
                                    value={form[key]}
                                    onChange={(e) => setForm((f) => ({
                                        ...f,
                                        [key]: key === "code" ? e.target.value.toUpperCase() : e.target.value,
                                    }))}
                                    placeholder={placeholder}
                                    style={{
                                        background: "var(--admin-sidebar)",
                                        border: "1px solid var(--admin-border)",
                                        color: "white",
                                    }}
                                    className="w-full px-3 py-2 rounded-md text-sm outline-none focus:ring-2 focus:ring-[var(--admin-accent)] font-mono"
                                />
                            </div>
                        ))}
                        <button
                            onClick={handleCreate}
                            disabled={!form.code || !form.discount_percent || saving}
                            style={{ background: "var(--admin-accent)" }}
                            className="w-full py-2 rounded-md text-sm font-semibold text-black hover:opacity-90 disabled:opacity-50 transition mt-2"
                        >
                            {saving ? "Création…" : "Créer"}
                        </button>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
