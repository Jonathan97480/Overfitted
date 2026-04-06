"use client";
import { useGetStatsQuery } from "@/lib/adminEndpoints";
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
} from "recharts";

const COLORS = ["#6B7280", "#F59E0B", "#10B981", "#EF4444", "#3B82F6", "#8B5CF6"];

export default function AdminStatsPage() {
  const { data: stats, isLoading } = useGetStatsQuery();

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

  return (
    <div className="space-y-6">
      {/* Summary cards */}
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
              {isLoading || value === undefined ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <p className="text-2xl font-bold text-white">{value}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Pie commandes */}
        <Card
          style={{
            background: "var(--admin-card)",
            border: "1px solid var(--admin-border)",
          }}
        >
          <CardHeader>
            <CardTitle className="text-sm font-medium text-white">
              Répartition commandes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-48 w-full rounded-full mx-auto" style={{ borderRadius: "50%" }} />
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
                  <Tooltip
                    contentStyle={{
                      background: "var(--admin-sidebar)",
                      border: "1px solid var(--admin-border)",
                      borderRadius: 6,
                      color: "white",
                      fontSize: 12,
                    }}
                  />
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

        {/* Bar designs */}
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
                  <Tooltip
                    contentStyle={{
                      background: "var(--admin-sidebar)",
                      border: "1px solid var(--admin-border)",
                      borderRadius: 6,
                      color: "white",
                      fontSize: 12,
                    }}
                  />
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
    </div>
  );
}
