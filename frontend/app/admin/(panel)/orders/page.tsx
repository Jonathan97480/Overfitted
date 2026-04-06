"use client";
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

const STATUS_COLOR: Record<OrderOut["status"], string> = {
    pending: "#6B7280",
    paid: "#10B981",
    submitted: "#3B82F6",
    shipped: "#8B5CF6",
    cancelled: "#EF4444",
};

export default function AdminOrdersPage() {
    const { data: orders, isLoading } = useListOrdersQuery({});
    const [updateStatus] = useUpdateOrderStatusMutation();

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
                className="px-6 py-4"
            >
                <h2 className="text-white font-semibold">
                    Commandes{" "}
                    {orders && (
                        <span className="text-[var(--admin-muted-2)] font-normal text-sm">
                            ({orders.length})
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
                        <TableHead className="text-[var(--admin-muted-2)]">
                            Design
                        </TableHead>
                        <TableHead className="text-[var(--admin-muted-2)]">
                            Stripe
                        </TableHead>
                        <TableHead className="text-[var(--admin-muted-2)]">
                            Printful
                        </TableHead>
                        <TableHead className="text-[var(--admin-muted-2)]">
                            Statut
                        </TableHead>
                        <TableHead className="text-[var(--admin-muted-2)]">Date</TableHead>
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
                        : orders?.map((order) => (
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
                                            updateStatus({
                                                id: order.id,
                                                status: val as OrderOut["status"],
                                            })
                                        }
                                    >
                                        <SelectTrigger
                                            className="h-7 w-32 text-xs border-none"
                                            style={{
                                                background: "transparent",
                                                color: STATUS_COLOR[order.status],
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
                                                    "paid",
                                                    "submitted",
                                                    "shipped",
                                                    "cancelled",
                                                ] as const
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
                                    {new Date(order.created_at).toLocaleDateString("fr-FR")}
                                </TableCell>
                            </TableRow>
                        ))}
                </TableBody>
            </Table>
        </div>
    );
}
