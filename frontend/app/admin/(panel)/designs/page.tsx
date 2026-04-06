"use client";
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
import { Badge } from "@/components/ui/badge";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Trash2 } from "lucide-react";

const STATUS_VARIANT: Record<
    DesignOut["status"],
    "default" | "secondary" | "destructive" | "outline"
> = {
    pending: "secondary",
    processing: "outline",
    ready: "default",
    failed: "destructive",
};

const STATUS_COLOR: Record<DesignOut["status"], string> = {
    pending: "#6B7280",
    processing: "#F59E0B",
    ready: "#10B981",
    failed: "#EF4444",
};

export default function AdminDesignsPage() {
    const { data: designs, isLoading } = useListDesignsQuery({});
    const [updateStatus] = useUpdateDesignStatusMutation();
    const [deleteDesign] = useDeleteDesignMutation();

    return (
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
                <h2 className="text-white font-semibold">
                    Designs{" "}
                    {designs && (
                        <span className="text-[var(--admin-muted-2)] font-normal text-sm">
                            ({designs.length})
                        </span>
                    )}
                </h2>
            </div>

            <Table>
                <TableHeader>
                    <TableRow style={{ borderColor: "var(--admin-border)" }}>
                        <TableHead className="text-[var(--admin-muted-2)]">ID</TableHead>
                        <TableHead className="text-[var(--admin-muted-2)]">
                            Utilisateur
                        </TableHead>
                        <TableHead className="text-[var(--admin-muted-2)]">DPI</TableHead>
                        <TableHead className="text-[var(--admin-muted-2)]">SVG</TableHead>
                        <TableHead className="text-[var(--admin-muted-2)]">
                            Statut
                        </TableHead>
                        <TableHead className="text-[var(--admin-muted-2)]">Date</TableHead>
                        <TableHead className="text-[var(--admin-muted-2)]" />
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {isLoading
                        ? Array.from({ length: 5 }).map((_, i) => (
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
                        : designs?.map((design) => (
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
                                    {design.dpi != null ? `${design.dpi} DPI` : "—"}
                                </TableCell>
                                <TableCell className="text-sm">
                                    {design.svg_url ? (
                                        <a
                                            href={design.svg_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-[var(--admin-accent-cyan)] hover:underline"
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
                                            updateStatus({
                                                id: design.id,
                                                status: val as DesignOut["status"],
                                            })
                                        }
                                    >
                                        <SelectTrigger
                                            className="h-7 w-32 text-xs border-none"
                                            style={{
                                                background: "transparent",
                                                color: STATUS_COLOR[design.status],
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
                                                ["pending", "processing", "ready", "failed"] as const
                                            ).map((s) => (
                                                <SelectItem
                                                    key={s}
                                                    value={s}
                                                    className="text-white text-xs"
                                                >
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
                                    <button
                                        onClick={() => {
                                            if (confirm(`Supprimer le design #${design.id} ?`))
                                                deleteDesign(design.id);
                                        }}
                                        className="text-[var(--admin-muted)] hover:text-red-400 transition-colors"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </TableCell>
                            </TableRow>
                        ))}
                </TableBody>
            </Table>
        </div>
    );
}
