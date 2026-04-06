"use client";
import { useState } from "react";
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
import { Plus, Trash2 } from "lucide-react";

// Type local — les codes promo seront dans le backend Phase 2
interface PromoCode {
    id: number;
    code: string;
    discount_percent: number;
    max_uses: number | null;
    uses: number;
    active: boolean;
    expires_at: string | null;
}

// Données mockées en attendant l'endpoint backend
const MOCK: PromoCode[] = [
    {
        id: 1,
        code: "LAUNCH20",
        discount_percent: 20,
        max_uses: 100,
        uses: 12,
        active: true,
        expires_at: "2026-12-31",
    },
    {
        id: 2,
        code: "DEBUG50",
        discount_percent: 50,
        max_uses: null,
        uses: 3,
        active: false,
        expires_at: null,
    },
];

export default function AdminPromoPage() {
    const [codes, setCodes] = useState<PromoCode[]>(MOCK);
    const [open, setOpen] = useState(false);
    const [form, setForm] = useState({
        code: "",
        discount_percent: "10",
        max_uses: "",
        expires_at: "",
    });

    function handleCreate() {
        const newCode: PromoCode = {
            id: Date.now(),
            code: form.code.toUpperCase(),
            discount_percent: parseInt(form.discount_percent),
            max_uses: form.max_uses ? parseInt(form.max_uses) : null,
            uses: 0,
            active: true,
            expires_at: form.expires_at || null,
        };
        setCodes((prev) => [newCode, ...prev]);
        setOpen(false);
        setForm({ code: "", discount_percent: "10", max_uses: "", expires_at: "" });
    }

    function handleDelete(id: number) {
        if (confirm("Supprimer ce code promo ?"))
            setCodes((prev) => prev.filter((c) => c.id !== id));
    }

    function handleToggle(id: number) {
        setCodes((prev) =>
            prev.map((c) => (c.id === id ? { ...c, active: !c.active } : c))
        );
    }

    return (
        <>
            <div
                style={{
                    background: "var(--admin-card)",
                    border: "1px solid var(--admin-border)",
                }}
                className="rounded-xl overflow-hidden"
            >
                <div
                    style={{ borderBottom: "1px solid var(--admin-border)" }}
                    className="px-6 py-4 flex items-center justify-between"
                >
                    <div>
                        <h2 className="text-white font-semibold">Codes promo</h2>
                        <p className="text-xs text-[var(--admin-muted-2)] mt-0.5">
                            Gestion locale — endpoint backend à connecter en Phase 2
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
                        {codes.map((c) => (
                            <TableRow
                                key={c.id}
                                style={{ borderColor: "var(--admin-border)" }}
                                className="hover:bg-white/5 transition-colors"
                            >
                                <TableCell className="font-mono text-white font-semibold text-sm">
                                    {c.code}
                                </TableCell>
                                <TableCell className="text-white text-sm">
                                    -{c.discount_percent}%
                                </TableCell>
                                <TableCell className="text-[var(--admin-muted-2)] text-sm">
                                    {c.uses}{c.max_uses != null ? ` / ${c.max_uses}` : ""}
                                </TableCell>
                                <TableCell className="text-[var(--admin-muted-2)] text-sm">
                                    {c.expires_at
                                        ? new Date(c.expires_at).toLocaleDateString("fr-FR")
                                        : "—"}
                                </TableCell>
                                <TableCell>
                                    <Badge
                                        style={{
                                            background: c.active ? "#10B981" : "#6B7280",
                                            color: "white",
                                            cursor: "pointer",
                                        }}
                                        onClick={() => handleToggle(c.id)}
                                    >
                                        {c.active ? "Actif" : "Inactif"}
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
                        ))}
                    </TableBody>
                </Table>
            </div>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent
                    style={{
                        background: "var(--admin-card)",
                        border: "1px solid var(--admin-border)",
                    }}
                    className="text-white"
                >
                    <DialogHeader>
                        <DialogTitle className="text-white">Nouveau code promo</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3 mt-2">
                        {[
                            { key: "code", label: "Code", placeholder: "SUMMER30" },
                            {
                                key: "discount_percent",
                                label: "Remise (%)",
                                placeholder: "20",
                                type: "number",
                            },
                            {
                                key: "max_uses",
                                label: "Utilisations max (vide = illimité)",
                                placeholder: "100",
                                type: "number",
                            },
                            {
                                key: "expires_at",
                                label: "Expiration",
                                placeholder: "",
                                type: "date",
                            },
                        ].map(({ key, label, placeholder, type }) => (
                            <div key={key}>
                                <label className="block text-xs text-[var(--admin-muted-2)] mb-1">
                                    {label}
                                </label>
                                <input
                                    type={type ?? "text"}
                                    value={form[key as keyof typeof form]}
                                    onChange={(e) =>
                                        setForm((f) => ({ ...f, [key]: e.target.value }))
                                    }
                                    placeholder={placeholder}
                                    style={{
                                        background: "var(--admin-sidebar)",
                                        border: "1px solid var(--admin-border)",
                                        color: "white",
                                    }}
                                    className="w-full px-3 py-2 rounded-md text-sm outline-none focus:ring-2 focus:ring-[var(--admin-accent)]"
                                />
                            </div>
                        ))}
                        <button
                            onClick={handleCreate}
                            disabled={!form.code || !form.discount_percent}
                            style={{ background: "var(--admin-accent)" }}
                            className="w-full py-2 rounded-md text-sm font-semibold text-black hover:opacity-90 disabled:opacity-50 transition mt-2"
                        >
                            Créer
                        </button>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
