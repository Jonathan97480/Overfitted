"use client";
import { useRef, useState } from "react";
import {
    useListShopDesignsQuery,
    useUploadShopDesignMutation,
    useProcessShopDesignMutation,
    useDeleteShopDesignMutation,
    type ShopDesignOut,
} from "@/lib/adminEndpoints";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Upload, Trash2, Wand2, CheckCircle, AlertCircle, ImageIcon } from "lucide-react";
import { assetUrl } from "@/lib/utils";

// ── Badge DPI ────────────────────────────────────────────────────────────────
function DpiBadge({ dpi, printReady }: { dpi: number | null; printReady: boolean }) {
    if (dpi === null) return <span className="text-xs text-[var(--admin-muted-2)]">—</span>;
    return (
        <span className="flex items-center gap-1 text-xs"
            style={{ color: printReady ? "#22C55E" : "#F59E0B" }}>
            {printReady ? <CheckCircle size={11} /> : <AlertCircle size={11} />}
            {dpi} DPI
        </span>
    );
}

// ── Flags de processing ──────────────────────────────────────────────────────
function ProcessFlags({ design }: { design: ShopDesignOut }) {
    const flags = [
        { label: "Fond", done: design.bg_removed },
        { label: "Upscale", done: design.upscaled },
        { label: "SVG", done: design.vectorized },
    ];
    return (
        <div className="flex gap-1">
            {flags.map(({ label, done }) => (
                <span key={label} className="text-[10px] px-1.5 py-0.5 rounded"
                    style={{
                        background: done ? "#22C55E18" : "var(--admin-bg-2)",
                        border: `1px solid ${done ? "#22C55E40" : "var(--admin-border)"}`,
                        color: done ? "#22C55E" : "var(--admin-muted-2)",
                    }}>
                    {label}
                </span>
            ))}
        </div>
    );
}

