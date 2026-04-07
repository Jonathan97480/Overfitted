import type { Middleware, MiddlewareAPI } from "@reduxjs/toolkit";
import type { CartItem } from "./slices/cartSlice";

const STORAGE_KEY = "ovf_cart";

interface CartPersistedState {
    items: CartItem[];
    promoCode: string | null;
    discountType: "percent" | "fixed" | null;
    discountValue: number;
}

// Middleware typé sans dépendance circulaire sur RootState
export const cartPersistMiddleware: Middleware =
    (storeAPI: MiddlewareAPI) => (next) => (action) => {
        const result = next(action);
        const actionType = (action as { type?: string }).type ?? "";
        if (actionType.startsWith("cart/")) {
            const state = storeAPI.getState() as { cart: CartPersistedState };
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(state.cart));
            } catch {
                // localStorage peut être indisponible (SSR, mode privé saturé)
            }
        }
        return result;
    };

export function loadCartFromStorage(): Partial<CartPersistedState> {
    if (typeof window === "undefined") return {};
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return {};
        return JSON.parse(raw) as Partial<CartPersistedState>;
    } catch {
        return {};
    }
}

