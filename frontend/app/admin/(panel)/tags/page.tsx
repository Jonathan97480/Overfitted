"use client";
import { useState } from "react";
import {
    useListTagsQuery,
    useCreateTagMutation,
    useUpdateTagMutation,
    useDeleteTagMutation,
    type TagOut,
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
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Pencil, Trash2 } from "lucide-react";

const PRESET_COLORS = [
    "#6B7280", "#EF4444", "#F97316", "#EAB308",
    "#22C55E", "#06B6D4", "#3B82F6", "#8B5CF6",
    "#EC4899", "#14B8A6", "#F59E0B", "#10B981",
];

const EMPTY_FORM = { name: "", color: "#6B7280" };

export default function AdminTagsPage() {
    const { data: tags, isLoading } = useListTagsQuery();
    const [createTag] = useCreateTagMutation();
    const [updateTag] = useUpdateTagMutation();
    const [deleteTag] = useDeleteTagMutation();

    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState<TagOut | null>(null);
    const [saving, setSaving] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<TagOut | null>(null);
    const [form, setForm] = useState(EMPTY_FORM);

    function openCreate() {
        setEditing(null);
        setForm(EMPTY_FORM);
        setOpen(true);
    }

    function openEdit(tag: TagOut) {
        setEditing(tag);
        setForm({ name: tag.name, color: tag.color });
        setOpen(true);
    }

    async function handleSave() {
        if (!form.name.trim()) return;
        setSaving(true);
        try {
            if (editing) {
                await updateTag({ id: editing.id, name: form.name.trim(), color: form.color }).unwrap();
            } else {
                await createTag({ name: form.name.trim(), color: form.color }).unwrap();
            }
            setOpen(false);
            setForm(EMPTY_FORM);
            setEditing(null);
        } catch {
            // cache invalidation via RTK
        } finally {
            setSaving(false);
        }
    }

    async function handleDelete(tag: TagOut) {
        await deleteTag(tag.id);
        setDeleteTarget(null);
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
                        <h2 className="text-white font-semibold">Tags &amp; Collections</h2>
                        <p className="text-xs text-[var(--admin-muted-2)] mt-0.5">
                            {tags?.length ?? 0} tag{(tags?.length ?? 0) !== 1 ? "s" : ""}
                        </p>
                    </div>
                    <button
                        onClick={openCreate}
                        style={{ background: "var(--admin-accent)" }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold text-black hover:opacity-90 transition"
                    >
                        <Plus size={13} /> Nouveau tag
                    </button>
                </div>

                <Table>
                    <TableHeader>
                        <TableRow style={{ borderColor: "var(--admin-border)" }}>
                            <TableHead className="text-[var(--admin-muted-2)] w-10">Couleur</TableHead>
                            <TableHead className="text-[var(--admin-muted-2)]">Nom</TableHead>
                            <TableHead className="text-[var(--admin-muted-2)]">Slug</TableHead>
                            <TableHead className="text-[var(--admin-muted-2)] w-16" />
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading
                            ? Array.from({ length: 4 }).map((_, i) => (
                                <TableRow key={i} style={{ borderColor: "var(--admin-border)" }}>
                                    {Array.from({ length: 4 }).map((__, j) => (
                                        <TableCell key={j}>
                                            <Skeleton className="h-4 w-20 bg-white/10" />
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                            : tags?.map((tag: TagOut) => (
                                <TableRow
                                    key={tag.id}
                                    style={{ borderColor: "var(--admin-border)" }}
                                    className="hover:bg-white/5 transition-colors"
                                >
                                    <TableCell>
                                        <span
                                            className="inline-block w-5 h-5 rounded-full border border-white/20"
                                            style={{ background: tag.color }}
                                            title={tag.color}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <span
                                            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold"
                                            style={{
                                                background: tag.color + "28",
                                                color: tag.color,
                                                border: `1px solid ${tag.color}50`,
                                            }}
                                        >
                                            {tag.name}
                                        </span>
                                    </TableCell>
                                    <TableCell className="font-mono text-[var(--admin-muted-2)] text-xs">
                                        {tag.slug}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2 justify-end">
                                            <button
                                                onClick={() => openEdit(tag)}
                                                className="text-[var(--admin-muted)] hover:text-white transition-colors"
                                                title="Modifier"
                                            >
                                                <Pencil size={13} />
                                            </button>
                                            <button
                                                onClick={() => setDeleteTarget(tag)}
                                                className="text-[var(--admin-muted)] hover:text-red-400 transition-colors"
                                                title="Supprimer"
                                            >
                                                <Trash2 size={13} />
                                            </button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        {!isLoading && tags?.length === 0 && (
                            <TableRow style={{ borderColor: "var(--admin-border)" }}>
                                <TableCell colSpan={4} className="text-center text-[var(--admin-muted-2)] py-8 text-sm">
                                    Aucun tag créé — commencez par en créer un.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Dialog créer / modifier */}
            <Dialog open={open} onOpenChange={(o) => { if (!o) { setOpen(false); setEditing(null); } }}>
                <DialogContent
                    style={{ background: "var(--admin-card)", border: "1px solid var(--admin-border)" }}
                    className="text-white max-w-sm"
                >
                    <DialogHeader>
                        <DialogTitle className="text-white">
                            {editing ? "Modifier le tag" : "Nouveau tag"}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 mt-2">
                        <div>
                            <label className="block text-xs text-[var(--admin-muted-2)] mb-1">Nom *</label>
                            <input
                                type="text"
                                value={form.name}
                                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                                placeholder="Ex: Nouveautés"
                                style={{
                                    background: "var(--admin-sidebar)",
                                    border: "1px solid var(--admin-border)",
                                    color: "white",
                                }}
                                className="w-full px-3 py-2 rounded-md text-sm outline-none focus:ring-2 focus:ring-[var(--admin-accent)]"
                                onKeyDown={(e) => e.key === "Enter" && handleSave()}
                                autoFocus
                            />
                        </div>

                        <div>
                            <label className="block text-xs text-[var(--admin-muted-2)] mb-2">Couleur</label>
                            <div className="grid grid-cols-6 gap-2 mb-2">
                                {PRESET_COLORS.map((c) => (
                                    <button
                                        key={c}
                                        type="button"
                                        onClick={() => setForm((f) => ({ ...f, color: c }))}
                                        className="w-8 h-8 rounded-full border-2 transition-all hover:scale-110"
                                        style={{
                                            background: c,
                                            borderColor: form.color === c ? "white" : "transparent",
                                        }}
                                        title={c}
                                    />
                                ))}
                            </div>
                            <div className="flex items-center gap-2">
                                <input
                                    type="color"
                                    value={form.color}
                                    onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))}
                                    className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent"
                                    title="Couleur personnalisée"
                                />
                                <span className="font-mono text-xs text-[var(--admin-muted-2)]">{form.color}</span>
                                <span
                                    className="ml-auto inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold"
                                    style={{
                                        background: form.color + "28",
                                        color: form.color,
                                        border: `1px solid ${form.color}50`,
                                    }}
                                >
                                    {form.name || "Aperçu"}
                                </span>
                            </div>
                        </div>

                        <button
                            onClick={handleSave}
                            disabled={!form.name.trim() || saving}
                            style={{ background: "var(--admin-accent)" }}
                            className="w-full py-2 rounded-md text-sm font-semibold text-black hover:opacity-90 disabled:opacity-50 transition mt-1"
                        >
                            {saving ? "Enregistrement…" : editing ? "Sauvegarder" : "Créer"}
                        </button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* AlertDialog suppression */}
            <AlertDialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}>
                <AlertDialogContent
                    style={{ background: "var(--admin-card)", border: "1px solid var(--admin-border)" }}
                    className="text-white"
                >
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-white">Supprimer le tag</AlertDialogTitle>
                        <AlertDialogDescription className="text-[var(--admin-muted-2)]">
                            Le tag <strong className="text-white">{deleteTarget?.name}</strong> sera retiré de tous les produits associés. Cette action est irréversible.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel
                            style={{ background: "var(--admin-sidebar)", border: "1px solid var(--admin-border)", color: "white" }}
                            className="hover:opacity-80"
                        >
                            Annuler
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => deleteTarget && handleDelete(deleteTarget)}
                            className="bg-red-600 hover:bg-red-700 text-white border-0"
                        >
                            Supprimer
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
