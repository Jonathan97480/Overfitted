"use client";
import { useState } from "react";
import {
    useGetStatsQuery,
    useGetTrafficStatsQuery,
    useGetProductsStatsQuery,
    useGetFinanceStatsQuery,
} from "@/lib/adminEndpoints";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
    PieChart,
    Pie,
    Cell,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    Legend,
    LineChart,
    Line,
    CartesianGrid,
    AreaChart,
    Area,
} from "recharts";

const COLORS = ["#6B7280", "#F59E0B", "#10B981", "#EF4444", "#3B82F6", "#8B5CF6"];

const TOOLTIP_STYLE = {
    contentStyle: {
        background: "var(--admin-sidebar)",
        border: "1px solid var(--admin-border)",
        borderRadius: 6,
        color: "white",
        fontSize: 12,
    },
};

type Tab = "overview" | "traffic" | "products" | "finances";

export default function AdminStatsPage() {
    const [tab, setTab] = useState<Tab>("overview");
    const [period, setPeriod] = useState<7 | 30 | 90>(30);

    const { data: stats, isLoading: loadingStats } = useGetStatsQuery();
    const { data: traffic, isLoading: loadingTraffic } = useGetTrafficStatsQuery(
        { days: period },
        { skip: tab !== "traffic" }
    );
    const { data: products, isLoading: loadingProducts } = useGetProductsStatsQuery(undefined, {
        skip: tab !== "products",
    });
    const { data: finance, isLoading: loadingFinance } = useGetFinanceStatsQuery(
        { days: period },
        { skip: tab !== "finances" }
    );

    const ordersPie = stats
        ? Object.entries(stats.orders_by_status)
            .filter(([, v]) => v > 0)
            .map(([name, value], i) => ({ name, value, fill: COLORS[i % COLORS.length] }))
        : [];

    const designsBar = stats
        ? Object.entries(stats.designs_by_status).map(([name, value], i) => ({
            name,
            value,
            fill: COLORS[i % COLORS.length],
        }))
        : [];

    const tabs: { id: Tab; label: string }[] = [
        { id: "overview", label: "Vue d'ensemble" },
        { id: "traffic", label: "Trafic" },
        { id: "products", label: "Produits" },
        { id: "finances", label: "Finances" },
    ];

    return (
        <div className="space-y-6">
            {/* Sub-nav */}
            <div className="flex gap-1 border-b border-[var(--admin-border)] pb-0">
                {tabs.map((t) => (
                    <button
                        key={t.id}
                        onClick={() => setTab(t.id)}
                        className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${tab === t.id
                                ? "border-[var(--admin-accent)] text-[var(--admin-accent)]"
                                : "border-transparent text-[var(--admin-muted-2)] hover:text-white"
                            }`}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            {/* ── Vue d'ensemble ── */}
            {tab === "overview" && (
                <>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        {[
                            { label: "Utilisateurs totaux", value: stats?.total_users },
                            { label: "Designs totaux", value: stats?.total_designs },
                            { label: "Commandes totales", value: stats?.total_orders },
                            {
                                label: "CA généré",
                                value: stats ? `${stats.total_revenue.toFixed(2)} €` : undefined,
                            },
                        ].map(({ label, value }) => (
                            <Card
                                key={label}
                                style={{
                                    background: "var(--admin-card)",
                                    border: "1px solid var(--admin-border)",
                                }}
                            >
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-xs font-medium text-[var(--admin-muted-2)]">
                                        {label}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {loadingStats || value === undefined ? (
                                        <Skeleton className="h-8 w-16" />
                                    ) : (
                                        <p className="text-2xl font-bold text-white">{value}</p>
                                    )}
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <Card style={{ background: "var(--admin-card)", border: "1px solid var(--admin-border)" }}>
                            <CardHeader>
                                <CardTitle className="text-sm font-medium text-white">
                                    Répartition commandes
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {loadingStats ? (
                                    <Skeleton className="h-48 w-full mx-auto" style={{ borderRadius: "50%" }} />
                                ) : ordersPie.length === 0 ? (
                                    <p className="text-[var(--admin-muted)] text-sm text-center py-8">
                                        Aucune commande
                                    </p>
                                ) : (
                                    <ResponsiveContainer width="100%" height={200}>
                                        <PieChart>
                                            <Pie
                                                data={ordersPie}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={55}
                                                outerRadius={85}
                                                paddingAngle={3}
                                                dataKey="value"
                                            >
                                                {ordersPie.map((entry, index) => (
                                                    <Cell key={index} fill={entry.fill} />
                                                ))}
                                            </Pie>
                                            <Tooltip {...TOOLTIP_STYLE} />
                                            <Legend
                                                formatter={(value) => (
                                                    <span style={{ color: "var(--admin-muted-2)", fontSize: 11 }}>
                                                        {value}
                                                    </span>
                                                )}
                                            />
                                        </PieChart>
                                    </ResponsiveContainer>
                                )}
                            </CardContent>
                        </Card>

                        <Card style={{ background: "var(--admin-card)", border: "1px solid var(--admin-border)" }}>
                            <CardHeader>
                                <CardTitle className="text-sm font-medium text-white">
                                    Designs par statut
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {loadingStats ? (
                                    <Skeleton className="h-48 w-full" />
                                ) : (
                                    <ResponsiveContainer width="100%" height={200}>
                                        <BarChart data={designsBar} barSize={32}>
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
                                            <Tooltip {...TOOLTIP_STYLE} />
                                            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                                                {designsBar.map((entry, i) => (
                                                    <Cell key={i} fill={entry.fill} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </>
            )}

            {/* ── Trafic ── */}
            {tab === "traffic" && (
                <>
                    <div className="flex gap-2">
                        {([7, 30, 90] as const).map((d) => (
                            <button
                                key={d}
                                onClick={() => setPeriod(d)}
                                className={`px-3 py-1 rounded text-xs font-medium border transition-colors ${period === d
                                        ? "border-[var(--admin-accent)] text-[var(--admin-accent)] bg-[var(--admin-accent)]/10"
                                        : "border-[var(--admin-border)] text-[var(--admin-muted-2)] hover:border-white"
                                    }`}
                            >
                                {d}j
                            </button>
                        ))}
                    </div>

                    <Card style={{ background: "var(--admin-card)", border: "1px solid var(--admin-border)" }}>
                        <CardHeader>
                            <CardTitle className="text-sm font-medium text-white">
                                Commandes par jour — {period} derniers jours
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {loadingTraffic ? (
                                <Skeleton className="h-56 w-full" />
                            ) : !traffic || traffic.orders_per_day.length === 0 ? (
                                <p className="text-[var(--admin-muted)] text-sm text-center py-12">
                                    Aucune donnée sur la période
                                </p>
                            ) : (
                                <ResponsiveContainer width="100%" height={220}>
                                    <LineChart data={traffic.orders_per_day}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="var(--admin-border)" />
                                        <XAxis
                                            dataKey="date"
                                            tick={{ fill: "var(--admin-muted-2)", fontSize: 10 }}
                                            axisLine={false}
                                            tickLine={false}
                                            interval="preserveStartEnd"
                                        />
                                        <YAxis
                                            tick={{ fill: "var(--admin-muted-2)", fontSize: 11 }}
                                            axisLine={false}
                                            tickLine={false}
                                            allowDecimals={false}
                                        />
                                        <Tooltip {...TOOLTIP_STYLE} />
                                        <Line
                                            type="monotone"
                                            dataKey="value"
                                            name="Commandes"
                                            stroke="#F59E0B"
                                            strokeWidth={2}
                                            dot={false}
                                            activeDot={{ r: 4, fill: "#F59E0B" }}
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            )}
                        </CardContent>
                    </Card>

                    <Card style={{ background: "var(--admin-card)", border: "1px solid var(--admin-border)" }}>
                        <CardHeader>
                            <CardTitle className="text-sm font-medium text-white">
                                Designs créés par jour — {period} derniers jours
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {loadingTraffic ? (
                                <Skeleton className="h-56 w-full" />
                            ) : !traffic || traffic.designs_per_day.length === 0 ? (
                                <p className="text-[var(--admin-muted)] text-sm text-center py-12">
                                    Aucune donnée sur la période
                                </p>
                            ) : (
                                <ResponsiveContainer width="100%" height={220}>
                                    <LineChart data={traffic.designs_per_day}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="var(--admin-border)" />
                                        <XAxis
                                            dataKey="date"
                                            tick={{ fill: "var(--admin-muted-2)", fontSize: 10 }}
                                            axisLine={false}
                                            tickLine={false}
                                            interval="preserveStartEnd"
                                        />
                                        <YAxis
                                            tick={{ fill: "var(--admin-muted-2)", fontSize: 11 }}
                                            axisLine={false}
                                            tickLine={false}
                                            allowDecimals={false}
                                        />
                                        <Tooltip {...TOOLTIP_STYLE} />
                                        <Line
                                            type="monotone"
                                            dataKey="value"
                                            name="Designs"
                                            stroke="#06B6D4"
                                            strokeWidth={2}
                                            dot={false}
                                            activeDot={{ r: 4, fill: "#06B6D4" }}
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            )}
                        </CardContent>
                    </Card>
                </>
            )}

            {/* ── Produits ── */}
            {tab === "products" && (
                <>
                    <Card style={{ background: "var(--admin-card)", border: "1px solid var(--admin-border)" }}>
                        <CardHeader>
                            <CardTitle className="text-sm font-medium text-white">
                                Top 5 produits — ventes
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {loadingProducts ? (
                                <Skeleton className="h-56 w-full" />
                            ) : !products || products.top_products.length === 0 ? (
                                <p className="text-[var(--admin-muted)] text-sm text-center py-12">
                                    Aucun produit vendu
                                </p>
                            ) : (
                                <ResponsiveContainer width="100%" height={220}>
                                    <BarChart
                                        data={products.top_products}
                                        layout="vertical"
                                        barSize={20}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" stroke="var(--admin-border)" horizontal={false} />
                                        <XAxis
                                            type="number"
                                            tick={{ fill: "var(--admin-muted-2)", fontSize: 11 }}
                                            axisLine={false}
                                            tickLine={false}
                                            allowDecimals={false}
                                        />
                                        <YAxis
                                            type="category"
                                            dataKey="name"
                                            width={110}
                                            tick={{ fill: "var(--admin-muted-2)", fontSize: 11 }}
                                            axisLine={false}
                                            tickLine={false}
                                        />
                                        <Tooltip
                                            {...TOOLTIP_STYLE}
                                            formatter={(v, name) => {
                                                const val = v as number;
                                                return name === "revenue" ? [`${val.toFixed(2)} €`, "CA"] : [val, "Ventes"];
                                            }}
                                        />
                                        <Bar dataKey="sales_count" name="Ventes" fill="#F59E0B" radius={[0, 4, 4, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            )}
                        </CardContent>
                    </Card>

                    <Card style={{ background: "var(--admin-card)", border: "1px solid var(--admin-border)" }}>
                        <CardHeader>
                            <CardTitle className="text-sm font-medium text-white">
                                CA par produit (€)
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {loadingProducts ? (
                                <Skeleton className="h-56 w-full" />
                            ) : !products || products.top_products.length === 0 ? (
                                <p className="text-[var(--admin-muted)] text-sm text-center py-12">
                                    Aucun produit vendu
                                </p>
                            ) : (
                                <div className="space-y-3 py-2">
                                    {products.top_products.map((p, i) => (
                                        <div key={p.id} className="flex items-center gap-3">
                                            <span className="text-xs text-[var(--admin-muted)] w-4">{i + 1}</span>
                                            <div className="flex-1">
                                                <div className="flex justify-between text-xs mb-1">
                                                    <span className="text-white font-medium truncate max-w-[160px]">{p.name}</span>
                                                    <span className="text-[var(--admin-accent)] font-mono">{p.revenue.toFixed(2)} €</span>
                                                </div>
                                                <div className="h-1.5 rounded-full bg-[var(--admin-border)] overflow-hidden">
                                                    <div
                                                        className="h-full rounded-full bg-[var(--admin-accent)] transition-all"
                                                        style={{
                                                            width: `${Math.round(
                                                                (p.revenue /
                                                                    Math.max(
                                                                        ...products.top_products.map((x) => x.revenue),
                                                                        1
                                                                    )) *
                                                                100
                                                            )}%`,
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </>
            )}

            {/* ── Finances ── */}
            {tab === "finances" && (
                <>
                    <div className="flex gap-2">
                        {([7, 30, 90] as const).map((d) => (
                            <button
                                key={d}
                                onClick={() => setPeriod(d)}
                                className={`px-3 py-1 rounded text-xs font-medium border transition-colors ${period === d
                                        ? "border-[var(--admin-accent)] text-[var(--admin-accent)] bg-[var(--admin-accent)]/10"
                                        : "border-[var(--admin-border)] text-[var(--admin-muted-2)] hover:border-white"
                                    }`}
                            >
                                {d}j
                            </button>
                        ))}
                    </div>

                    {/* KPIs finance */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        {[
                            { label: "Revenus bruts", value: finance ? `${finance.total_revenue.toFixed(2)} €` : undefined, accent: "#10B981" },
                            { label: "Coûts Printful", value: finance ? `${finance.total_costs.toFixed(2)} €` : undefined, accent: "#EF4444" },
                            { label: "Marge nette", value: finance ? `${finance.total_margin.toFixed(2)} €` : undefined, accent: "#F59E0B" },
                            { label: "Panier moyen", value: finance ? `${finance.avg_order_value.toFixed(2)} €` : undefined, accent: "#06B6D4" },
                        ].map(({ label, value, accent }) => (
                            <Card key={label} style={{ background: "var(--admin-card)", border: "1px solid var(--admin-border)" }}>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-xs font-medium text-[var(--admin-muted-2)]">
                                        {label}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {loadingFinance || value === undefined ? (
                                        <Skeleton className="h-8 w-24" />
                                    ) : (
                                        <p className="text-2xl font-bold font-mono" style={{ color: accent }}>
                                            {value}
                                        </p>
                                    )}
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    <Card style={{ background: "var(--admin-card)", border: "1px solid var(--admin-border)" }}>
                        <CardHeader>
                            <CardTitle className="text-sm font-medium text-white">
                                Revenus vs Dépenses — {period} derniers jours
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {loadingFinance ? (
                                <Skeleton className="h-64 w-full" />
                            ) : !finance || finance.days.length === 0 ? (
                                <p className="text-[var(--admin-muted)] text-sm text-center py-12">
                                    Aucune transaction sur la période
                                </p>
                            ) : (
                                <ResponsiveContainer width="100%" height={260}>
                                    <AreaChart data={finance.days}>
                                        <defs>
                                            <linearGradient id="gradRev" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                                            </linearGradient>
                                            <linearGradient id="gradCost" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#EF4444" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="var(--admin-border)" />
                                        <XAxis
                                            dataKey="date"
                                            tick={{ fill: "var(--admin-muted-2)", fontSize: 10 }}
                                            axisLine={false}
                                            tickLine={false}
                                            interval="preserveStartEnd"
                                        />
                                        <YAxis
                                            tick={{ fill: "var(--admin-muted-2)", fontSize: 11 }}
                                            axisLine={false}
                                            tickLine={false}
                                            tickFormatter={(v) => `${v} €`}
                                        />
                                        <Tooltip
                                            {...TOOLTIP_STYLE}
                                            formatter={(v) => `${(v as number).toFixed(2)} €`}
                                        />
                                        <Legend
                                            formatter={(value) => (
                                                <span style={{ color: "var(--admin-muted-2)", fontSize: 11 }}>
                                                    {value}
                                                </span>
                                            )}
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey="revenue"
                                            name="Revenus"
                                            stroke="#10B981"
                                            strokeWidth={2}
                                            fill="url(#gradRev)"
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey="costs"
                                            name="Dépenses"
                                            stroke="#EF4444"
                                            strokeWidth={2}
                                            fill="url(#gradCost)"
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            )}
                        </CardContent>
                    </Card>
                </>
            )}
        </div>
    );
}
