"use client";
import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
    useGetDesignQuery,
    useUpdateDesignStatusMutation,
    type DesignOut,
} from "@/lib/adminEndpoints";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, ExternalLink, ImageIcon, Code2 } from "lucide-react";

const STATUS_COLOR: Record<DesignOut["status"], string> = {
    pending: "#6B7280",
    processing: "#F59E0B",
    ready: "#10B981",
    failed: "#EF4444",
};

const SOUL_LABELS = [
    "Originalité",
    "Lisibilité",
    "Impact visuel",
    "Maturité artistique",
    "Potentiel commercial",
];

/** Génère des scores Soul-O-Meter déterministes depuis l'ID (simulation) */
function simulateSoulScores(id: number): number[] {
    return SOUL_LABELS.map((_, i) => {
        const seed = (id * 17 + i * 31) % 100;
        return Math.max(10, seed);
    });
}

export default function DesignDetailPage() {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();
    const designId = Number(id);

    const { data: design, isLoading } = useGetDesignQuery(designId, {
        skip: isNaN(designId),
    });
    const [updateStatus, { isLoading: saving }] = useUpdateDesignStatusMutation();

    const [imageTab, setImageTab] = useState<"original" | "svg">("original");
    const [pendingStatus, setPendingStatus] = useState<DesignOut["status"] | null>(null);

    const currentStatus = pendingStatus ?? design?.status ?? "pending";

    const soulScores = design ? simulateSoulScores(design.id) : [];

    const handleSave = async () => {
        if (!pendingStatus || !design) return;
        await updateStatus({ id: design.id, status: pendingStatus });
        setPendingStatus(null);
    };

    const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

    const originalSrc = design?.original_url
        ? design.original_url.startsWith("http")
            ? design.original_url
            : `${apiBase}${design.original_url}`
        : null;

    const svgSrc = design?.svg_url
        ? design.svg_url.startsWith("http")
            ? design.svg_url
            : `${apiBase}${design.svg_url}`
        : null;

    return (
        <div className="space-y-6">
            {/* Breadcrumb */}
            <div className="flex items-center gap-3">
                <button
                    onClick={() => router.back()}
                    className="flex items-center gap-1 text-sm text-[var(--admin-muted-2)] hover:text-white transition-colors"
                >
                    <ArrowLeft size={14} />
                    Retour
                </button>
                <span className="text-[var(--admin-border)]">/</span>
                <span className="text-[var(--admin-muted-2)] text-sm">Designs</span>
                <span className="text-[var(--admin-border)]">/</span>
                <span className="text-white text-sm font-medium">
                    {isLoading ? <Skeleton className="h-4 w-16 inline-block" /> : `#${design?.id}`}
                </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* ── Colonne gauche : images + métadonnées ── */}
                <div className="space-y-4">
                    <Card
                        style={{
                            background: "var(--admin-card)",
                            border: "1px solid var(--admin-border)",
                        }}
                    >
                        <CardHeader className="pb-0">
                            {/* Onglets image */}
                            <div className="flex gap-1 border-b border-[var(--admin-border)] pb-0">
                                {(["original", "svg"] as const).map((t) => (
                                    <button
                                        key={t}
                                        onClick={() => setImageTab(t)}
                                        className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 -mb-px transition-colors ${imageTab === t
                                                ? "border-[var(--admin-accent)] text-[var(--admin-accent)]"
                                                : "border-transparent text-[var(--admin-muted-2)] hover:text-white"
                                            }`}
                                    >
                                        {t === "original" ? <ImageIcon size={12} /> : <Code2 size={12} />}
                                        {t === "original" ? "Originale" : "SVG vectorisé"}
                                    </button>
                                ))}
                            </div>
                        </CardHeader>
                        <CardContent className="pt-4">
                            {isLoading ? (
                                <Skeleton className="h-64 w-full rounded-lg" />
                            ) : imageTab === "original" ? (
                                originalSrc ? (
                                    <div className="relative group">
                                        <img
                                            src={originalSrc}
                                            alt="Design original"
                                            className="w-full max-h-64 object-contain rounded-lg bg-[var(--admin-sidebar)]"
                                        />
                                        <a
                                            href={originalSrc}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 rounded p-1"
                                        >
                                            <ExternalLink size={14} className="text-white" />
                                        </a>
                                    </div>
                                ) : (
                                    <div className="h-64 flex items-center justify-center text-[var(--admin-muted)] text-sm rounded-lg bg-[var(--admin-sidebar)]">
                                        Aucune image
                                    </div>
                                )
                            ) : svgSrc ? (
                                <div className="relative group">
                                    <img
                                        src={svgSrc}
                                        alt="Design SVG"
                                        className="w-full max-h-64 object-contain rounded-lg bg-white/5"
                                    />
                                    <a
                                        href={svgSrc}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 rounded p-1"
                                    >
                                        <ExternalLink size={14} className="text-white" />
                                    </a>
                                </div>
                            ) : (
                                <div className="h-64 flex items-center justify-center text-[var(--admin-muted)] text-sm rounded-lg bg-[var(--admin-sidebar)]">
                                    SVG non disponible
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Métadonnées */}
                    <Card
                        style={{
                            background: "var(--admin-card)",
                            border: "1px solid var(--admin-border)",
                        }}
                    >
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-white">
                                Métadonnées
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <dl className="space-y-2 text-sm">
                                {[
                                    { label: "ID design", value: design ? `#${design.id}` : null },
                                    { label: "Utilisateur", value: design ? (design.user_id ? `#${design.user_id}` : "Anonyme") : null },
                                    {
                                        label: "DPI",
                                        value: design
                                            ? design.dpi
                                                ? `${design.dpi.toFixed(0)} DPI${design.dpi >= 300 ? " ✓" : " ⚠ < 300"}`
                                                : "N/A"
                                            : null,
                                    },
                                    { label: "Statut", value: design?.status ?? null, isStatus: true },
                                    {
                                        label: "Créé le",
                                        value: design
                                            ? new Date(design.created_at).toLocaleString("fr-FR")
                                            : null,
                                    },
                                    { label: "SVG disponible", value: design ? (design.svg_url ? "Oui" : "Non") : null },
                                ].map(({ label, value, isStatus }) => (
                                    <div key={label} className="flex justify-between gap-2">
                                        <dt className="text-[var(--admin-muted-2)]">{label}</dt>
                                        <dd className="text-white font-mono text-right">
                                            {value === null ? (
                                                <Skeleton className="h-4 w-20 inline-block" />
                                            ) : isStatus && design ? (
                                                <span
                                                    className="px-2 py-0.5 rounded text-xs font-semibold"
                                                    style={{
                                                        background: `${STATUS_COLOR[design.status]}22`,
                                                        color: STATUS_COLOR[design.status],
                                                        border: `1px solid ${STATUS_COLOR[design.status]}44`,
                                                    }}
                                                >
                                                    {value}
                                                </span>
                                            ) : (
                                                value
                                            )}
                                        </dd>
                                    </div>
                                ))}
                            </dl>
                        </CardContent>
                    </Card>
                </div>

                {/* ── Colonne droite : Soul-O-Meter + roast + statut ── */}
                <div className="space-y-4">
                    {/* Soul-O-Meter */}
                    <Card
                        style={{
                            background: "var(--admin-card)",
                            border: "1px solid var(--admin-border)",
                        }}
                    >
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-white flex items-center gap-2">
                                Soul-O-Meter
                                <span className="text-xs text-[var(--admin-muted)] font-normal">
                                    (simulation)
                                </span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {isLoading
                                ? Array.from({ length: 5 }).map((_, i) => (
                                    <Skeleton key={i} className="h-6 w-full" />
                                ))
                                : SOUL_LABELS.map((label, i) => {
                                    const score = soulScores[i] ?? 0;
                                    return (
                                        <div key={label}>
                                            <div className="flex justify-between text-xs mb-1">
                                                <span className="text-[var(--admin-muted-2)]">{label}</span>
                                                <span
                                                    className="font-mono font-bold"
                                                    style={{
                                                        color:
                                                            score >= 70
                                                                ? "#10B981"
                                                                : score >= 40
                                                                    ? "#F59E0B"
                                                                    : "#EF4444",
                                                    }}
                                                >
                                                    {score}
                                                </span>
                                            </div>
                                            <div className="h-2 rounded-full bg-[var(--admin-border)] overflow-hidden">
                                                <div
                                                    className="h-full rounded-full transition-all duration-700"
                                                    style={{
                                                        width: `${score}%`,
                                                        background:
                                                            score >= 70
                                                                ? "#10B981"
                                                                : score >= 40
                                                                    ? "#F59E0B"
                                                                    : "#EF4444",
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                        </CardContent>
                    </Card>

                    {/* Roast IA */}
                    <Card
                        style={{
                            background: "var(--admin-card)",
                            border: "1px solid var(--admin-border)",
                        }}
                    >
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-white flex items-center gap-2">
                                Roast IA
                                <span className="text-xs text-[var(--admin-muted)] font-normal">
                                    (simulation)
                                </span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {isLoading ? (
                                <div className="space-y-2">
                                    <Skeleton className="h-4 w-full" />
                                    <Skeleton className="h-4 w-5/6" />
                                    <Skeleton className="h-4 w-4/6" />
                                </div>
                            ) : design ? (
                                <p className="text-sm text-[var(--admin-muted-2)] leading-relaxed font-mono">
                                    {`Design #${design.id} — ${design.dpi && design.dpi >= 300
                                            ? "Résolution acceptable. Le pipeline de vectorisation peut s'exécuter."
                                            : "Résolution insuffisante. Probabilité d'artefacts vectoriels élevée."
                                        } Statut actuel : ${design.status}. ${design.svg_url
                                            ? "SVG généré — ready for print."
                                            : "Aucun SVG — vectorisation non effectuée."
                                        }`}
                                </p>
                            ) : null}
                        </CardContent>
                    </Card>

                    {/* Changement de statut */}
                    <Card
                        style={{
                            background: "var(--admin-card)",
                            border: "1px solid var(--admin-border)",
                        }}
                    >
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-white">
                                Changer le statut
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {isLoading ? (
                                <Skeleton className="h-10 w-full" />
                            ) : (
                                <>
                                    <Select
                                        value={currentStatus}
                                        onValueChange={(v) =>
                                            setPendingStatus(v as DesignOut["status"])
                                        }
                                    >
                                        <SelectTrigger
                                            style={{
                                                background: "var(--admin-sidebar)",
                                                border: "1px solid var(--admin-border)",
                                                color: STATUS_COLOR[currentStatus],
                                            }}
                                        >
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent
                                            style={{
                                                background: "var(--admin-sidebar)",
                                                border: "1px solid var(--admin-border)",
                                            }}
                                        >
                                            {(
                                                [
                                                    "pending",
                                                    "processing",
                                                    "ready",
                                                    "failed",
                                                ] as const
                                            ).map((s) => (
                                                <SelectItem
                                                    key={s}
                                                    value={s}
                                                    style={{ color: STATUS_COLOR[s] }}
                                                >
                                                    {s}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <Button
                                        onClick={handleSave}
                                        disabled={!pendingStatus || saving}
                                        className="w-full"
                                        style={{
                                            background: pendingStatus
                                                ? "var(--admin-accent)"
                                                : "var(--admin-border)",
                                            color: pendingStatus ? "black" : "var(--admin-muted)",
                                        }}
                                    >
                                        {saving ? "Sauvegarde…" : "Sauvegarder le statut"}
                                    </Button>
                                </>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
