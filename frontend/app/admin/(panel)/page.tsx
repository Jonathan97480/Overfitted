"use client";
import { useGetStatsQuery } from "@/lib/adminEndpoints";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, ImageIcon, ShoppingCart, Euro } from "lucide-react";
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

export default function AdminDashboardPage() {
    const { data: stats, isLoading } = useGetStatsQuery();

    const kpis = [
        {
            label: "Utilisateurs",
            value: stats?.total_users ?? 0,
            icon: Users,
            color: "#3B82F6",
        },
        {
            label: "Designs",
            value: stats?.total_designs ?? 0,
            icon: ImageIcon,
            color: "#8B5CF6",
        },
        {
            label: "Commandes",
            value: stats?.total_orders ?? 0,
            icon: ShoppingCart,
            color: "#10B981",
        },
        {
            label: "Revenus",
            value: `${(stats?.total_revenue ?? 0).toFixed(2)} €`,
            icon: Euro,
            color: "var(--admin-accent)",
        },
    ];

    const ordersChartData = stats
        ? Object.entries(stats.orders_by_status).map(([status, count]) => ({
            name: status,
            count,
        }))
        : [];

    const designsChartData = stats
        ? Object.entries(stats.designs_by_status).map(([status, count]) => ({
            name: status,
            count,
        }))
        : [];

    return (
        <div className="space-y-6">
            {/* KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {kpis.map(({ label, value, icon: Icon, color }) => (
                    <Card
                        key={label}
                        style={{
                            background: "var(--admin-card)",
                            border: "1px solid var(--admin-border)",
                        }}
                    >
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium text-[var(--admin-muted-2)]">
                                {label}
                            </CardTitle>
                            <Icon size={16} style={{ color }} />
                        </CardHeader>
                        <CardContent>
                            {isLoading ? (
                                <Skeleton className="h-8 w-20" />
                            ) : (
                                <p className="text-2xl font-bold text-white">{value}</p>
                            )}
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card
                    style={{
                        background: "var(--admin-card)",
                        border: "1px solid var(--admin-border)",
                    }}
                >
                    <CardHeader>
                        <CardTitle className="text-sm font-medium text-white">
                            Commandes par statut
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <Skeleton className="h-40 w-full" />
                        ) : (
                            <ResponsiveContainer width="100%" height={160}>
                                <BarChart data={ordersChartData}>
                                    <XAxis
                                        dataKey="name"
                                        tick={{ fill: "var(--admin-muted-2)", fontSize: 11 }}
                                        axisLine={false}
                                        tickLine={false}
                                    />
                                    <YAxis
                                        tick={{ fill: "var(--admin-muted-2)", fontSize: 11 }}
                                        axisLine={false}
                                        tickLine={false}
                                    />
                                    <Tooltip
                                        contentStyle={{
                                            background: "var(--admin-sidebar)",
                                            border: "1px solid var(--admin-border)",
                                            borderRadius: 6,
                                            color: "white",
                                            fontSize: 12,
                                        }}
                                    />
                                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                                        {ordersChartData.map((entry) => (
                                            <Cell
                                                key={entry.name}
                                                fill={STATUS_COLORS[entry.name] ?? "#6B7280"}
                                            />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </CardContent>
                </Card>

                <Card
                    style={{
                        background: "var(--admin-card)",
                        border: "1px solid var(--admin-border)",
                    }}
                >
                    <CardHeader>
                        <CardTitle className="text-sm font-medium text-white">
                            Designs par statut
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <Skeleton className="h-40 w-full" />
                        ) : (
                            <ResponsiveContainer width="100%" height={160}>
                                <BarChart data={designsChartData}>
                                    <XAxis
                                        dataKey="name"
                                        tick={{ fill: "var(--admin-muted-2)", fontSize: 11 }}
                                        axisLine={false}
                                        tickLine={false}
                                    />
                                    <YAxis
                                        tick={{ fill: "var(--admin-muted-2)", fontSize: 11 }}
                                        axisLine={false}
                                        tickLine={false}
                                    />
                                    <Tooltip
                                        contentStyle={{
                                            background: "var(--admin-sidebar)",
                                            border: "1px solid var(--admin-border)",
                                            borderRadius: 6,
                                            color: "white",
                                            fontSize: 12,
                                        }}
                                    />
                                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                                        {designsChartData.map((entry) => (
                                            <Cell
                                                key={entry.name}
                                                fill={STATUS_COLORS[entry.name] ?? "#6B7280"}
                                            />
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
