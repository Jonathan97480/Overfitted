"use client";
import Link from "next/link";
import {
    useGetStatsQuery,
    useListDesignsQuery,
    useListOrdersQuery,
} from "@/lib/adminEndpoints";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Users,
    ImageIcon,
    ShoppingCart,
    Euro,
    TrendingUp,
    TrendingDown,
    Minus,
} from "lucide-react";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    Cell,
} from "recharts";

const STATUS_COLORS: Record<string, string> = {
    pending: "#6B7280",
    processing: "#F59E0B",
    ready: "#10B981",
    failed: "#EF4444",
    paid: "#10B981",
    submitted: "#3B82F6",
    shipped: "#8B5CF6",
    cancelled: "#EF4444",
};

const STATUS_LABEL: Record<string, string> = {
    pending: "En attente",
    processing: "Traitement",
    ready: "Prêt",
    failed: "Échoué",
    paid: "Payé",
    submitted: "Soumis",
    shipped: "Expédié",
    cancelled: "Annulé",
};

function DeltaBadge({ value }: { value: number }) {
    if (value === 0) return (
        <span className="flex items-center gap-1 text-xs text-[var(--admin-muted-2)]">
            <Minus size={12} /> 0%
        </span>
    );
    const positive = value > 0;
    return (
        <span
            className="flex items-center gap-1 text-xs font-medium"
            style={{ color: positive ? "#22C55E" : "#EF4444" }}
        >
            {positive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {positive ? "+" : ""}{value}%
        </span>
    );
}

export default function AdminDashboardPage() {
    const { data: stats, isLoading } = useGetStatsQuery(undefined, { pollingInterval: 30000 });
    const { data: recentDesigns, isLoading: loadingDesigns } = useListDesignsQuery(
        { skip: 0, limit: 5 },
        { pollingInterval: 30000 }
    );
    const { data: recentOrders, isLoading: loadingOrders } = useListOrdersQuery(
        { skip: 0, limit: 5 },
        { pollingInterval: 30000 }
    );

    const activeOrders =
        (stats?.orders_by_status?.pending ?? 0) +
        (stats?.orders_by_status?.paid ?? 0) +
        (stats?.orders_by_status?.submitted ?? 0);

    const kpis = [
        {
            label: "Utilisateurs",
            value: stats?.total_users ?? 0,
            icon: Users,
            color: "#3B82F6",
            delta: stats?.delta_users ?? 0,
        },
        {
            label: "Designs en attente",
            value: stats?.designs_by_status?.pending ?? 0,
            icon: ImageIcon,
            color: "#8B5CF6",
            delta: stats?.delta_designs ?? 0,
        },
        {
            label: "Revenue total",
            value: `${(stats?.total_revenue ?? 0).toFixed(2)} €`,
            icon: Euro,
            color: "var(--admin-accent)",
            delta: stats?.delta_revenue ?? 0,
        },
        {
            label: "Commandes actives",
            value: activeOrders,
            icon: ShoppingCart,
            color: "#10B981",
            delta: stats?.delta_orders ?? 0,
        },
    ];

    const ordersChartData = stats
        ? Object.entries(stats.orders_by_status).map(([status, count]) => ({ name: status, count }))
        : [];

    const designsChartData = stats
        ? Object.entries(stats.designs_by_status).map(([status, count]) => ({ name: status, count }))
        : [];

    const cardStyle = { background: "var(--admin-card)", border: "1px solid var(--admin-border)" };
    const tooltipStyle = {
        background: "var(--admin-sidebar)",
        border: "1px solid var(--admin-border)",
        borderRadius: 6,
        color: "white",
        fontSize: 12,
    };

    return (
        <div className="space-y-6">
            {/* ─── KPI Row ──────────────────────────────────────────── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {kpis.map(({ label, value, icon: Icon, color, delta }) => (
                    <Card key={label} style={cardStyle}>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium text-[var(--admin-muted-2)]">
                                {label}
                            </CardTitle>
                            <Icon size={16} style={{ color }} />
                        </CardHeader>
                        <CardContent className="space-y-1">
                            {isLoading ? (
                                <Skeleton className="h-8 w-20" />
                            ) : (
                                <>
                                    <p className="text-2xl font-bold text-white">{value}</p>
                                    <DeltaBadge value={delta} />
                                </>
                            )}
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* ─── Recent Tables ────────────────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Recent Designs */}
                <Card style={cardStyle}>
                    <CardHeader className="flex flex-row items-center justify-between pb-3">
                        <CardTitle className="text-sm font-medium text-white">Designs récents</CardTitle>
                        <Link
                            href="/admin/designs"
                            className="text-xs text-[var(--admin-accent)] hover:underline"
                        >
                            Voir tout →
                        </Link>
                    </CardHeader>
                    <CardContent className="p-0">
                        {loadingDesigns ? (
                            <div className="p-4 space-y-2">
                                {Array.from({ length: 5 }).map((_, i) => (
                                    <Skeleton key={i} className="h-10 w-full" />
                                ))}
                            </div>
                        ) : (
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="border-b border-[var(--admin-border)]">
                                        <th className="text-left px-4 py-2 text-[var(--admin-muted-2)] font-medium w-12">Aperçu</th>
                                        <th className="text-left px-2 py-2 text-[var(--admin-muted-2)] font-medium">ID</th>
                                        <th className="text-left px-2 py-2 text-[var(--admin-muted-2)] font-medium">DPI</th>
                                        <th className="text-left px-2 py-2 text-[var(--admin-muted-2)] font-medium">Statut</th>
                                        <th className="text-left px-2 py-2 text-[var(--admin-muted-2)] font-medium">Date</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(recentDesigns ?? []).map((d) => (
                                        <tr
                                            key={d.id}
                                            className="border-b border-[var(--admin-border)] last:border-0 hover:bg-white/5"
                                        >
                                            <td className="px-4 py-2">
                                                <Link href={`/admin/designs/${d.id}`}>
                                                    {d.original_url ? (
                                                        <img
                                                            src={d.original_url}
                                                            alt=""
                                                            className="w-9 h-9 rounded object-cover"
                                                            style={{ border: "1px solid var(--admin-border)" }}
                                                        />
                                                    ) : (
                                                        <div
                                                            className="w-9 h-9 rounded flex items-center justify-center"
                                                            style={{ background: "var(--admin-border)" }}
                                                        >
                                                            <ImageIcon size={14} className="text-[var(--admin-muted-2)]" />
                                                        </div>
                                                    )}
                                                </Link>
                                            </td>
                                            <td className="px-2 py-2 font-mono text-[var(--admin-muted-2)]">#{d.id}</td>
                                            <td className="px-2 py-2 text-[var(--admin-muted-2)]">
                                                {d.dpi ? `${Math.round(d.dpi)}` : "—"}
                                            </td>
                                            <td className="px-2 py-2">
                                                <span
                                                    className="px-2 py-0.5 rounded-full text-xs font-medium"
                                                    style={{
                                                        background: `${STATUS_COLORS[d.status]}22`,
                                                        color: STATUS_COLORS[d.status],
                                                    }}
                                                >
                                                    {STATUS_LABEL[d.status] ?? d.status}
                                                </span>
                                            </td>
                                            <td className="px-2 py-2 text-[var(--admin-muted-2)]">
                                                {new Date(d.created_at).toLocaleDateString("fr-FR")}
                                            </td>
                                        </tr>
                                    ))}
                                    {(recentDesigns ?? []).length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="px-4 py-6 text-center text-[var(--admin-muted-2)]">
                                                Aucun design
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        )}
                    </CardContent>
                </Card>

                {/* Recent Orders */}
                <Card style={cardStyle}>
                    <CardHeader className="flex flex-row items-center justify-between pb-3">
                        <CardTitle className="text-sm font-medium text-white">Commandes récentes</CardTitle>
                        <Link
                            href="/admin/orders"
                            className="text-xs text-[var(--admin-accent)] hover:underline"
                        >
                            Voir tout →
                        </Link>
                    </CardHeader>
                    <CardContent className="p-0">
                        {loadingOrders ? (
                            <div className="p-4 space-y-2">
                                {Array.from({ length: 5 }).map((_, i) => (
                                    <Skeleton key={i} className="h-10 w-full" />
                                ))}
                            </div>
                        ) : (
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="border-b border-[var(--admin-border)]">
                                        <th className="text-left px-4 py-2 text-[var(--admin-muted-2)] font-medium">ID</th>
                                        <th className="text-left px-2 py-2 text-[var(--admin-muted-2)] font-medium">Design</th>
                                        <th className="text-left px-2 py-2 text-[var(--admin-muted-2)] font-medium">Statut</th>
                                        <th className="text-left px-2 py-2 text-[var(--admin-muted-2)] font-medium">Date</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(recentOrders ?? []).map((o) => (
                                        <tr
                                            key={o.id}
                                            className="border-b border-[var(--admin-border)] last:border-0 hover:bg-white/5"
                                        >
                                            <td className="px-4 py-2 font-mono text-[var(--admin-muted-2)]">#{o.id}</td>
                                            <td className="px-2 py-2 text-[var(--admin-muted-2)]">
                                                <Link
                                                    href={`/admin/designs/${o.design_id}`}
                                                    className="hover:text-white"
                                                >
                                                    #{o.design_id}
                                                </Link>
                                            </td>
                                            <td className="px-2 py-2">
                                                <span
                                                    className="px-2 py-0.5 rounded-full text-xs font-medium"
                                                    style={{
                                                        background: `${STATUS_COLORS[o.status]}22`,
                                                        color: STATUS_COLORS[o.status],
                                                    }}
                                                >
                                                    {STATUS_LABEL[o.status] ?? o.status}
                                                </span>
                                            </td>
                                            <td className="px-2 py-2 text-[var(--admin-muted-2)]">
                                                {new Date(o.created_at).toLocaleDateString("fr-FR")}
                                            </td>
                                        </tr>
                                    ))}
                                    {(recentOrders ?? []).length === 0 && (
                                        <tr>
                                            <td colSpan={4} className="px-4 py-6 text-center text-[var(--admin-muted-2)]">
                                                Aucune commande
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* ─── Charts ───────────────────────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card style={cardStyle}>
                    <CardHeader>
                        <CardTitle className="text-sm font-medium text-white">Commandes par statut</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <Skeleton className="h-40 w-full" />
                        ) : (
                            <ResponsiveContainer width="100%" height={160}>
                                <BarChart data={ordersChartData}>
                                    <XAxis dataKey="name" tick={{ fill: "var(--admin-muted-2)", fontSize: 11 }} axisLine={false} tickLine={false} />
                                    <YAxis tick={{ fill: "var(--admin-muted-2)", fontSize: 11 }} axisLine={false} tickLine={false} />
                                    <Tooltip contentStyle={tooltipStyle} />
                                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                                        {ordersChartData.map((entry) => (
                                            <Cell key={entry.name} fill={STATUS_COLORS[entry.name] ?? "#6B7280"} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </CardContent>
                </Card>

                <Card style={cardStyle}>
                    <CardHeader>
                        <CardTitle className="text-sm font-medium text-white">Designs par statut</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <Skeleton className="h-40 w-full" />
                        ) : (
                            <ResponsiveContainer width="100%" height={160}>
                                <BarChart data={designsChartData}>
                                    <XAxis dataKey="name" tick={{ fill: "var(--admin-muted-2)", fontSize: 11 }} axisLine={false} tickLine={false} />
                                    <YAxis tick={{ fill: "var(--admin-muted-2)", fontSize: 11 }} axisLine={false} tickLine={false} />
                                    <Tooltip contentStyle={tooltipStyle} />
                                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                                        {designsChartData.map((entry) => (
                                            <Cell key={entry.name} fill={STATUS_COLORS[entry.name] ?? "#6B7280"} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
