"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";
import { Minus, Plus, Trash2, Tag, CheckCircle, AlertCircle, ShoppingBag } from "lucide-react";
import { AppHeader } from "@/components/public/AppHeader";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import {
    removeItem,
    updateQuantity,
    clearPromo,
    applyPromo,
    selectCartItemCount,
    selectCartTotal,
    selectDiscount,
    selectPromoCode,
    selectDiscountType,
    selectDiscountValue,
    type CartItem,
} from "@/lib/slices/cartSlice";
import { useValidatePromoMutation } from "@/lib/publicApi";
import type { RootState } from "@/lib/store";

const TVA_RATE = 0.2;
const SHIPPING_THRESHOLD = 50;
const SHIPPING_COST = 4.9;

function fmt(n: number) {
    return n.toLocaleString("fr-FR", { style: "currency", currency: "EUR" });
}

// ─── CartItemRow ──────────────────────────────────────────────────────────────

interface CartItemRowProps {
    item: CartItem;
}

function CartItemRow({ item }: CartItemRowProps) {
    const dispatch = useAppDispatch();

    return (
        <div className="flex gap-4 py-4 border-b border-[#00F0FF]/10">
            {/* Thumbnail */}
            <div className="flex-shrink-0 w-20 h-20 bg-[#111827] border border-[#00F0FF]/20 rounded overflow-hidden">
                {item.thumbnailUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        src={item.thumbnailUrl}
                        alt={item.name}
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-[#444] font-mono text-[10px]">
                        NO IMG
                    </div>
                )}
            </div>

            {/* Infos */}
            <div className="flex-1 min-w-0">
                <p className="font-mono text-[13px] text-white uppercase tracking-wide truncate">{item.name}</p>
                <div className="flex gap-3 mt-1">
                    <span className="font-mono text-[11px] text-[#AAAAAA]">
                        COLOR:{" "}
                        <span className="text-[#00F0FF]" style={{ color: item.colorCode !== "#000000" ? item.colorCode : "#00F0FF" }}>
                            {item.color.toUpperCase()}
                        </span>
                    </span>
                    <span className="font-mono text-[11px] text-[#AAAAAA]">
                        SIZE: <span className="text-[#FF6B00]">{item.size.toUpperCase()}</span>
                    </span>
                </div>
                <p className="font-mono text-[12px] text-[#FF6B00] mt-1">{fmt(item.price)}</p>
            </div>

            {/* Quantité + supprimer */}
            <div className="flex flex-col items-end justify-between gap-2">
                {/* Sélecteur −/+ */}
                <div className="flex items-center gap-1 border border-[#00F0FF]/30 rounded">
                    <button
                        onClick={() =>
                            item.quantity <= 1
                                ? dispatch(removeItem(item.id))
                                : dispatch(updateQuantity({ id: item.id, quantity: item.quantity - 1 }))
                        }
                        className="w-7 h-7 flex items-center justify-center text-[#AAAAAA] hover:text-white transition-colors"
                        aria-label="Diminuer la quantité"
                    >
                        <Minus size={12} />
                    </button>
                    <span className="font-mono text-[13px] text-white w-6 text-center">{item.quantity}</span>
                    <button
                        onClick={() => dispatch(updateQuantity({ id: item.id, quantity: item.quantity + 1 }))}
                        className="w-7 h-7 flex items-center justify-center text-[#AAAAAA] hover:text-white transition-colors"
                        aria-label="Augmenter la quantité"
                    >
                        <Plus size={12} />
                    </button>
                </div>

                {/* Prix ligne */}
                <span className="font-mono text-[13px] text-white">{fmt(item.price * item.quantity)}</span>

                {/* Supprimer */}
                <button
                    onClick={() => dispatch(removeItem(item.id))}
                    className="text-[#444] hover:text-red-400 transition-colors"
                    aria-label="Supprimer l'article"
                >
                    <Trash2 size={13} />
                </button>
            </div>
        </div>
    );
}

