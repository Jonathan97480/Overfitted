"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
    CheckCircle2,
    Circle,
    Clock,
    ExternalLink,
    FileText,
    Package,
    Printer,
    Truck,
    X,
} from "lucide-react";
import { AppHeader } from "@/components/public/AppHeader";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import {
    useGetMeQuery,
    useGetMyOrdersQuery,
    useGetOrderDetailQuery,
    type OrderDetail,
    type OrderStatus,
    type UserOrder,
} from "@/lib/publicApi";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number) {
    return n.toLocaleString("fr-FR", { style: "currency", currency: "EUR" });
}

function fmtDate(iso: string) {
    return new Date(iso).toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });
}

// ─── OrderStatusBadge ─────────────────────────────────────────────────────────

const STATUS_LABEL: Record<OrderStatus, string> = {
    pending: "En attente",
    paid: "Payé",
    submitted: "Soumis",
    shipped: "Expédié",
    cancelled: "Annulé",
};

const STATUS_COLOR: Record<OrderStatus, string> = {
    pending: "text-blue-400 bg-blue-400/10 border-blue-400/30",
    paid: "text-cyan-400 bg-cyan-400/10 border-cyan-400/30",
    submitted: "text-yellow-400 bg-yellow-400/10 border-yellow-400/30",
    shipped: "text-green-400 bg-green-400/10 border-green-400/30",
    cancelled: "text-red-400 bg-red-400/10 border-red-400/30",
};

function OrderStatusBadge({ status }: { status: OrderStatus }) {
    return (
        <span
            className={`inline-flex items-center px-2 py-0.5 text-xs font-medium border rounded-full ${STATUS_COLOR[status]}`}
        >
            {STATUS_LABEL[status]}
        </span>
    );
}

// ─── Timeline ─────────────────────────────────────────────────────────────────

interface TimelineStep {
    label: string;
    icon: React.ReactNode;
    activeOnStatus: OrderStatus[];
}

const TIMELINE_STEPS: TimelineStep[] = [
    {
        label: "Paiement reçu",
        icon: <CheckCircle2 className="w-5 h-5" />,
        activeOnStatus: ["paid", "submitted", "shipped"],
    },
    {
        label: "Préparation",
        icon: <Clock className="w-5 h-5" />,
        activeOnStatus: ["paid", "submitted", "shipped"],
    },
    {
        label: "Envoyé chez Printful",
        icon: <Printer className="w-5 h-5" />,
        activeOnStatus: ["submitted", "shipped"],
    },
    {
        label: "En production",
        icon: <Package className="w-5 h-5" />,
        activeOnStatus: ["submitted", "shipped"],
    },
    {
        label: "Expédié",
        icon: <Truck className="w-5 h-5" />,
        activeOnStatus: ["shipped"],
    },
    {
        label: "Livré",
        icon: <CheckCircle2 className="w-5 h-5" />,
        activeOnStatus: [],
    },
];

function OrderTimeline({ status }: { status: OrderStatus }) {
    return (
        <ol className="relative ml-3">
            {TIMELINE_STEPS.map((step, i) => {
                const active = step.activeOnStatus.includes(status);
                return (
                    <li key={i} className="flex gap-4 pb-6 last:pb-0">
                        {/* Line connector */}
                        <div className="flex flex-col items-center">
                            <div
                                className={`flex items-center justify-center w-8 h-8 rounded-full border ${active
                                    ? "border-[#00F0FF] text-[#00F0FF] bg-[#00F0FF]/10"
                                    : "border-[#1E293B] text-[#334155] bg-transparent"
                                    }`}
                            >
                                {active ? step.icon : <Circle className="w-4 h-4" />}
                            </div>
                            {i < TIMELINE_STEPS.length - 1 && (
                                <div
                                    className={`w-px flex-1 mt-1 ${active ? "bg-[#00F0FF]/30" : "bg-[#1E293B]"
                                        }`}
                                    style={{ minHeight: "1.5rem" }}
                                />
                            )}
                        </div>
                        <div className="pt-1">
                            <p
                                className={`text-sm font-medium ${active ? "text-white" : "text-[#475569]"
                                    }`}
                            >
                                {step.label}
                            </p>
                        </div>
                    </li>
                );
            })}
        </ol>
    );
}

// ─── OrderTrackingPanel ───────────────────────────────────────────────────────

interface OrderTrackingPanelProps {
    orderId: number | null;
    onClose: () => void;
}

