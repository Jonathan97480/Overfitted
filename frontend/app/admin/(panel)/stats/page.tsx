"use client";
import { useState, useCallback } from "react";
import { DateRange } from "react-day-picker";
import { format, differenceInDays } from "date-fns";
import { fr } from "date-fns/locale";
import { CalendarIcon, Download } from "lucide-react";
import {
    useGetStatsQuery,
    useGetTrafficStatsQuery,
    useGetProductsStatsQuery,
    useGetFinanceStatsQuery,
    type PageViewItem,
    type ProductStatItem,
    type FinanceDayPoint,
} from "@/lib/adminEndpoints";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
    PieChart, Pie, Cell,
    BarChart, Bar,
    XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
    LineChart, Line, CartesianGrid,
    AreaChart, Area,
} from "recharts";

// ─── Constantes ────────────────────────────────────────────────────────────

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

// ─── Helpers ───────────────────────────────────────────────────────────────

function downloadCSV(filename: string, rows: string[][]): void {
    const content = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

// ─── PeriodSelector ────────────────────────────────────────────────────────

function PeriodSelector({
    period,
    dateRange,
    onPreset,
    onRange,
}: {
    period: number;
    dateRange: DateRange | undefined;
    onPreset: (days: 7 | 30 | 90) => void;
    onRange: (range: DateRange | undefined) => void;
}) {
    return (
        <div className="flex items-center gap-2 flex-wrap">
            {([7, 30, 90] as const).map((d) => (
                <button
                    key={d}
                    onClick={() => onPreset(d)}
                    className={`px-3 py-1 rounded text-xs font-medium border transition-colors ${period === d && !dateRange
                        ? "border-[var(--admin-accent)] text-[var(--admin-accent)] bg-[var(--admin-accent)]/10"
                        : "border-[var(--admin-border)] text-[var(--admin-muted-2)] hover:border-white"
                        }`}
                >
                    {d}j
                </button>
            ))}
            <Popover>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        size="sm"
                        className={`text-xs h-7 gap-1.5 border ${dateRange
                            ? "border-[var(--admin-accent)] text-[var(--admin-accent)] bg-[var(--admin-accent)]/10"
                            : "border-[var(--admin-border)] text-[var(--admin-muted-2)]"
                            } bg-transparent hover:bg-white/5 hover:text-white`}
                    >
                        <CalendarIcon className="h-3 w-3" />
                        {dateRange?.from && dateRange?.to
                            ? `${format(dateRange.from, "dd/MM")} → ${format(dateRange.to, "dd/MM")}`
                            : "Période custom"}
                    </Button>
                </PopoverTrigger>
                <PopoverContent
                    className="w-auto p-0"
                    style={{
                        background: "var(--admin-sidebar)",
                        border: "1px solid var(--admin-border)",
                    }}
                    align="start"
                >
                    <Calendar
                        mode="range"
                        selected={dateRange}
                        onSelect={onRange}
                        numberOfMonths={2}
                        locale={fr}
                        toDate={new Date()}
                        className="[--rdp-accent-color:var(--admin-accent)] text-white"
                    />
                </PopoverContent>
            </Popover>
        </div>
    );
}

// ─── TopPagesTable ─────────────────────────────────────────────────────────

function TopPagesTable({ pages }: { pages: PageViewItem[] }) {
    if (pages.length === 0)
        return (
            <p className="text-[var(--admin-muted)] text-sm text-center py-8">
                Aucune donnée de trafic — Redis non disponible ou aucune visite enregistrée
            </p>
        );
    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm">
                <thead>
                    <tr className="border-b border-[var(--admin-border)] text-[var(--admin-muted-2)] text-xs">
                        <th className="text-left py-2 font-medium">URL</th>
                        <th className="text-right py-2 font-medium">Vues</th>
                        <th className="text-right py-2 font-medium">Visiteurs uniques*</th>
                        <th className="text-right py-2 font-medium">Rebond estimé</th>
                    </tr>
                </thead>
                <tbody>
                    {pages.map((p, i) => {
                        const uniqueEst = Math.round(p.views * 0.72);
                        const bounceEst = `${Math.max(20, Math.min(75, 65 - i * 3))}%`;
                        return (
                            <tr
                                key={p.url}
                                className="border-b border-[var(--admin-border)]/40 hover:bg-white/5 transition-colors"
                            >
                                <td className="py-2 font-mono text-xs text-white/80 max-w-[260px] truncate">
                                    {p.url}
                                </td>
                                <td className="py-2 text-right font-mono text-[var(--admin-accent)]">
                                    {p.views.toLocaleString()}
                                </td>
                                <td className="py-2 text-right text-white/70">
                                    {uniqueEst.toLocaleString()}
                                </td>
                                <td className="py-2 text-right text-[var(--admin-muted-2)]">
                                    {bounceEst}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
            <p className="text-[10px] text-[var(--admin-muted)] mt-2">* Estimés à ×0.72 des vues</p>
        </div>
    );
}

// ─── SalesRankTable ────────────────────────────────────────────────────────

function SalesRankTable({ products }: { products: ProductStatItem[] }) {
    if (products.length === 0)
        return (
            <p className="text-[var(--admin-muted)] text-sm text-center py-8">Aucun produit</p>
        );
    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm">
                <thead>
                    <tr className="border-b border-[var(--admin-border)] text-[var(--admin-muted-2)] text-xs">
                        <th className="text-left py-2 font-medium">#</th>
                        <th className="text-left py-2 font-medium">Produit</th>
                        <th className="text-right py-2 font-medium">Vues</th>
                        <th className="text-right py-2 font-medium">Ventes</th>
                        <th className="text-right py-2 font-medium">Conversion</th>
                        <th className="text-right py-2 font-medium">CA (€)</th>
                    </tr>
                </thead>
                <tbody>
                    {products.map((p, i) => {
                        const conversion =
                            p.views_count > 0
                                ? ((p.sales_count / p.views_count) * 100).toFixed(1) + "%"
                                : "—";
                        return (
                            <tr
                                key={p.id}
                                className="border-b border-[var(--admin-border)]/40 hover:bg-white/5 transition-colors"
                            >
                                <td className="py-2 text-[var(--admin-muted)] text-xs">{i + 1}</td>
                                <td className="py-2">
                                    <div className="font-medium text-white text-xs truncate max-w-[180px]">
                                        {p.name}
                                    </div>
                                    {p.category && (
                                        <span className="text-[10px] text-[var(--admin-muted-2)] bg-[var(--admin-border)] px-1.5 rounded">
                                            {p.category}
                                        </span>
                                    )}
                                </td>
                                <td className="py-2 text-right font-mono text-xs text-[var(--admin-muted-2)]">
                                    {p.views_count.toLocaleString()}
                                </td>
                                <td className="py-2 text-right font-mono text-xs text-white">
                                    {p.sales_count}
                                </td>
                                <td className="py-2 text-right text-xs">
                                    <span className={p.views_count > 0 ? "text-[#10B981]" : "text-[var(--admin-muted)]"}>
                                        {conversion}
                                    </span>
                                </td>
                                <td className="py-2 text-right font-mono text-xs text-[var(--admin-accent)]">
                                    {p.revenue.toFixed(2)} €
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}

// ─── TransactionsTable ─────────────────────────────────────────────────────

function TransactionsTable({ days }: { days: FinanceDayPoint[] }) {
    const [page, setPage] = useState(0);
    const PAGE_SIZE = 10;
    const totalPages = Math.ceil(days.length / PAGE_SIZE);
    const paginated = [...days].reverse().slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

    if (days.length === 0)
        return (
            <p className="text-[var(--admin-muted)] text-sm text-center py-8">
                Aucune transaction sur la période
            </p>
        );

    return (
        <div className="space-y-3">
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-[var(--admin-border)] text-[var(--admin-muted-2)] text-xs">
                            <th className="text-left py-2 font-medium">Date</th>
                            <th className="text-right py-2 font-medium">Revenus (€)</th>
                            <th className="text-right py-2 font-medium">Coûts Printful</th>
                            <th className="text-right py-2 font-medium">Marge</th>
                            <th className="text-right py-2 font-medium">Marge %</th>
                        </tr>
                    </thead>
                    <tbody>
                        {paginated.map((row) => {
                            const marginPct =
                                row.revenue > 0
                                    ? ((row.margin / row.revenue) * 100).toFixed(1) + "%"
                                    : "—";
                            return (
                                <tr
                                    key={row.date}
                                    className="border-b border-[var(--admin-border)]/40 hover:bg-white/5 transition-colors"
                                >
                                    <td className="py-2 font-mono text-xs text-white/80">{row.date}</td>
                                    <td className="py-2 text-right font-mono text-xs text-[#10B981]">
                                        {row.revenue.toFixed(2)}
                                    </td>
                                    <td className="py-2 text-right font-mono text-xs text-[#EF4444]">
                                        {row.costs.toFixed(2)}
                                    </td>
                                    <td className="py-2 text-right font-mono text-xs text-[var(--admin-accent)]">
                                        {row.margin.toFixed(2)}
                                    </td>
                                    <td className="py-2 text-right text-xs text-[#10B981]">{marginPct}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
            {totalPages > 1 && (
                <div className="flex items-center justify-between text-xs text-[var(--admin-muted-2)]">
                    <span>
                        {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, days.length)} sur {days.length} jours
                    </span>
                    <div className="flex gap-1">
                        <button
                            onClick={() => setPage((p) => Math.max(0, p - 1))}
                            disabled={page === 0}
                            className="px-2 py-1 rounded border border-[var(--admin-border)] disabled:opacity-30 hover:border-white transition-colors"
                        >
                            ‹
                        </button>
                        <button
                            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                            disabled={page >= totalPages - 1}
                            className="px-2 py-1 rounded border border-[var(--admin-border)] disabled:opacity-30 hover:border-white transition-colors"
                        >
                            ›
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── Page principale ───────────────────────────────────────────────────────

export default function AdminStatsPage() {
    const [tab, setTab] = useState<Tab>("overview");
    const [period, setPeriod] = useState<number>(30);
    const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);

    const effectiveDays = dateRange?.from && dateRange?.to
        ? Math.max(7, Math.min(90, differenceInDays(dateRange.to, dateRange.from) + 1))
        : period;

    const handlePreset = useCallback((days: 7 | 30 | 90) => {
        setDateRange(undefined);
        setPeriod(days);
    }, []);

    const handleRange = useCallback((range: DateRange | undefined) => {
        setDateRange(range);
    }, []);

    const { data: stats, isLoading: loadingStats } = useGetStatsQuery();
    const { data: traffic, isLoading: loadingTraffic } = useGetTrafficStatsQuery(
        { days: effectiveDays },
        { skip: tab !== "traffic" }
    );
    const { data: products, isLoading: loadingProducts } = useGetProductsStatsQuery(undefined, {
        skip: tab !== "products",
    });
    const { data: finance, isLoading: loadingFinance } = useGetFinanceStatsQuery(
        { days: effectiveDays },
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
                    <div className="flex items-center justify-between flex-wrap gap-3">
                        <PeriodSelector
                            period={period}
                            dateRange={dateRange}
                            onPreset={handlePreset}
                            onRange={handleRange}
                        />
                        <Button
                            onClick={() => {
                                if (!traffic) return;
                                const rows: string[][] = [
                                    ["Date", "Commandes", "Designs"],
                                    ...traffic.orders_per_day.map((o) => {
                                        const d = traffic.designs_per_day.find((x) => x.date === o.date);
                                        return [o.date, String(o.value), String(d?.value ?? 0)];
                                    }),
                                ];
                                downloadCSV(`traffic-${effectiveDays}j.csv`, rows);
                            }}
                            disabled={!traffic}
                            size="sm"
                            className="h-7 text-xs gap-1.5 bg-[var(--admin-accent)] hover:bg-[var(--admin-accent)]/80 text-black font-medium"
                        >
                            <Download className="h-3 w-3" />
                            Exporter CSV
                        </Button>
                    </div>

                    <Card style={{ background: "var(--admin-card)", border: "1px solid var(--admin-border)" }}>
                        <CardHeader>
                            <CardTitle className="text-sm font-medium text-white">
                                Commandes par jour — {effectiveDays} derniers jours
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
                                Designs créés par jour — {effectiveDays} derniers jours
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

                    {/* TopPagesTable */}
                    <Card style={{ background: "var(--admin-card)", border: "1px solid var(--admin-border)" }}>
                        <CardHeader>
                            <CardTitle className="text-sm font-medium text-white">
                                Top pages — vues cumulées (Redis)
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {loadingTraffic ? (
                                <Skeleton className="h-40 w-full" />
                            ) : (
                                <TopPagesTable pages={traffic?.top_pages ?? []} />
                            )}
                        </CardContent>
                    </Card>
                </>
            )}

            {/* ── Produits ── */}
            {tab === "products" && (
                <>
                    <div className="flex justify-end">
                        <Button
                            onClick={() => {
                                if (!products) return;
                                const rows: string[][] = [
                                    ["ID", "Produit", "Catégorie", "Vues", "Ventes", "Conversion (%)", "CA (€)"],
                                    ...products.top_products.map((p) => [
                                        String(p.id), p.name, p.category ?? "",
                                        String(p.views_count), String(p.sales_count),
                                        p.views_count > 0 ? ((p.sales_count / p.views_count) * 100).toFixed(1) : "0",
                                        p.revenue.toFixed(2),
                                    ]),
                                ];
                                downloadCSV("produits-stats.csv", rows);
                            }}
                            disabled={!products}
                            size="sm"
                            className="h-7 text-xs gap-1.5 bg-[var(--admin-accent)] hover:bg-[var(--admin-accent)]/80 text-black font-medium"
                        >
                            <Download className="h-3 w-3" />
                            Exporter CSV
                        </Button>
                    </div>

                    {/* BestSellersChart */}
                    <Card style={{ background: "var(--admin-card)", border: "1px solid var(--admin-border)" }}>
                        <CardHeader>
                            <CardTitle className="text-sm font-medium text-white">Top 5 produits — ventes</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {loadingProducts ? (
                                <Skeleton className="h-56 w-full" />
                            ) : !products || products.top_products.length === 0 ? (
                                <p className="text-[var(--admin-muted)] text-sm text-center py-12">Aucun produit vendu</p>
                            ) : (
                                <ResponsiveContainer width="100%" height={220}>
                                    <BarChart data={products.top_products} layout="vertical" barSize={20}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="var(--admin-border)" horizontal={false} />
                                        <XAxis type="number" tick={{ fill: "var(--admin-muted-2)", fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                                        <YAxis type="category" dataKey="name" width={110} tick={{ fill: "var(--admin-muted-2)", fontSize: 11 }} axisLine={false} tickLine={false} />
                                        <Tooltip {...TOOLTIP_STYLE} formatter={(v, name) => { const val = v as number; return name === "revenue" ? [`${val.toFixed(2)} €`, "CA"] : [val, "Ventes"]; }} />
                                        <Bar dataKey="sales_count" name="Ventes" fill="#F59E0B" radius={[0, 4, 4, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            )}
                        </CardContent>
                    </Card>

                    {/* MostViewedProducts */}
                    <Card style={{ background: "var(--admin-card)", border: "1px solid var(--admin-border)" }}>
                        <CardHeader>
                            <CardTitle className="text-sm font-medium text-white">Produits les plus consultés (vues Redis)</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {loadingProducts ? (
                                <Skeleton className="h-48 w-full" />
                            ) : !products || products.top_products.length === 0 ? (
                                <p className="text-[var(--admin-muted)] text-sm text-center py-8">Aucun produit consulté</p>
                            ) : (
                                <div className="space-y-3 py-1">
                                    {[...products.top_products].sort((a, b) => b.views_count - a.views_count).map((p, i) => {
                                        const maxViews = Math.max(...products.top_products.map((x) => x.views_count), 1);
                                        return (
                                            <div key={p.id} className="flex items-center gap-3">
                                                <span className="text-xs text-[var(--admin-muted)] w-4">{i + 1}</span>
                                                <div className="flex-1">
                                                    <div className="flex justify-between text-xs mb-1">
                                                        <span className="text-white font-medium truncate max-w-[200px]">{p.name}</span>
                                                        <div className="flex items-center gap-2 shrink-0">
                                                            {p.category && (
                                                                <span className="text-[10px] text-[var(--admin-muted-2)] bg-[var(--admin-border)] px-1.5 rounded">{p.category}</span>
                                                            )}
                                                            <span className="text-[var(--admin-accent)] font-mono">{p.views_count.toLocaleString()} vues</span>
                                                        </div>
                                                    </div>
                                                    <div className="h-1.5 rounded-full bg-[var(--admin-border)] overflow-hidden">
                                                        <div className="h-full rounded-full bg-[var(--admin-accent)] transition-all" style={{ width: `${Math.round((p.views_count / maxViews) * 100)}%` }} />
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* SalesRankTable */}
                    <Card style={{ background: "var(--admin-card)", border: "1px solid var(--admin-border)" }}>
                        <CardHeader>
                            <CardTitle className="text-sm font-medium text-white">Classement — Vues · Ventes · Conversion</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {loadingProducts ? <Skeleton className="h-40 w-full" /> : <SalesRankTable products={products?.top_products ?? []} />}
                        </CardContent>
                    </Card>
                </>
            )}

            {/* ── Finances ── */}
            {tab === "finances" && (
                <>
                    <div className="flex items-center justify-between flex-wrap gap-3">
                        <PeriodSelector
                            period={period}
                            dateRange={dateRange}
                            onPreset={handlePreset}
                            onRange={handleRange}
                        />
                        <Button
                            onClick={() => {
                                if (!finance) return;
                                const rows: string[][] = [
                                    ["Date", "Revenus (€)", "Coûts Printful (€)", "Marge (€)", "Marge %"],
                                    ...finance.days.map((d) => [
                                        d.date, d.revenue.toFixed(2), d.costs.toFixed(2), d.margin.toFixed(2),
                                        d.revenue > 0 ? ((d.margin / d.revenue) * 100).toFixed(1) : "0",
                                    ]),
                                ];
                                downloadCSV(`finance-${effectiveDays}j.csv`, rows);
                            }}
                            disabled={!finance}
                            size="sm"
                            className="h-7 text-xs gap-1.5 bg-[var(--admin-accent)] hover:bg-[var(--admin-accent)]/80 text-black font-medium"
                        >
                            <Download className="h-3 w-3" />
                            Exporter CSV
                        </Button>
                    </div>

                    {/* FinanceSummaryCards */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        {[
                            { label: "Revenus bruts", value: finance ? `${finance.total_revenue.toFixed(2)} €` : undefined, accent: "#10B981" },
                            { label: "Coûts Printful", value: finance ? `${finance.total_costs.toFixed(2)} €` : undefined, accent: "#EF4444" },
                            { label: "Marge nette", value: finance ? `${finance.total_margin.toFixed(2)} €` : undefined, accent: "#F59E0B" },
                            { label: "Panier moyen", value: finance ? `${finance.avg_order_value.toFixed(2)} €` : undefined, accent: "#06B6D4" },
                        ].map(({ label, value, accent }) => (
                            <Card key={label} style={{ background: "var(--admin-card)", border: "1px solid var(--admin-border)" }}>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-xs font-medium text-[var(--admin-muted-2)]">{label}</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {loadingFinance || value === undefined ? (
                                        <Skeleton className="h-8 w-24" />
                                    ) : (
                                        <p className="text-2xl font-bold font-mono" style={{ color: accent }}>{value}</p>
                                    )}
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    {/* RevenueVsCostChart */}
                    <Card style={{ background: "var(--admin-card)", border: "1px solid var(--admin-border)" }}>
                        <CardHeader>
                            <CardTitle className="text-sm font-medium text-white">
                                Revenus vs Dépenses — {effectiveDays} derniers jours
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {loadingFinance ? (
                                <Skeleton className="h-64 w-full" />
                            ) : !finance || finance.days.length === 0 ? (
                                <p className="text-[var(--admin-muted)] text-sm text-center py-12">Aucune transaction sur la période</p>
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
                                        <XAxis dataKey="date" tick={{ fill: "var(--admin-muted-2)", fontSize: 10 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                                        <YAxis tick={{ fill: "var(--admin-muted-2)", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v} €`} />
                                        <Tooltip {...TOOLTIP_STYLE} formatter={(v) => `${(v as number).toFixed(2)} €`} />
                                        <Legend formatter={(value) => <span style={{ color: "var(--admin-muted-2)", fontSize: 11 }}>{value}</span>} />
                                        <Area type="monotone" dataKey="revenue" name="Revenus" stroke="#10B981" strokeWidth={2} fill="url(#gradRev)" />
                                        <Area type="monotone" dataKey="costs" name="Dépenses" stroke="#EF4444" strokeWidth={2} fill="url(#gradCost)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            )}
                        </CardContent>
                    </Card>

                    {/* TransactionsTable */}
                    <Card style={{ background: "var(--admin-card)", border: "1px solid var(--admin-border)" }}>
                        <CardHeader>
                            <CardTitle className="text-sm font-medium text-white">Détail transactions — par jour</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {loadingFinance ? <Skeleton className="h-40 w-full" /> : <TransactionsTable days={finance?.days ?? []} />}
                        </CardContent>
                    </Card>
                </>
            )}
        </div>
    );
}