// ─── PromoCodeInput ───────────────────────────────────────────────────────────

function PromoCodeInput({ cartTotalTTC }: { cartTotalTTC: number }) {
    const dispatch = useAppDispatch();
    const promoCode = useAppSelector(selectPromoCode);
    const discountType = useAppSelector(selectDiscountType);
    const discountValue = useAppSelector(selectDiscountValue);
    const [input, setInput] = useState(promoCode ?? "");
    const [promoError, setPromoError] = useState<string | null>(null);
    const [validatePromo, { isLoading }] = useValidatePromoMutation();

    async function handleApply() {
        const code = input.trim().toUpperCase();
        if (!code) return;
        setPromoError(null);
        try {
            const result = await validatePromo({ code, cart_total: cartTotalTTC }).unwrap();
            dispatch(
                applyPromo({
                    code: result.code,
                    discountType: result.discount_type,
                    discountValue: result.discount_value,
                })
            );
        } catch (err: unknown) {
            const apiErr = err as { data?: { detail?: string } };
            setPromoError(apiErr?.data?.detail ?? "Code invalide ou expiré.");
            dispatch(clearPromo());
        }
    }

    function handleRemove() {
        dispatch(clearPromo());
        setInput("");
        setPromoError(null);
    }

    if (promoCode) {
        return (
            <div className="flex items-center justify-between px-3 py-2 bg-green-950/40 border border-green-500/40 rounded">
                <div className="flex items-center gap-2">
                    <CheckCircle size={14} className="text-green-400" />
                    <span className="font-mono text-[12px] text-green-400 uppercase">
                        {promoCode}
                        {discountType === "percent" && ` · −${discountValue}%`}
                        {discountType === "fixed" && ` · −${fmt(discountValue)}`}
                    </span>
                </div>
                <button
                    onClick={handleRemove}
                    className="font-mono text-[10px] text-[#AAAAAA] hover:text-red-400 transition-colors uppercase"
                >
                    RETIRER
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-2">
            <div className="flex gap-2">
                <div className="flex-1 flex items-center gap-2 bg-[#111827] border border-[#00F0FF]/20 rounded px-3 py-2 focus-within:border-[#00F0FF]/60 transition-colors">
                    <Tag size={13} className="text-[#444] flex-shrink-0" />
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => {
                            setInput(e.target.value.toUpperCase());
                            setPromoError(null);
                        }}
                        onKeyDown={(e) => e.key === "Enter" && handleApply()}
                        placeholder="CODE PROMO"
                        className="flex-1 bg-transparent font-mono text-[12px] text-white placeholder:text-[#555] uppercase tracking-widest outline-none"
                        aria-label="Code promo"
                    />
                </div>
                <button
                    onClick={handleApply}
                    disabled={isLoading || !input.trim()}
                    className="px-4 py-2 bg-[#FF6B00] hover:bg-[#FF6B00]/80 disabled:opacity-40 disabled:cursor-not-allowed text-white font-mono text-[11px] uppercase tracking-widest rounded transition-colors"
                >
                    {isLoading ? "..." : "APPLIQUER"}
                </button>
            </div>
            {promoError && (
                <div className="flex items-center gap-2 text-red-400 font-mono text-[11px]">
                    <AlertCircle size={12} />
                    {promoError}
                </div>
            )}
        </div>
    );
}

// ─── OrderSummaryCard ─────────────────────────────────────────────────────────