function OrderTrackingPanel({ orderId, onClose }: OrderTrackingPanelProps) {
    const { data: detail, isLoading } = useGetOrderDetailQuery(orderId ?? 0, {
        skip: !orderId,
        pollingInterval: 60_000,
    });

    return (
        <Sheet open={!!orderId} onOpenChange={(open) => !open && onClose()}>
            <SheetContent
                side="right"
                className="w-full sm:max-w-[540px] bg-[#050A14] border-l border-[#00F0FF]/20 text-white overflow-y-auto"
            >
                <SheetHeader className="mb-6">
                    <SheetTitle className="text-[#00F0FF] font-mono text-lg">
                        SUIVI_COMMANDE
                        {detail ? (
                            <span className="ml-2 text-xs text-[#475569]">#{detail.id}</span>
                        ) : null}
                    </SheetTitle>
                </SheetHeader>

                {isLoading && (
                    <p className="text-[#475569] text-sm animate-pulse">Chargement en cours…</p>
                )}

                {detail && (
                    <div className="space-y-8">
                        {/* Status + badge */}
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-[#94A3B8]">Statut actuel</span>
                            <OrderStatusBadge status={detail.status} />
                        </div>

                        {/* Timeline */}
                        <div>
                            <p className="text-xs text-[#475569] uppercase tracking-widest mb-4">
                                Progression
                            </p>
                            <OrderTimeline status={detail.status} />
                        </div>

                        {/* Printful status (si présent) */}
                        {detail.printful_status && (
                            <div className="border border-[#1E293B] rounded p-3 text-sm">
                                <p className="text-[#475569] text-xs uppercase tracking-widest mb-1">
                                    Statut Printful
                                </p>
                                <p className="text-white font-mono">{detail.printful_status}</p>
                            </div>
                        )}

                        {/* Tracking */}
                        {detail.tracking_number && (
                            <div className="border border-[#1E293B] rounded p-3 space-y-2 text-sm">
                                <p className="text-[#475569] text-xs uppercase tracking-widest">
                                    Numéro de suivi
                                </p>
                                <p className="font-mono text-[#00F0FF]">{detail.tracking_number}</p>
                                {detail.tracking_url && (
                                    <a
                                        href={detail.tracking_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 text-xs text-[#00F0FF] hover:underline"
                                    >
                                        Suivre la livraison <ExternalLink className="w-3 h-3" />
                                    </a>
                                )}
                                {detail.estimated_delivery && (
                                    <p className="text-[#94A3B8] text-xs">
                                        Livraison estimée : {detail.estimated_delivery}
                                    </p>
                                )}
                            </div>
                        )}

                        {/* Produits */}
                        {detail.items.length > 0 && (
                            <div>
                                <p className="text-[#475569] text-xs uppercase tracking-widest mb-2">
                                    Articles
                                </p>
                                <ul className="space-y-1">
                                    {detail.items.map((item, i) => (
                                        <li
                                            key={i}
                                            className="flex justify-between text-sm text-[#CBD5E1]"
                                        >
                                            <span>
                                                {item.name} × {item.qty}
                                            </span>
                                            {item.price && (
                                                <span className="text-[#94A3B8]">{item.price} €</span>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* Facture */}
                        {detail.invoice_number && (
                            <a
                                href={`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"}/commerce/invoice/${detail.id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 text-sm border border-[#00F0FF]/30 text-[#00F0FF] px-4 py-2 rounded hover:bg-[#00F0FF]/10 transition-colors"
                            >
                                <FileText className="w-4 h-4" />
                                Télécharger la facture {detail.invoice_number}
                            </a>
                        )}
                    </div>
                )}
            </SheetContent>
        </Sheet>
    );
}

// ─── OrdersTable ──────────────────────────────────────────────────────────────

interface OrdersTableProps {
    orders: UserOrder[];
    onSelectOrder: (id: number) => void;
}

function OrdersTable({ orders, onSelectOrder }: OrdersTableProps) {
    if (orders.length === 0) {
        return (
            <div className="border border-[#00F0FF]/10 rounded-lg p-12 text-center">
                <p className="text-[#475569] text-sm">Aucune commande pour le moment.</p>
            </div>
        );
    }

    return (
        <div className="border border-[#00F0FF]/10 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
                <thead>
                    <tr className="bg-[#0A1628] border-b border-[#00F0FF]/10">
                        <th className="text-left px-4 py-3 text-[#475569] font-mono uppercase text-xs tracking-widest">
                            Date
                        </th>
                        <th className="text-left px-4 py-3 text-[#475569] font-mono uppercase text-xs tracking-widest">
                            N° Commande
                        </th>
                        <th className="text-left px-4 py-3 text-[#475569] font-mono uppercase text-xs tracking-widest hidden md:table-cell">
                            Produit(s)
                        </th>
                        <th className="text-right px-4 py-3 text-[#475569] font-mono uppercase text-xs tracking-widest">
                            TTC
                        </th>
                        <th className="text-center px-4 py-3 text-[#475569] font-mono uppercase text-xs tracking-widest">
                            Statut
                        </th>
                        <th className="text-center px-4 py-3 text-[#475569] font-mono uppercase text-xs tracking-widest">
                            Facture
                        </th>
                    </tr>
                </thead>
                <tbody>
                    {orders.map((order, i) => (
                        <tr
                            key={order.id}
                            className={`border-b border-[#00F0FF]/10 last:border-0 hover:bg-[#00F0FF]/5 cursor-pointer transition-colors ${i % 2 === 0 ? "" : "bg-[#050A14]/50"
                                }`}
                            onClick={() => onSelectOrder(order.id)}
                        >
                            <td className="px-4 py-3 text-[#CBD5E1]">{fmtDate(order.created_at)}</td>
                            <td className="px-4 py-3 font-mono text-[#00F0FF] text-xs">
                                {order.invoice_number ?? `#${order.id}`}
                            </td>
                            <td className="px-4 py-3 text-[#94A3B8] hidden md:table-cell">
                                {order.items.length > 0
                                    ? order.items
                                        .map((it) => `${it.name} ×${it.qty}`)
                                        .join(", ")
                                    : "—"}
                            </td>
                            <td className="px-4 py-3 text-right text-white">
                                {order.amount_ttc != null ? fmt(order.amount_ttc) : "—"}
                            </td>
                            <td className="px-4 py-3 text-center">
                                <OrderStatusBadge status={order.status} />
                            </td>
                            <td
                                className="px-4 py-3 text-center"
                                onClick={(e) => e.stopPropagation()}
                            >
                                {order.invoice_number ? (
                                    <a
                                        href={`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"}/commerce/invoice/${order.id}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center justify-center text-[#00F0FF] hover:text-white transition-colors"
                                        title={`Facture ${order.invoice_number}`}
                                    >
                                        <FileText className="w-4 h-4" />
                                    </a>
                                ) : (
                                    <span className="text-[#334155]">—</span>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

// ─── OrdersPageInner ──────────────────────────────────────────────────────────

function OrdersPageInner() {
    const router = useRouter();
    const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);

    // Auth guard
    const { isError: authError, isLoading: authLoading } = useGetMeQuery();

    useEffect(() => {
        if (!authLoading && authError) {
            router.push("/login?next=/account/orders");
        }
    }, [authError, authLoading, router]);

    const { data: orders, isLoading: ordersLoading } = useGetMyOrdersQuery(undefined, {
        skip: authLoading || authError,
    });

    if (authLoading || authError) {
        return (
            <p className="text-[#475569] text-sm py-20 text-center animate-pulse">
                Authentification…
            </p>
        );
    }

    return (
        <main className="min-h-screen bg-[#050A14] text-white">
            <AppHeader />

            <div className="max-w-5xl mx-auto px-4 pt-28 pb-16">
                {/* Heading */}
                <div className="mb-8">
                    <h1 className="text-2xl font-mono font-bold text-[#00F0FF] tracking-tight">
                        MES_COMMANDES
                    </h1>
                    <p className="text-[#475569] text-sm mt-1">
                        Historique complet — cliquer une ligne pour suivre la commande.
                    </p>
                </div>

                {/* Content */}
                {ordersLoading ? (
                    <div className="space-y-3">
                        {Array.from({ length: 3 }).map((_, i) => (
                            <div
                                key={i}
                                className="h-12 bg-[#0A1628] rounded animate-pulse"
                            />
                        ))}
                    </div>
                ) : (
                    <OrdersTable
                        orders={orders ?? []}
                        onSelectOrder={setSelectedOrderId}
                    />
                )}
            </div>

            {/* Tracking sheet */}
            <OrderTrackingPanel
                orderId={selectedOrderId}
                onClose={() => setSelectedOrderId(null)}
            />
        </main>
    );
}

// ─── Page export ──────────────────────────────────────────────────────────────

export default function OrdersPage() {
    return <OrdersPageInner />;
}