// ── Process Modal ────────────────────────────────────────────────────────────
function ProcessModal({ design, onClose, onProcessed }: { design: ShopDesignOut; onClose: () => void; onProcessed: (id: number) => void }) {
    const [processDesign, { isLoading }] = useProcessShopDesignMutation();
    const [opts, setOpts] = useState({ remove_bg: !design.bg_removed, upscale: !design.upscaled, vectorize: false });
    const [done, setDone] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleRun = async () => {
        setError(null);
        try {
            await processDesign({ id: design.id, ...opts }).unwrap();
            setDone(true);
            onProcessed(design.id);
        } catch (e: unknown) {
            setError((e as { data?: { detail?: string } })?.data?.detail ?? "Erreur processing.");
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
            <div className="rounded-xl p-6 w-96 space-y-4"
                style={{ background: "var(--admin-sidebar)", border: "1px solid var(--admin-border)" }}>
                <h2 className="text-white font-bold text-lg">Traiter le design</h2>
                <p className="text-xs text-[var(--admin-muted-2)]">{design.filename}</p>

                {done ? (
                    <div className="flex items-center gap-2 text-sm text-green-400">
                        <CheckCircle size={16} /> Traitement terminé !
                    </div>
                ) : (
                    <div className="space-y-2">
                        {[
                            { key: "remove_bg" as const, label: "Supprimer le fond", done: design.bg_removed },
                            { key: "upscale" as const, label: "Upscale (≥ 300 DPI)", done: design.upscaled },
                            { key: "vectorize" as const, label: "Vectoriser en SVG", done: design.vectorized },
                        ].map(({ key, label, done: alreadyDone }) => (
                            <label key={key} className="flex items-center gap-3 cursor-pointer select-none">
                                <input type="checkbox" checked={opts[key]}
                                    onChange={(e) => setOpts({ ...opts, [key]: e.target.checked })}
                                    className="accent-[var(--admin-accent)]" />
                                <span className="text-sm text-white">{label}</span>
                                {alreadyDone && <CheckCircle size={13} className="text-green-400" />}
                            </label>
                        ))}
                        {error && <p className="text-xs text-red-400">{error}</p>}
                    </div>
                )}

                <div className="flex justify-end gap-2 pt-2">
                    <Button variant="ghost" size="sm" onClick={onClose}
                        style={{ color: "var(--admin-muted-2)" }}>
                        {done ? "Fermer" : "Annuler"}
                    </Button>
                    {!done && (
                        <Button size="sm" disabled={isLoading || !Object.values(opts).some(Boolean)}
                            onClick={handleRun}
                            style={{ background: "var(--admin-accent)", color: "white" }}>
                            {isLoading ? "Traitement…" : "Lancer"}
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}

// ── Page principale ──────────────────────────────────────────────────────────
export default function DesignsShopPage() {
    const { data: designs, isLoading } = useListShopDesignsQuery();
    const [uploadDesign, { isLoading: isUploading }] = useUploadShopDesignMutation();
    const [deleteDesign] = useDeleteShopDesignMutation();
    const fileRef = useRef<HTMLInputElement>(null);
    const [deleteTarget, setDeleteTarget] = useState<ShopDesignOut | null>(null);
    const [processTarget, setProcessTarget] = useState<ShopDesignOut | null>(null);
    const [uploadError, setUploadError] = useState<string | null>(null);
    // Cache-buster : timestamp par design mis à jour après traitement
    const [refreshTs, setRefreshTs] = useState<Record<number, number>>({});

    const bustCache = (id: number) => setRefreshTs((prev) => ({ ...prev, [id]: Date.now() }));
    const imgSrc = (d: ShopDesignOut) => {
        const ts = refreshTs[d.id];
        return assetUrl(d.url) + (ts ? `?t=${ts}` : "");
    };

    const handleUpload = async (file: File) => {
        setUploadError(null);
        const fd = new FormData();
        fd.append("file", file);
        try {
            await uploadDesign(fd).unwrap();
        } catch (e: unknown) {
            setUploadError((e as { data?: { detail?: string } })?.data?.detail ?? "Erreur upload.");
        }
    };

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-white font-bold text-lg">Designs Shop</h2>
                    <p className="text-xs text-[var(--admin-muted-2)] mt-0.5">
                        Fichiers artwork utilisés sur les produits — PNG, JPG, SVG, WEBP
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {uploadError && <span className="text-xs text-red-400">{uploadError}</span>}
                    <Button size="sm" disabled={isUploading} onClick={() => fileRef.current?.click()}
                        style={{ background: "var(--admin-accent)", color: "white" }}>
                        <Upload size={14} className="mr-1" />
                        {isUploading ? "Upload…" : "Uploader un design"}
                    </Button>
                    <input ref={fileRef} type="file" accept="image/*,.svg" className="hidden"
                        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); }} />
                </div>
            </div>

            {/* Zone drop */}
            <div
                className="border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors hover:border-[var(--admin-accent)]"
                style={{ borderColor: "var(--admin-border)", background: "var(--admin-card)" }}
                onClick={() => fileRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                    e.preventDefault();
                    const file = e.dataTransfer.files[0];
                    if (file) handleUpload(file);
                }}>
                <ImageIcon size={32} className="mx-auto mb-2 text-[var(--admin-muted-2)]" />
                <p className="text-sm text-[var(--admin-muted-2)]">Glisser-déposer un design ici</p>
                <p className="text-xs text-[var(--admin-muted-2)] mt-1">PNG / JPG / WEBP / SVG — max 20 Mo — idéalement ≥ 300 DPI</p>
            </div>

            {/* Grille */}
            {isLoading ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {Array.from({ length: 8 }).map((_, i) => (
                        <Skeleton key={i} className="h-48 rounded-xl" />
                    ))}
                </div>
            ) : !designs || designs.length === 0 ? (
                <p className="text-center py-12 text-sm text-[var(--admin-muted-2)]">
                    Aucun design. Uploadez votre premier fichier artwork.
                </p>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {designs.map((d) => (
                        <div key={d.id} className="rounded-xl overflow-hidden flex flex-col"
                            style={{ background: "var(--admin-card)", border: "1px solid var(--admin-border)" }}>
                            {/* Preview */}
                            <div className="relative flex-1 min-h-0 flex items-center justify-center p-3"
                                style={{ background: "var(--admin-bg-2)", minHeight: 140 }}>
                                <img
                                    src={imgSrc(d)}
                                    alt={d.filename}
                                    className="max-h-36 max-w-full object-contain"
                                />
                                {d.print_ready && (
                                    <div className="absolute top-1.5 right-1.5">
                                        <CheckCircle size={16} className="text-green-400" />
                                    </div>
                                )}
                            </div>
                            {/* Infos */}
                            <div className="p-3 space-y-2">
                                <p className="text-xs text-white font-medium truncate" title={d.filename}>
                                    {d.filename}
                                </p>
                                <DpiBadge dpi={d.dpi} printReady={d.print_ready} />
                                <ProcessFlags design={d} />
                                {/* Actions */}
                                <div className="flex gap-1 pt-1">
                                    <Button size="sm" variant="outline" className="flex-1 text-xs h-7"
                                        style={{ borderColor: "var(--admin-border)", color: "var(--admin-muted-2)" }}
                                        onClick={() => setProcessTarget(d)}>
                                        <Wand2 size={12} className="mr-1" /> Traiter
                                    </Button>
                                    <button onClick={() => setDeleteTarget(d)}
                                        className="p-1.5 rounded hover:bg-red-500/20 text-[var(--admin-muted-2)] hover:text-red-400 transition-colors"
                                        title="Supprimer">
                                        <Trash2 size={13} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Process modal */}
            {processTarget && (
                <ProcessModal design={processTarget} onClose={() => setProcessTarget(null)} onProcessed={bustCache} />
            )}

            {/* Delete confirm */}
            <AlertDialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}>
                <AlertDialogContent style={{ background: "var(--admin-sidebar)", border: "1px solid var(--admin-border)" }}>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-white">Supprimer le design ?</AlertDialogTitle>
                        <AlertDialogDescription className="text-[var(--admin-muted-2)]">
                            <strong className="text-white">{deleteTarget?.filename}</strong> sera définitivement supprimé.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel style={{ background: "var(--admin-card)", border: "1px solid var(--admin-border)", color: "var(--admin-muted-2)" }}>
                            Annuler
                        </AlertDialogCancel>
                        <AlertDialogAction style={{ background: "#EF4444", color: "white" }}
                            onClick={() => { if (deleteTarget) { deleteDesign(deleteTarget.id); setDeleteTarget(null); } }}>
                            Supprimer
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