function OrderSummaryCard() {
    const router = useRouter();
    const totalTTC = useAppSelector(selectCartTotal);
    const discount = useAppSelector(selectDiscount);
    const promoCode = useAppSelector(selectPromoCode);
    const discountType = useAppSelector(selectDiscountType);
    const discountValue = useAppSelector(selectDiscountValue);
    const itemCount = useAppSelector(selectCartItemCount);

    const totalAfterDiscount = Math.max(0, totalTTC - discount);
    const shipping = totalAfterDiscount >= SHIPPING_THRESHOLD ? 0 : SHIPPING_COST;
    const totalWithShipping = totalAfterDiscount + shipping;

    // Le prix Printful est TTC — on retrouve le HT
    const subtotalHT = totalTTC / (1 + TVA_RATE);
    const tvaAmount = totalWithShipping - totalWithShipping / (1 + TVA_RATE);
    const totalHT = totalWithShipping / (1 + TVA_RATE);

    return (
        <div className="bg-[#111827] border border-[#00F0FF]/20 rounded p-5 space-y-4 sticky top-28">
            {/* Titre */}
            <div className="border-b border-[#00F0FF]/10 pb-3">
                <p className="font-mono text-[11px] text-[#00F0FF] uppercase tracking-[0.2em]">ORDER_SUMMARY</p>
            </div>

            {/* Lignes */}
            <div className="space-y-2">
                <div className="flex justify-between font-mono text-[12px]">
                    <span className="text-[#AAAAAA]">SOUS-TOTAL HT</span>
                    <span className="text-white">{fmt(subtotalHT)}</span>
                </div>

                {discount > 0 && promoCode && (
                    <div className="flex justify-between font-mono text-[12px]">
                        <span className="text-green-400">
                            {discountType === "percent" ? `−${discountValue}%` : "REMISE"} · {promoCode}
                        </span>
                        <span className="text-green-400">−{fmt(discount)}</span>
                    </div>
                )}

                <div className="flex justify-between font-mono text-[12px]">
                    <span className="text-[#AAAAAA]">LIVRAISON</span>
                    {shipping === 0 ? (
                        <span className="text-green-400">OFFERTE</span>
                    ) : (
                        <span className="text-white">{fmt(shipping)}</span>
                    )}
                </div>

                {shipping > 0 && (
                    <p className="font-mono text-[10px] text-[#555]">
                        LIVRAISON OFFERTE DÈS {fmt(SHIPPING_THRESHOLD)}
                    </p>
                )}

                <div className="flex justify-between font-mono text-[12px]">
                    <span className="text-[#AAAAAA]">TVA 20%</span>
                    <span className="text-white">{fmt(tvaAmount)}</span>
                </div>

                <div className="border-t border-[#00F0FF]/10 pt-3 flex justify-between font-mono">
                    <span className="text-[13px] text-white uppercase tracking-wide">TOTAL TTC</span>
                    <span className="text-[16px] text-[#FF6B00] font-bold">{fmt(totalWithShipping)}</span>
                </div>
            </div>

            {/* Code promo */}
            <PromoCodeInput cartTotalTTC={totalTTC} />

            {/* CTA */}
            <button
                onClick={() => router.push("/checkout")}
                disabled={itemCount === 0}
                className="w-full py-3 bg-[#FF6B00] hover:bg-[#FF6B00]/80 disabled:opacity-40 disabled:cursor-not-allowed text-white font-mono text-[13px] uppercase tracking-[0.18em] rounded transition-colors"
            >
                PROCÉDER AU PAIEMENT
            </button>

            <p className="font-mono text-[9px] text-[#444] text-center leading-relaxed">
                Art. L221-28 — produits personnalisés à la demande.
                <br />
                Aucun droit de rétractation applicable.
            </p>
        </div>
    );
}

// ─── CartContent ─────────────────────────────────────────────────────────────

