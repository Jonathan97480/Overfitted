"use client";
import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Download, Search, Plus, Loader2, X } from "lucide-react";
import {
    useListInvoicesQuery,
    useCreateInvoiceMutation,
    type InvoiceOut,
    type InvoiceCreate,
    type InvoiceItemSchema,
} from "@/lib/adminEndpoints";

const NEXT_PUBLIC_API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

function fmt(amount: number) {
    return amount.toFixed(2) + " €";
}

function fmtDate(iso: string) {
    return new Date(iso).toLocaleDateString("fr-FR");
}

function downloadPdf(invoice: InvoiceOut, token: string) {
    const url = `${NEXT_PUBLIC_API_URL}/api/admin/invoices/${invoice.id}/pdf`;
    const a = document.createElement("a");
    a.href = url;
    // Passe le token via Authorization header nécessite fetch — on ouvre dans un onglet via window.location + query token workaround
    // Solution propre : utiliser fetch + blob
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => r.blob())
        .then((blob) => {
            const blobUrl = URL.createObjectURL(blob);
            a.href = blobUrl;
            a.download = `${invoice.invoice_number}.pdf`;
            a.click();
            URL.revokeObjectURL(blobUrl);
        });
}

function getToken(): string {
    if (typeof window === "undefined") return "";
    return localStorage.getItem("admin_token") ?? "";
}

// ─── Formulaire création facture ────────────────────────────────────────────

