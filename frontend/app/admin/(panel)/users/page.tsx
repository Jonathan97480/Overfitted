"use client";
import { useState, useMemo } from "react";
import {
    useListUsersQuery,
    useDeleteUserMutation,
    useGetUserStatsQuery,
    type UserOut,
} from "@/lib/adminEndpoints";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Trash2, ChevronRight, Search } from "lucide-react";

const STATUS_COLOR_DESIGN: Record<string, string> = {
    pending: "#6B7280",
    processing: "#F59E0B",
    ready: "#10B981",
    failed: "#EF4444",
};

const STATUS_COLOR_ORDER: Record<string, string> = {
    pending: "#6B7280",
    paid: "#10B981",
    submitted: "#3B82F6",
    shipped: "#8B5CF6",
    cancelled: "#EF4444",
};

function UserDetailPanel({
    user,
    onDelete,
}: {
    user: UserOut;
    onDelete: () => void;
}) {
    const { data: stats, isLoading } = useGetUserStatsQuery(user.id);

    return (
        <div className="mt-4 space-y-5 overflow-y-auto pb-4">
            {/* Avatar + infos */}
            <div className="flex items-center gap-4">
                <Avatar className="w-14 h-14">
                    <AvatarFallback
                        style={{ background: "var(--admin-accent)" }}
                        className="text-black text-xl font-bold"
                    >
                        {user.username[0]?.toUpperCase()}
                    </AvatarFallback>
                </Avatar>
                <div>
                    <p className="text-white font-semibold">{user.username}</p>
                    <p className="text-[var(--admin-muted-2)] text-sm">{user.email}</p>
                    <p className="text-[var(--admin-muted)] text-xs mt-0.5">#{user.id}</p>
                </div>
            </div>

            {/* KPIs */}
            {isLoading ? (
                <div className="grid grid-cols-3 gap-2">
                    {Array.from({ length: 3 }).map((_, i) => (
                        <Skeleton key={i} className="h-14 rounded-lg" />
                    ))}
                </div>
            ) : stats ? (
                <div className="grid grid-cols-3 gap-2">
                    {[
                        { label: "Designs", value: stats.designs_count },
                        { label: "Commandes", value: stats.orders_count },
                        { label: "Payées", value: stats.orders_paid_count, accent: "#10B981" },
                    ].map(({ label, value, accent }) => (
                        <div
                            key={label}
                            className="rounded-lg p-3 text-center"
                            style={{ background: "var(--admin-sidebar)", border: "1px solid var(--admin-border)" }}
                        >
                            <p className="text-xl font-bold font-mono" style={{ color: accent ?? "white" }}>
                                {value}
                            </p>
                            <p className="text-[9px] text-[var(--admin-muted-2)] mt-0.5 uppercase tracking-wide">
                                {label}
                            </p>
                        </div>
                    ))}
                </div>
            ) : null}

            {/* Designs récents */}
            {isLoading ? (
                <Skeleton className="h-24 w-full" />
            ) : stats && stats.designs.length > 0 ? (
                <div>
                    <p className="text-xs text-[var(--admin-muted-2)] uppercase tracking-wide mb-2">
                        Designs récents
                    </p>
                    <div className="space-y-1">
                        {stats.designs.map((d) => (
                            <div
                                key={d.id}
                                className="flex items-center justify-between py-1.5 px-3 rounded"
                                style={{ background: "var(--admin-sidebar)" }}
                            >
                                <span className="text-[var(--admin-muted-2)] font-mono text-xs">
                                    #{d.id}
                                </span>
                                <span
                                    className="text-xs px-2 py-0.5 rounded font-semibold"
                                    style={{
                                        color: STATUS_COLOR_DESIGN[d.status] ?? "#fff",
                                        background: `${STATUS_COLOR_DESIGN[d.status] ?? "#fff"}22`,
                                    }}
                                >
                                    {d.status}
                                </span>
                                <span className="text-[var(--admin-muted)] text-xs">
                                    {new Date(d.created_at).toLocaleDateString("fr-FR")}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            ) : null}

            {/* Commandes récentes */}
            {isLoading ? (
                <Skeleton className="h-24 w-full" />
            ) : stats && stats.orders.length > 0 ? (
                <div>
                    <p className="text-xs text-[var(--admin-muted-2)] uppercase tracking-wide mb-2">
                        Commandes récentes
                    </p>
                    <div className="space-y-1">
                        {stats.orders.map((o) => (
                            <div
                                key={o.id}
                                className="flex items-center justify-between py-1.5 px-3 rounded"
                                style={{ background: "var(--admin-sidebar)" }}
                            >
                                <span className="text-[var(--admin-muted-2)] font-mono text-xs">
                                    #{o.id}
                                </span>
                                <span
                                    className="text-xs px-2 py-0.5 rounded font-semibold"
                                    style={{
                                        color: STATUS_COLOR_ORDER[o.status] ?? "#fff",
                                        background: `${STATUS_COLOR_ORDER[o.status] ?? "#fff"}22`,
                                    }}
                                >
                                    {o.status}
                                </span>
                                <span className="text-[var(--admin-muted)] text-xs">
                                    {new Date(o.created_at).toLocaleDateString("fr-FR")}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            ) : null}

            {/* Supprimer */}
            <button
                onClick={onDelete}
                className="w-full py-2 rounded-md text-sm font-semibold text-red-400 border border-red-400/30 hover:bg-red-400/10 transition mt-2"
            >
                Supprimer le compte
            </button>
        </div>
    );
}

export default function AdminUsersPage() {
    const { data: users, isLoading } = useListUsersQuery({});
    const [deleteUser] = useDeleteUserMutation();
    const [selected, setSelected] = useState<UserOut | null>(null);
    const [search, setSearch] = useState("");

    const filtered = useMemo(() => {
        if (!users) return [];
        if (!search) return users;
        const q = search.toLowerCase();
        return users.filter(
            (u) =>
                u.email.toLowerCase().includes(q) ||
                u.username.toLowerCase().includes(q) ||
                String(u.id).includes(q)
        );
    }, [users, search]);

    return (
        <>
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
                    className="px-4 py-3 flex items-center gap-3"
                >
                    <div className="relative w-full sm:w-72">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--admin-muted-2)]" />
                        <Input
                            placeholder="Rechercher par email, username…"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-8 h-8 text-sm bg-[var(--admin-sidebar)] border-[var(--admin-border)] text-white placeholder:text-[var(--admin-muted)]"
                        />
                    </div>
                    <span className="text-xs text-[var(--admin-muted)] ml-auto">
                        {filtered.length} utilisateur{filtered.length !== 1 ? "s" : ""}
                    </span>
                </div>

                <Table>
                    <TableHeader>
                        <TableRow style={{ borderColor: "var(--admin-border)" }}>
                            <TableHead className="text-[var(--admin-muted-2)]">ID</TableHead>
                            <TableHead className="text-[var(--admin-muted-2)]">Utilisateur</TableHead>
                            <TableHead className="text-[var(--admin-muted-2)]">Email</TableHead>
                            <TableHead className="text-[var(--admin-muted-2)]" />
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading
                            ? Array.from({ length: 5 }).map((_, i) => (
                                <TableRow key={i} style={{ borderColor: "var(--admin-border)" }}>
                                    {Array.from({ length: 4 }).map((_, j) => (
                                        <TableCell key={j}>
                                            <Skeleton className="h-4 w-full" />
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                            : filtered.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center py-12 text-[var(--admin-muted)] text-sm">
                                        {search ? "Aucun utilisateur ne correspond." : "Aucun utilisateur."}
                                    </TableCell>
                                </TableRow>
                            ) : filtered.map((user) => (
                                <TableRow
                                    key={user.id}
                                    style={{ borderColor: "var(--admin-border)" }}
                                    className="hover:bg-white/5 transition-colors cursor-pointer"
                                    onClick={() => setSelected(user)}
                                >
                                    <TableCell className="text-[var(--admin-muted-2)] font-mono text-xs">
                                        #{user.id}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <Avatar className="w-6 h-6">
                                                <AvatarFallback
                                                    style={{ background: "var(--admin-accent)" }}
                                                    className="text-black text-[10px] font-bold"
                                                >
                                                    {user.username[0]?.toUpperCase()}
                                                </AvatarFallback>
                                            </Avatar>
                                            <span className="text-white text-sm">{user.username}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-[var(--admin-muted-2)] text-sm">
                                        {user.email}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2 justify-end">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (confirm(`Supprimer l'utilisateur "${user.username}" ?`))
                                                        deleteUser(user.id);
                                                }}
                                                className="text-[var(--admin-muted)] hover:text-red-400 transition-colors"
                                            >
                                                <Trash2 size={13} />
                                            </button>
                                            <ChevronRight size={14} className="text-[var(--admin-muted)]" />
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                    </TableBody>
                </Table>
            </div>

            {/* Slide-over */}
            <Sheet open={!!selected} onOpenChange={() => setSelected(null)}>
                <SheetContent
                    style={{
                        background: "var(--admin-card)",
                        border: "1px solid var(--admin-border)",
                    }}
                    className="text-white w-[400px] sm:w-[480px]"
                >
                    <SheetHeader>
                        <SheetTitle className="text-white text-base">
                            Profil utilisateur
                        </SheetTitle>
                    </SheetHeader>
                    {selected && (
                        <UserDetailPanel
                            user={selected}
                            onDelete={() => {
                                if (confirm(`Supprimer l'utilisateur "${selected.username}" ? Cette action est irréversible.`)) {
                                    deleteUser(selected.id);
                                    setSelected(null);
                                }
                            }}
                        />
                    )}
                </SheetContent>
            </Sheet>
        </>
    );
}