function CartContent() {
    const searchParams = useSearchParams();
    const items = useAppSelector((s: RootState) => s.cart.items);
    const [cancelledToast, setCancelledToast] = useState(false);
    const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (searchParams.get("cancelled") === "true") {
            setCancelledToast(true);
            toastTimer.current = setTimeout(() => setCancelledToast(false), 5000);
        }
        return () => {
            if (toastTimer.current) clearTimeout(toastTimer.current);
        };
    }, [searchParams]);

    return (
        <div className="min-h-screen bg-[#0A0A0A] text-white">
            <AppHeader />

            {/* Toast paiement annulé */}
            {cancelledToast && (
                <div className="fixed top-28 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-[#1a1000] border border-[#FF6B00]/60 rounded px-5 py-3 shadow-lg shadow-[#FF6B00]/10 transition-all">
                    <AlertCircle size={16} className="text-[#FF6B00]" />
                    <span className="font-mono text-[12px] text-[#FF6B00] uppercase tracking-wide">
                        PAIEMENT ANNULÉ — VOTRE PANIER EST INTACT
                    </span>
                    <button
                        onClick={() => setCancelledToast(false)}
                        className="ml-2 text-[#555] hover:text-white font-mono text-[11px]"
                    >
                        ✕
                    </button>
                </div>
            )}

            <main className="max-w-6xl mx-auto px-4 py-10">
                {/* Header */}
                <div className="mb-8">
                    <p className="font-mono text-[10px] text-[#00F0FF] uppercase tracking-[0.3em] mb-1">
                        DIAGNOSTIC_CART.SYS
                    </p>
                    <h1 className="font-mono text-[22px] text-white uppercase tracking-[0.15em]">
                        MON PANIER{" "}
                        {items.length > 0 && (
                            <span className="text-[#AAAAAA] text-[16px]">
                                ({items.reduce((s: number, i) => s + i.quantity, 0)} ARTICLE{items.reduce((s: number, i) => s + i.quantity, 0) > 1 ? "S" : ""})
                            </span>
                        )}
                    </h1>
                </div>

                {items.length === 0 ? (
                    /* Panier vide */
                    <div className="flex flex-col items-center justify-center py-20 gap-6">
                        <div className="w-24 h-24 rounded-full bg-[#111827] border border-[#00F0FF]/20 flex items-center justify-center">
                            <ShoppingBag size={36} className="text-[#333]" />
                        </div>
                        <div className="text-center space-y-2">
                            <p className="font-mono text-[14px] text-[#AAAAAA] uppercase tracking-[0.2em]">
                                PANIER_VIDE
                            </p>
                            <p className="font-mono text-[11px] text-[#555]">
                                Votre chaos organique n&apos;a pas encore été quantifié.
                            </p>
                        </div>
                        <Link
                            href="/shop"
                            className="px-8 py-3 bg-[#FF6B00] hover:bg-[#FF6B00]/80 text-white font-mono text-[12px] uppercase tracking-[0.2em] rounded transition-colors"
                        >
                            EXPLORER LA BOUTIQUE
                        </Link>
                    </div>
                ) : (
                    /* Layout 2 colonnes */
                    <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-8">
                        {/* Colonne articles */}
                        <div>
                            <div className="bg-[#111827] border border-[#00F0FF]/20 rounded p-5">
                                <p className="font-mono text-[11px] text-[#00F0FF] uppercase tracking-[0.2em] mb-4 border-b border-[#00F0FF]/10 pb-3">
                                    ARTICLES_SELECTIONNÉS
                                </p>
                                {items.map((item) => (
                                    <CartItemRow key={item.id} item={item} />
                                ))}
                            </div>

                            {/* Lien retour shop */}
                            <div className="mt-4">
                                <Link
                                    href="/shop"
                                    className="font-mono text-[11px] text-[#AAAAAA] hover:text-[#00F0FF] uppercase tracking-[0.15em] transition-colors"
                                >
                                    ← CONTINUER LES ACHATS
                                </Link>
                            </div>
                        </div>

                        {/* Colonne récapitulatif */}
                        <OrderSummaryCard />
                    </div>
                )}
            </main>
        </div>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CartPage() {
    return (
        <Suspense
            fallback={
                <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
                    <p className="font-mono text-[#00F0FF] text-[12px] uppercase tracking-widest animate-pulse">
                        LOADING_CART...
                    </p>
                </div>
            }
        >
            <CartContent />
        </Suspense>
    );
}
