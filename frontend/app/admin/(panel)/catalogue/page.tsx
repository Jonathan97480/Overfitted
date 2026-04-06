"use client";
import { useRef, useState } from "react";
import Image from "next/image";
import {
    useListCatalogueQuery,
    useCreateCatalogueItemMutation,
    useUpdateCatalogueItemMutation,
    useDeleteCatalogueItemMutation,
    useUploadCatalogueImageMutation,
    type CatalogueItemOut,
    type CatalogueStatus,
} from "@/lib/adminEndpoints";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Pencil, Trash2, Plus, Upload, ImageIcon } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const STATUS_LABEL: Record<CatalogueStatus, string> = {
    draft: "Brouillon",
    active: "En vente",
    archived: "Archivé",
};

const STATUS_COLOR: Record<CatalogueStatus, string> = {
    draft: "#6B7280",
    active: "#10B981",
    archived: "#F59E0B",
};

type FormData = {
    title: string;
    description: string;
    price: string;
    category: string;
    status: CatalogueStatus;
    printful_variant_id: string;
    tags: string;
    image_url: string;
};

const EMPTY: FormData = {
    title: "",
    description: "",
    price: "",
    category: "",
    status: "draft",
    printful_variant_id: "",
    tags: "",
    image_url: "",
};

export default function AdminCataloguePage() {
    const { data: items, isLoading } = useListCatalogueQuery({});
    const [createItem] = useCreateCatalogueItemMutation();
    const [updateItem] = useUpdateCatalogueItemMutation();
    const [deleteItem] = useDeleteCatalogueItemMutation();
    const [uploadImage] = useUploadCatalogueImageMutation();

    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState<CatalogueItemOut | null>(null);
    const [form, setForm] = useState<FormData>(EMPTY);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const fileRef = useRef<HTMLInputElement>(null);

    function openCreate() {
        setEditing(null);
        setForm(EMPTY);
        setOpen(true);
    }

    function openEdit(item: CatalogueItemOut) {
        setEditing(item);
        setForm({
            title: item.title,
            description: item.description ?? "",
            price: String(item.price),
            category: item.category ?? "",
            status: item.status,
            printful_variant_id: item.printful_variant_id ?? "",
            tags: item.tags ?? "",
            image_url: item.image_url ?? "",
        });
        setOpen(true);
    }

    async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploading(true);
        try {
            const fd = new FormData();
            fd.append("file", file);
            const res = await uploadImage(fd).unwrap();
            setForm((f) => ({ ...f, image_url: res.url }));
        } finally {
            setUploading(false);
        }
    }

    async function handleSave() {
        if (!form.title || !form.price) return;
        setSaving(true);
        try {
            const payload = {
                title: form.title,
                description: form.description || null,
                image_url: form.image_url || null,
                price: parseFloat(form.price),
                category: form.category || null,
                status: form.status,
                printful_variant_id: form.printful_variant_id || null,
                tags: form.tags || null,
            };
            if (editing) {
                await updateItem({ id: editing.id, ...payload }).unwrap();
            } else {
                await createItem(payload).unwrap();
            }
            setOpen(false);
        } finally {
            setSaving(false);
        }
    }

    async function handleDelete(item: CatalogueItemOut) {
        if (confirm(`Supprimer "${item.title}" du catalogue ?`)) {
            await deleteItem(item.id);
        }
    }

    const field = (key: keyof FormData) => ({
        value: form[key],
        onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
            setForm((f) => ({ ...f, [key]: e.target.value })),
    });

    return (
        <>
            <div
                style={{
                    background: "var(--admin-card)",
                    border: "1px solid var(--admin-border)",
                }}
                className="rounded-xl overflow-hidden"
            >
                {/* Header */}
                <div
                    style={{ borderBottom: "1px solid var(--admin-border)" }}
                    className="px-6 py-4 flex items-center justify-between"
                >
                    <div>
                        <h2 className="text-white font-semibold">
                            Catalogue boutique{" "}
                            {items && (
                                <span className="text-[var(--admin-muted-2)] font-normal text-sm">
                                    ({items.length})
                                </span>
                            )}
                        </h2>
                        <p className="text-[var(--admin-muted-2)] text-xs mt-0.5">
                            Créations mises en vente sur la boutique publique
                        </p>
                    </div>
                    <button
                        onClick={openCreate}
                        style={{ background: "var(--admin-accent)" }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold text-black hover:opacity-90 transition"
                    >
                        <Plus size={13} /> Nouvelle création
                    </button>
                </div>

                {/* Table */}
                <Table>
                    <TableHeader>
                        <TableRow style={{ borderColor: "var(--admin-border)" }}>
                            <TableHead className="text-[var(--admin-muted-2)] w-12">
                                Visuel
                            </TableHead>
                            <TableHead className="text-[var(--admin-muted-2)]">Titre</TableHead>
                            <TableHead className="text-[var(--admin-muted-2)]">Catégorie</TableHead>
                            <TableHead className="text-[var(--admin-muted-2)]">Prix</TableHead>
                            <TableHead className="text-[var(--admin-muted-2)]">Statut</TableHead>
                            <TableHead className="text-[var(--admin-muted-2)]">Tags</TableHead>
                            <TableHead className="text-[var(--admin-muted-2)]" />
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading
                            ? Array.from({ length: 3 }).map((_, i) => (
                                <TableRow
                                    key={i}
                                    style={{ borderColor: "var(--admin-border)" }}
                                >
                                    {Array.from({ length: 7 }).map((_, j) => (
                                        <TableCell key={j}>
                                            <Skeleton className="h-4 w-full" />
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                            : (items ?? []).length === 0
                            ? (
                                <TableRow style={{ borderColor: "var(--admin-border)" }}>
                                    <TableCell
                                        colSpan={7}
                                        className="text-center py-16 text-[var(--admin-muted-2)] text-sm"
                                    >
                                        Aucune création dans le catalogue.{" "}
                                        <button
                                            onClick={openCreate}
                                            className="underline text-[var(--admin-accent)] hover:opacity-80"
                                        >
                                            Ajouter la première
                                        </button>
                                    </TableCell>
                                </TableRow>
                            )
                            : items?.map((item) => (
                                <TableRow
                                    key={item.id}
                                    style={{ borderColor: "var(--admin-border)" }}
                                    className="hover:bg-white/5 transition-colors"
                                >
                                    {/* Visuel */}
                                    <TableCell>
                                        {item.image_url ? (
                                            <div className="w-10 h-10 rounded overflow-hidden relative">
                                                <Image
                                                    src={`${API_URL}${item.image_url}`}
                                                    alt={item.title}
                                                    fill
                                                    className="object-cover"
                                                    unoptimized
                                                />
                                            </div>
                                        ) : (
                                            <div
                                                style={{ border: "1px solid var(--admin-border)" }}
                                                className="w-10 h-10 rounded flex items-center justify-center"
                                            >
                                                <ImageIcon
                                                    size={14}
                                                    className="text-[var(--admin-muted)]"
                                                />
                                            </div>
                                        )}
                                    </TableCell>
                                    {/* Titre */}
                                    <TableCell className="text-white text-sm font-medium">
                                        {item.title}
                                        {item.description && (
                                            <p className="text-[var(--admin-muted-2)] text-xs font-normal truncate max-w-48 mt-0.5">
                                                {item.description}
                                            </p>
                                        )}
                                    </TableCell>
                                    {/* Catégorie */}
                                    <TableCell className="text-[var(--admin-muted-2)] text-sm">
                                        {item.category ?? "—"}
                                    </TableCell>
                                    {/* Prix */}
                                    <TableCell className="text-white text-sm font-mono">
                                        {item.price.toFixed(2)} €
                                    </TableCell>
                                    {/* Statut */}
                                    <TableCell>
                                        <span
                                            style={{
                                                color: STATUS_COLOR[item.status],
                                                background: STATUS_COLOR[item.status] + "20",
                                                borderColor: STATUS_COLOR[item.status] + "40",
                                            }}
                                            className="inline-block text-xs font-mono px-2 py-0.5 rounded border"
                                        >
                                            {STATUS_LABEL[item.status]}
                                        </span>
                                    </TableCell>
                                    {/* Tags */}
                                    <TableCell className="text-[var(--admin-muted-2)] text-xs font-mono">
                                        {item.tags ?? "—"}
                                    </TableCell>
                                    {/* Actions */}
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => openEdit(item)}
                                                className="text-[var(--admin-muted)] hover:text-white transition-colors"
                                                title="Modifier"
                                            >
                                                <Pencil size={13} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(item)}
                                                className="text-[var(--admin-muted)] hover:text-red-400 transition-colors"
                                                title="Supprimer"
                                            >
                                                <Trash2 size={13} />
                                            </button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                    </TableBody>
                </Table>
            </div>

            {/* Dialog création / édition */}
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent
                    style={{
                        background: "var(--admin-card)",
                        border: "1px solid var(--admin-border)",
                        maxHeight: "90vh",
                        overflowY: "auto",
                    }}
                    className="text-white max-w-lg"
                >
                    <DialogHeader>
                        <DialogTitle className="text-white">
                            {editing ? "Modifier la création" : "Nouvelle création"}
                        </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4 mt-2">
                        {/* Upload image */}
                        <div>
                            <label className="block text-xs text-[var(--admin-muted-2)] mb-2">
                                Image du design
                            </label>
                            <div className="flex items-center gap-3">
                                {form.image_url ? (
                                    <div className="w-20 h-20 rounded overflow-hidden relative shrink-0">
                                        <Image
                                            src={
                                                form.image_url.startsWith("/")
                                                    ? `${API_URL}${form.image_url}`
                                                    : form.image_url
                                            }
                                            alt="Aperçu"
                                            fill
                                            className="object-cover"
                                            unoptimized
                                        />
                                    </div>
                                ) : (
                                    <div
                                        style={{ border: "1px solid var(--admin-border)" }}
                                        className="w-20 h-20 rounded flex items-center justify-center shrink-0"
                                    >
                                        <ImageIcon size={24} className="text-[var(--admin-muted)]" />
                                    </div>
                                )}
                                <div className="flex-1 space-y-2">
                                    <button
                                        type="button"
                                        onClick={() => fileRef.current?.click()}
                                        disabled={uploading}
                                        style={{ border: "1px solid var(--admin-border)" }}
                                        className="flex items-center gap-2 px-3 py-1.5 rounded-md text-xs text-white hover:bg-white/5 transition disabled:opacity-50"
                                    >
                                        <Upload size={12} />
                                        {uploading ? "Upload…" : "Choisir un fichier"}
                                    </button>
                                    {form.image_url && (
                                        <button
                                            type="button"
                                            onClick={() => setForm((f) => ({ ...f, image_url: "" }))}
                                            className="text-xs text-red-400 hover:text-red-300"
                                        >
                                            Supprimer l'image
                                        </button>
                                    )}
                                </div>
                            </div>
                            <input
                                ref={fileRef}
                                type="file"
                                accept="image/jpeg,image/png,image/webp,image/gif"
                                className="hidden"
                                onChange={handleImageUpload}
                            />
                        </div>

                        {/* Titre */}
                        <div>
                            <label className="block text-xs text-[var(--admin-muted-2)] mb-1">
                                Titre <span className="text-red-400">*</span>
                            </label>
                            <input
                                type="text"
                                {...field("title")}
                                placeholder="Neural Glitch Tee v1"
                                style={{
                                    background: "var(--admin-sidebar)",
                                    border: "1px solid var(--admin-border)",
                                    color: "white",
                                }}
                                className="w-full px-3 py-2 rounded-md text-sm outline-none focus:ring-2 focus:ring-[var(--admin-accent)]"
                            />
                        </div>

                        {/* Description */}
                        <div>
                            <label className="block text-xs text-[var(--admin-muted-2)] mb-1">
                                Description
                            </label>
                            <textarea
                                {...field("description")}
                                rows={3}
                                placeholder="Un design qui juge ton architecture..."
                                style={{
                                    background: "var(--admin-sidebar)",
                                    border: "1px solid var(--admin-border)",
                                    color: "white",
                                    resize: "vertical",
                                }}
                                className="w-full px-3 py-2 rounded-md text-sm outline-none focus:ring-2 focus:ring-[var(--admin-accent)]"
                            />
                        </div>

                        {/* Prix + Catégorie */}
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs text-[var(--admin-muted-2)] mb-1">
                                    Prix (€) <span className="text-red-400">*</span>
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    {...field("price")}
                                    placeholder="29.90"
                                    style={{
                                        background: "var(--admin-sidebar)",
                                        border: "1px solid var(--admin-border)",
                                        color: "white",
                                    }}
                                    className="w-full px-3 py-2 rounded-md text-sm outline-none focus:ring-2 focus:ring-[var(--admin-accent)]"
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-[var(--admin-muted-2)] mb-1">
                                    Catégorie
                                </label>
                                <input
                                    type="text"
                                    {...field("category")}
                                    placeholder="t-shirt"
                                    style={{
                                        background: "var(--admin-sidebar)",
                                        border: "1px solid var(--admin-border)",
                                        color: "white",
                                    }}
                                    className="w-full px-3 py-2 rounded-md text-sm outline-none focus:ring-2 focus:ring-[var(--admin-accent)]"
                                />
                            </div>
                        </div>

                        {/* Statut */}
                        <div>
                            <label className="block text-xs text-[var(--admin-muted-2)] mb-1">
                                Statut
                            </label>
                            <Select
                                value={form.status}
                                onValueChange={(v) =>
                                    setForm((f) => ({ ...f, status: v as CatalogueStatus }))
                                }
                            >
                                <SelectTrigger
                                    style={{
                                        background: "var(--admin-sidebar)",
                                        border: "1px solid var(--admin-border)",
                                        color: "white",
                                    }}
                                    className="w-full"
                                >
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent
                                    style={{
                                        background: "var(--admin-card)",
                                        border: "1px solid var(--admin-border)",
                                    }}
                                >
                                    <SelectItem value="draft">Brouillon</SelectItem>
                                    <SelectItem value="active">En vente</SelectItem>
                                    <SelectItem value="archived">Archivé</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Tags */}
                        <div>
                            <label className="block text-xs text-[var(--admin-muted-2)] mb-1">
                                Tags{" "}
                                <span className="text-[var(--admin-muted)] font-normal">
                                    (séparés par des virgules)
                                </span>
                            </label>
                            <input
                                type="text"
                                {...field("tags")}
                                placeholder="glitch, cyberpunk, neural"
                                style={{
                                    background: "var(--admin-sidebar)",
                                    border: "1px solid var(--admin-border)",
                                    color: "white",
                                }}
                                className="w-full px-3 py-2 rounded-md text-sm outline-none focus:ring-2 focus:ring-[var(--admin-accent)]"
                            />
                        </div>

                        {/* Printful Variant ID */}
                        <div>
                            <label className="block text-xs text-[var(--admin-muted-2)] mb-1">
                                Printful Variant ID{" "}
                                <span className="text-[var(--admin-muted)] font-normal">
                                    (optionnel)
                                </span>
                            </label>
                            <input
                                type="text"
                                {...field("printful_variant_id")}
                                placeholder="12345"
                                style={{
                                    background: "var(--admin-sidebar)",
                                    border: "1px solid var(--admin-border)",
                                    color: "white",
                                }}
                                className="w-full px-3 py-2 rounded-md text-sm outline-none focus:ring-2 focus:ring-[var(--admin-accent)]"
                            />
                        </div>

                        <button
                            onClick={handleSave}
                            disabled={saving || !form.title || !form.price}
                            style={{ background: "var(--admin-accent)" }}
                            className="w-full py-2 rounded-md text-sm font-semibold text-black hover:opacity-90 disabled:opacity-50 transition mt-1"
                        >
                            {saving ? "Enregistrement…" : editing ? "Mettre à jour" : "Ajouter au catalogue"}
                        </button>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
