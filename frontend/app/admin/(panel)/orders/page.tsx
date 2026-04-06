"use client";
import { useState, useMemo, useCallback } from "react";
import {
    useListOrdersQuery,
    useUpdateOrderStatusMutation,
    type OrderOut,
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
import { Button } from "@/components/ui/button";
import { Search, Download } from "lucide-react";

const STATUS_COLOR: Record<OrderOut["status"], string> = {
    pending: "#6B7280",
    paid: "#10B981",
    submitted: "#3B82F6",
    shipped: "#8B5CF6",
    cancelled: "#EF4444",
};

const ALL_STATUSES = ["pending", "paid", "submitted", "shipped", "cancelled"] as const;

function exportCSV(orders: OrderOut[]) {
    const headers = ["ID", "User ID", "Design ID", "Stripe ID", "Printful ID", "Statut", "Date"];
    const rows = orders.map((o) => [
        o.id,
        o.user_id ?? "",
        o.design_id,
        o.stripe_session_id ?? "",
        o.printful_order_id ?? "",
        o.status,
        new Date(o.created_at).toLocaleDateString("fr-FR"),
    ]);
    const csv = [headers, ...rows].map((r) => r.join(";")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `commandes_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
}

export default function AdminOrdersPage() {
    const { data: orders, isLoading } = useListOrdersQuery({});
    const [updateStatus] = useUpdateOrderStatusMutation();

    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<OrderOut["status"] | "all">("all");

    const filtered = useMemo(() => {
        if (!orders) return [];
        return orders.filter((o) => {
            const matchStatus = statusFilter === "all" || o.status === statusFilter;
            const q = search.toLowerCase();
            const matchSearch =
                !q ||
                String(o.id).includes(q) ||
                String(o.user_id ?? "").includes(q) ||
                String(o.design_id).includes(q) ||
                (o.stripe_session_id ?? "").toLowerCase().includes(q);
            return matchStatus && matchSearch;
        });
    }, [orders, search, statusFilter]);

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
                <div className="flex items-center gap-3 flex-1">
                    {/* Search */}
                    <div className="relative w-full sm:w-64">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--admin-muted-2)]" />
                        <Input
                            placeholder="ID, user, stripe…"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-8 h-8 text-sm bg-[var(--admin-sidebar)] border-[var(--admin-border)] text-white placeholder:text-[var(--admin-muted)]"
                        />
                    </div>
                    {/* Status tabs */}
                    <div className="flex items-center gap-1 flex-wrap">
                        {(["all", ...ALL_STATUSES] as const).map((s) => {
                            const cnt = s === "all"
                                ? (orders?.length ?? 0)
                                : (orders?.filter((o) => o.status === s).length ?? 0);
                            return (
                                <button
                                    key={s}
                                    onClick={() => setStatusFilter(s as typeof statusFilter)}
                                    className="px-2.5 py-1 rounded text-xs font-medium border transition-colors"
                                    style={{
                                        borderColor: statusFilter === s
                                            ? s === "all" ? "var(--admin-accent)" : STATUS_COLOR[s as OrderOut["status"]]
                                            : "var(--admin-border)",
                                        color: statusFilter === s
                                            ? s === "all" ? "var(--admin-accent)" : STATUS_COLOR[s as OrderOut["status"]]
                                            : "var(--admin-muted-2)",
                                        background: statusFilter === s ? "rgba(255,255,255,0.04)" : "transparent",
                                    }}
                                >
                                    {s} <span className="opacity-60">{cnt}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Export CSV */}
                <Button
                    size="sm"
                    variant="outline"
                    onClick={() => exportCSV(filtered)}
                    disabled={filtered.length === 0}
                    className="shrink-0 text-xs h-8 border-[var(--admin-border)] text-[var(--admin-muted-2)] hover:text-white hover:bg-white/5"
                >
                    <Download size={13} className="mr-1.5" />
                    CSV ({filtered.length})
                </Button>
            </div>

            <Table>
                <TableHeader>
                    <TableRow style={{ borderColor: "var(--admin-border)" }}>
                        <TableHead className="text-[var(--admin-muted-2)]">ID</TableHead>
                        <TableHead className="text-[var(--admin-muted-2)]">Utilisateur</TableHead>
                        <TableHead className="text-[var(--admin-muted-2)]">Design</TableHead>
                        <TableHead className="text-[var(--admin-muted-2)]">Stripe</TableHead>
                        <TableHead className="text-[var(--admin-muted-2)]">Printful</TableHead>
                        <TableHead className="text-[var(--admin-muted-2)]">Statut</TableHead>
                        <TableHead className="text-[var(--admin-muted-2)]">Date</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {isLoading
                        ? Array.from({ length: 5 }).map((_, i) => (
                            <TableRow key={i} style={{ borderColor: "var(--admin-border)" }}>
                                {Array.from({ length: 7 }).map((_, j) => (
                                    <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                                ))}
                            </TableRow>
                        ))
                        : filtered.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center py-12 text-[var(--admin-muted)] text-sm">
                                    {search || statusFilter !== "all" ? "Aucune commande ne correspond aux filtres." : "Aucune commande."}
                                </TableCell>
                            </TableRow>
                        ) : filtered.map((order) => (
                            <TableRow
                                key={order.id}
                                style={{ borderColor: "var(--admin-border)" }}
                                className="hover:bg-white/5 transition-colors"
                            >
                                <TableCell className="text-[var(--admin-muted-2)] font-mono text-xs">
                                    #{order.id}
                                </TableCell>
                                <TableCell className="text-white text-sm">
                                    {order.user_id ?? "—"}
                                </TableCell>
                                <TableCell className="text-white text-sm">
                                    #{order.design_id}
                                </TableCell>
                                <TableCell className="text-[var(--admin-muted-2)] font-mono text-xs truncate max-w-[120px]">
                                    {order.stripe_session_id
                                        ? order.stripe_session_id.slice(0, 12) + "…"
                                        : "—"}
                                </TableCell>
                                <TableCell className="text-[var(--admin-muted-2)] font-mono text-xs">
                                    {order.printful_order_id ?? "—"}
                                </TableCell>
                                <TableCell>
                                    <Select
                                        value={order.status}
                                        onValueChange={(val) =>
                                            updateStatus({ id: order.id, status: val as OrderOut["status"] })
                                        }
                                    >
                                        <SelectTrigger
                                            className="h-7 w-32 text-xs border-none"
                                            style={{ background: "transparent", color: STATUS_COLOR[order.status] }}
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
                                    {new Date(order.created_at).toLocaleDateString("fr-FR")}
                                </TableCell>
                            </TableRow>
                        ))}
                </TableBody>
            </Table>
        </div>
    );
}