function CreateInvoiceDialog({
    onClose,
}: {
    onClose: () => void;
}) {
    const [createInvoice, { isLoading }] = useCreateInvoiceMutation();
    const [form, setForm] = useState<{
        order_id: string;
        user_email: string;
        user_name: string;
        tva_rate: string;
        promo_code: string;
        discount_amount: string;
    }>({
        order_id: "",
        user_email: "",
        user_name: "",
        tva_rate: "0.20",
        promo_code: "",
        discount_amount: "0",
    });
    const [items, setItems] = useState<InvoiceItemSchema[]>([
        { description: "", quantity: 1, unit_price_ht: 0 },
    ]);
    const [error, setError] = useState<string | null>(null);

    function addItem() {
        setItems((prev) => [...prev, { description: "", quantity: 1, unit_price_ht: 0 }]);
    }

    function removeItem(i: number) {
        setItems((prev) => prev.filter((_, idx) => idx !== i));
    }

    function updateItem(i: number, field: keyof InvoiceItemSchema, value: string) {
        setItems((prev) =>
            prev.map((item, idx) =>
                idx !== i
                    ? item
                    : {
                          ...item,
                          [field]:
                              field === "description"
                                  ? value
                                  : parseFloat(value) || 0,
                      }
            )
        );
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError(null);
        if (!form.order_id || !form.user_email || !form.user_name) {
            setError("Remplir tous les champs obligatoires.");
            return;
        }
        if (items.length === 0 || items.some((i) => !i.description)) {
            setError("Chaque article doit avoir une description.");
            return;
        }
        const payload: InvoiceCreate = {
            order_id: parseInt(form.order_id),
            user_email: form.user_email,
            user_name: form.user_name,
            items,
            tva_rate: parseFloat(form.tva_rate),
            promo_code: form.promo_code || null,
            discount_amount: parseFloat(form.discount_amount) || 0,
        };
        try {
            await createInvoice(payload).unwrap();
            onClose();
        } catch (err: unknown) {
            const e = err as { data?: { detail?: string } };
            setError(e?.data?.detail ?? "Erreur lors de la création.");
        }
    }

    const inputCls =
        "w-full px-3 py-1.5 rounded-md text-sm font-mono outline-none";
    const inputStyle = {
        background: "var(--admin-sidebar)",
        border: "1px solid var(--admin-border)",
        color: "white",
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
            <div
                className="w-full max-w-2xl rounded-xl shadow-2xl overflow-y-auto max-h-[90vh]"
                style={{ background: "var(--admin-card)", border: "1px solid var(--admin-border)" }}
            >
                <div
                    className="flex items-center justify-between px-5 py-4"
                    style={{ borderBottom: "1px solid var(--admin-border)" }}
                >
                    <span className="text-white text-sm font-semibold">Nouvelle facture</span>
                    <button onClick={onClose} className="text-[var(--admin-muted)] hover:text-white">
                        <X size={16} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-5 space-y-4">
                    {/* Infos commande */}
                    <div className="grid grid-cols-3 gap-3">
                        <div>
                            <label className="block text-xs text-[var(--admin-muted-2)] mb-1">
                                N° commande *
                            </label>
                            <input
                                type="number"
                                value={form.order_id}
                                onChange={(e) =>
                                    setForm((f) => ({ ...f, order_id: e.target.value }))
                                }
                                className={inputCls}
                                style={inputStyle}
                                placeholder="42"
                            />
                        </div>
                        <div className="col-span-2">
                            <label className="block text-xs text-[var(--admin-muted-2)] mb-1">
                                Email client *
                            </label>
                            <input
                                type="email"
                                value={form.user_email}
                                onChange={(e) =>
                                    setForm((f) => ({ ...f, user_email: e.target.value }))
                                }
                                className={inputCls}
                                style={inputStyle}
                                placeholder="client@example.com"
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs text-[var(--admin-muted-2)] mb-1">
                                Nom client *
                            </label>
                            <input
                                value={form.user_name}
                                onChange={(e) =>
                                    setForm((f) => ({ ...f, user_name: e.target.value }))
                                }
                                className={inputCls}
                                style={inputStyle}
                                placeholder="Jean Dupont"
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-[var(--admin-muted-2)] mb-1">
                                Taux TVA
                            </label>
                            <select
                                value={form.tva_rate}
                                onChange={(e) =>
                                    setForm((f) => ({ ...f, tva_rate: e.target.value }))
                                }
                                className={inputCls}
                                style={inputStyle}
                            >
                                <option value="0.20">20%</option>
                                <option value="0.10">10%</option>
                                <option value="0.055">5.5%</option>
                                <option value="0">0% (hors UE)</option>
                            </select>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs text-[var(--admin-muted-2)] mb-1">
                                Code promo
                            </label>
                            <input
                                value={form.promo_code}
                                onChange={(e) =>
                                    setForm((f) => ({ ...f, promo_code: e.target.value }))
                                }
                                className={inputCls}
                                style={inputStyle}
                                placeholder="SUMMER20"
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-[var(--admin-muted-2)] mb-1">
                                Remise (€ HT)
                            </label>
                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={form.discount_amount}
                                onChange={(e) =>
                                    setForm((f) => ({ ...f, discount_amount: e.target.value }))
                                }
                                className={inputCls}
                                style={inputStyle}
                            />
                        </div>
                    </div>

                    {/* Articles */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-semibold text-[var(--admin-muted-2)]">
                                Articles
                            </span>
                            <button
                                type="button"
                                onClick={addItem}
                                className="text-xs text-[var(--admin-accent)] hover:underline"
                            >
                                + Ajouter un article
                            </button>
                        </div>
                        <div className="space-y-2">
                            {items.map((item, i) => (
                                <div key={i} className="grid grid-cols-12 gap-2 items-center">
                                    <input
                                        className={`${inputCls} col-span-6`}
                                        style={inputStyle}
                                        placeholder="Description"
                                        value={item.description}
                                        onChange={(e) =>
                                            updateItem(i, "description", e.target.value)
                                        }
                                    />
                                    <input
                                        type="number"
                                        min="1"
                                        className={`${inputCls} col-span-2`}
                                        style={inputStyle}
                                        placeholder="Qté"
                                        value={item.quantity}
                                        onChange={(e) => updateItem(i, "quantity", e.target.value)}
                                    />
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        className={`${inputCls} col-span-3`}
                                        style={inputStyle}
                                        placeholder="P.U. HT"
                                        value={item.unit_price_ht}
                                        onChange={(e) =>
                                            updateItem(i, "unit_price_ht", e.target.value)
                                        }
                                    />
                                    <button
                                        type="button"
                                        onClick={() => removeItem(i)}
                                        className="col-span-1 text-[var(--admin-muted)] hover:text-red-400"
                                        disabled={items.length === 1}
                                    >
                                        <X size={13} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {error && (
                        <p className="text-xs text-red-400">{error}</p>
                    )}

                    <div className="flex justify-end gap-2 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm rounded-md text-[var(--admin-muted-2)] border border-[var(--admin-border)] hover:text-white"
                        >
                            Annuler
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="flex items-center gap-2 px-4 py-2 text-sm rounded-md font-semibold text-black"
                            style={{ background: "var(--admin-accent)" }}
                        >
                            {isLoading && <Loader2 size={13} className="animate-spin" />}
                            Créer la facture
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ─── Page principale ─────────────────────────────────────────────────────────

export default function AdminInvoicesPage() {
    const [search, setSearch] = useState("");
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");
    const [showCreate, setShowCreate] = useState(false);

    const { data: invoices = [], isLoading } = useListInvoicesQuery({
        search: search || undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
    });

    const totalTTC = useMemo(
        () => invoices.reduce((s, inv) => s + inv.amount_ttc, 0),
        [invoices]
    );

    return (
        <div className="space-y-5">
            {showCreate && <CreateInvoiceDialog onClose={() => setShowCreate(false)} />}

            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-3">
                <div
                    className="flex items-center gap-2 flex-1 min-w-48 px-3 py-2 rounded-md"
                    style={{ background: "var(--admin-card)", border: "1px solid var(--admin-border)" }}
                >
                    <Search size={14} className="text-[var(--admin-muted)]" />
                    <input
                        className="bg-transparent outline-none text-sm text-white flex-1 font-mono"
                        placeholder="N° facture, email, client…"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="px-3 py-2 rounded-md text-sm font-mono outline-none"
                    style={{
                        background: "var(--admin-card)",
                        border: "1px solid var(--admin-border)",
                        color: "var(--admin-muted-2)",
                    }}
                />
                <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="px-3 py-2 rounded-md text-sm font-mono outline-none"
                    style={{
                        background: "var(--admin-card)",
                        border: "1px solid var(--admin-border)",
                        color: "var(--admin-muted-2)",
                    }}
                />
                <button
                    onClick={() => setShowCreate(true)}
                    className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold text-black ml-auto"
                    style={{ background: "var(--admin-accent)" }}
                >
                    <Plus size={14} />
                    Nouvelle facture
                </button>
            </div>

            {/* KPI */}
            <div className="grid grid-cols-3 gap-4">
                {[
                    { label: "Factures", value: String(invoices.length) },
                    { label: "Total TTC", value: fmt(totalTTC) },
                    {
                        label: "TVA collectée",
                        value: fmt(invoices.reduce((s, i) => s + i.amount_tva, 0)),
                    },
                ].map(({ label, value }) => (
                    <Card
                        key={label}
                        style={{
                            background: "var(--admin-card)",
                            border: "1px solid var(--admin-border)",
                        }}
                    >
                        <CardContent className="pt-4 pb-4">
                            <p className="text-xs text-[var(--admin-muted-2)]">{label}</p>
                            <p className="text-xl font-bold text-white mt-1 font-mono">{value}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Table */}
            <Card style={{ background: "var(--admin-card)", border: "1px solid var(--admin-border)" }}>
                <CardHeader>
                    <CardTitle className="text-white text-sm font-semibold flex items-center gap-2">
                        <FileText size={15} />
                        Factures
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    {isLoading ? (
                        <div className="space-y-2 p-4">
                            {[...Array(5)].map((_, i) => (
                                <div
                                    key={i}
                                    className="h-10 rounded-md animate-pulse"
                                    style={{ background: "var(--admin-sidebar)" }}
                                />
                            ))}
                        </div>
                    ) : invoices.length === 0 ? (
                        <p className="text-[var(--admin-muted-2)] text-sm text-center py-10">
                            Aucune facture trouvée.
                        </p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr style={{ borderBottom: "1px solid var(--admin-border)" }}>
                                        {[
                                            "N° Facture",
                                            "Date",
                                            "Client",
                                            "Email",
                                            "Commande",
                                            "HT",
                                            "TVA",
                                            "TTC",
                                            "",
                                        ].map((h) => (
                                            <th
                                                key={h}
                                                className="px-4 py-3 text-left text-xs font-medium text-[var(--admin-muted-2)] whitespace-nowrap"
                                            >
                                                {h}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {invoices.map((inv) => (
                                        <tr
                                            key={inv.id}
                                            style={{ borderBottom: "1px solid var(--admin-border)" }}
                                            className="hover:bg-white/5 transition-colors"
                                        >
                                            <td className="px-4 py-3 font-mono text-[var(--admin-accent)] text-xs whitespace-nowrap">
                                                {inv.invoice_number}
                                            </td>
                                            <td className="px-4 py-3 text-[var(--admin-muted-2)] text-xs whitespace-nowrap">
                                                {fmtDate(inv.issued_at)}
                                            </td>
                                            <td className="px-4 py-3 text-white text-xs">
                                                {inv.user_name}
                                            </td>
                                            <td className="px-4 py-3 text-[var(--admin-muted-2)] text-xs">
                                                {inv.user_email}
                                            </td>
                                            <td className="px-4 py-3 text-[var(--admin-muted-2)] text-xs text-center">
                                                #{inv.order_id}
                                            </td>
                                            <td className="px-4 py-3 text-white text-xs font-mono whitespace-nowrap">
                                                {fmt(inv.amount_ht)}
                                            </td>
                                            <td className="px-4 py-3 text-[var(--admin-muted-2)] text-xs font-mono whitespace-nowrap">
                                                {fmt(inv.amount_tva)}
                                            </td>
                                            <td className="px-4 py-3 text-white text-xs font-mono font-semibold whitespace-nowrap">
                                                {fmt(inv.amount_ttc)}
                                            </td>
                                            <td className="px-4 py-3">
                                                <button
                                                    onClick={() =>
                                                        downloadPdf(inv, getToken())
                                                    }
                                                    title="Télécharger PDF"
                                                    className="flex items-center gap-1 px-2 py-1 rounded text-xs text-[var(--admin-muted-2)] border border-[var(--admin-border)] hover:text-white hover:border-white/30 transition"
                                                >
                                                    <Download size={11} />
                                                    PDF
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
