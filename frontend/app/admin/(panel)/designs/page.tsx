"use client";
import { useState, useMemo } from "react";
import {
    useListDesignsQuery,
    useUpdateDesignStatusMutation,
    useDeleteDesignMutation,
    type DesignOut,
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
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Trash2, Eye, Search } from "lucide-react";
import Link from "next/link";

const STATUS_COLOR: Record<DesignOut["status"], string> = {
    pending: "#6B7280",
    processing: "#F59E0B",
    ready: "#10B981",
    failed: "#EF4444",
};

const ALL_STATUSES = ["pending", "processing", "ready", "failed"] as const;

export default function AdminDesignsPage() {
    const { data: designs, isLoading } = useListDesignsQuery({});
    const [updateStatus] = useUpdateDesignStatusMutation();
    const [deleteDesign] = useDeleteDesignMutation();

    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<DesignOut["status"] | "all">("all");

    const filtered = useMemo(() => {
        if (!designs) return [];
        return designs.filter((d) => {
            const matchStatus = statusFilter === "all" || d.status === statusFilter;
            const q = search.toLowerCase();
            const matchSearch =
                !q ||
                String(d.id).includes(q) ||
                String(d.user_id ?? "").includes(q) ||
                d.status.includes(q);
            return matchStatus && matchSearch;
        });
    }, [designs, search, statusFilter]);

    return (
        <div
            style={{
                background: "var(--admin-card)",
                border: "1px solid var(--admin-border)",
            }}
            className="rounded-xl overflow-hidden"
        >
            {/* Toolbar */}
            <div
                style={{ borderBottom: "1px solid var(--admin-border)" }}
                className="px-4 py-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
            >
                {/* Search */}
                <div className="relative w-full sm:w-64">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--admin-muted-2)]" />
                    <Input
                        placeholder="Rechercher ID, user…"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-8 h-8 text-sm bg-[var(--admin-sidebar)] border-[var(--admin-border)] text-white placeholder:text-[var(--admin-muted)]"
                    />
                </div>

                {/* Status tabs */}
                <div className="flex items-center gap-1 flex-wrap">
                    {(["all", ...ALL_STATUSES] as const).map((s) => {
                        const count = s === "all"
                            ? (designs?.length ?? 0)
                            : (designs?.filter((d) => d.status === s).length ?? 0);
                        return (
                            <button
                                key={s}
                                onClick={() => setStatusFilter(s as typeof statusFilter)}
                                className="px-2.5 py-1 rounded text-xs font-medium border transition-colors"
                                style={{
                                    borderColor: statusFilter === s
                                        ? s === "all" ? "var(--admin-accent)" : STATUS_COLOR[s as DesignOut["status"]]
                                        : "var(--admin-border)",
                                    color: statusFilter === s
                                        ? s === "all" ? "var(--admin-accent)" : STATUS_COLOR[s as DesignOut["status"]]
                                        : "var(--admin-muted-2)",
                                    background: statusFilter === s ? "rgba(255,255,255,0.04)" : "transparent",
                                }}
                            >
                                {s} <span className="opacity-60">{count}</span>
                            </button>
                        );
                    })}
                    <span className="ml-2 text-xs text-[var(--admin-muted)]">
                        {filtered.length} résultat{filtered.length !== 1 ? "s" : ""}
                    </span>
                </div>
            </div>

            <Table>
                <TableHeader>
                    <TableRow style={{ borderColor: "var(--admin-border)" }}>
                        <TableHead className="text-[var(--admin-muted-2)]">ID</TableHead>
                        <TableHead className="text-[var(--admin-muted-2)]">Utilisateur</TableHead>
                        <TableHead className="text-[var(--admin-muted-2)]">DPI</TableHead>
                        <TableHead className="text-[var(--admin-muted-2)]">SVG</TableHead>
                        <TableHead className="text-[var(--admin-muted-2)]">Statut</TableHead>
                        <TableHead className="text-[var(--admin-muted-2)]">Date</TableHead>
                        <TableHead className="text-[var(--admin-muted-2)]" />
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {isLoading
                        ? Array.from({ length: 5 }).map((_, i) => (
                            <TableRow key={i} style={{ borderColor: "var(--admin-border)" }}>
                                {Array.from({ length: 7 }).map((_, j) => (
                                    <TableCell key={j}>
                                        <Skeleton className="h-4 w-full" />
                                    </TableCell>
                                ))}
                            </TableRow>
                        ))
                        : filtered.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center py-12 text-[var(--admin-muted)] text-sm">
                                    {search || statusFilter !== "all" ? "Aucun design ne correspond aux filtres." : "Aucun design."}
                                </TableCell>
                            </TableRow>
                        ) : filtered.map((design) => (
                            <TableRow
                                key={design.id}
                                style={{ borderColor: "var(--admin-border)" }}
                                className="hover:bg-white/5 transition-colors"
                            >
                                <TableCell className="text-[var(--admin-muted-2)] font-mono text-xs">
                                    #{design.id}
                                </TableCell>
                                <TableCell className="text-white text-sm">
                                    {design.user_id ?? "—"}
                                </TableCell>
                                <TableCell className="text-white text-sm">
                                    {design.dpi != null ? `${design.dpi.toFixed(0)} DPI` : "—"}
                                </TableCell>
                                <TableCell className="text-sm">
                                    {design.svg_url ? (
                                        <a
                                            href={design.svg_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-cyan-400 hover:underline text-xs"
                                        >
                                            SVG
                                        </a>
                                    ) : (
                                        <span className="text-[var(--admin-muted)]">—</span>
                                    )}
                                </TableCell>
                                <TableCell>
                                    <Select
                                        value={design.status}
                                        onValueChange={(val) =>
                                            updateStatus({ id: design.id, status: val as DesignOut["status"] })
                                        }
                                    >
                                        <SelectTrigger
                                            className="h-7 w-32 text-xs border-none"
                                            style={{ background: "transparent", color: STATUS_COLOR[design.status] }}
                                        >
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent style={{ background: "var(--admin-sidebar)", border: "1px solid var(--admin-border)" }}>
                                            {ALL_STATUSES.map((s) => (
                                                <SelectItem key={s} value={s} className="text-white text-xs">
                                                    {s}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </TableCell>
                                <TableCell className="text-[var(--admin-muted-2)] text-xs">
                                    {new Date(design.created_at).toLocaleDateString("fr-FR")}
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-2">
                                        <Link
                                            href={`/admin/designs/${design.id}`}
                                            className="text-[var(--admin-muted)] hover:text-[var(--admin-accent)] transition-colors"
                                        >
                                            <Eye size={14} />
                                        </Link>
                                        <button
                                            onClick={() => {
                                                if (confirm(`Supprimer le design #${design.id} ?`))
                                                    deleteDesign(design.id);
                                            }}
                                            className="text-[var(--admin-muted)] hover:text-red-400 transition-colors"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                </TableBody>
            </Table>
        </div>
    );
}
