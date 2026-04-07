import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface CartItem {
    id: string; // `${productId}-${variantId}`
    productId: number;
    variantId: number;
    name: string;
    size: string;
    color: string;
    colorCode: string;
    thumbnailUrl: string | null;
    price: number;
    quantity: number;
}

export interface PromoPayload {
    code: string;
    discountType: "percent" | "fixed";
    discountValue: number;
}

interface CartState {
    items: CartItem[];
    promoCode: string | null;
    discountType: "percent" | "fixed" | null;
    discountValue: number;
}

const initialState: CartState = {
    items: [],
    promoCode: null,
    discountType: null,
    discountValue: 0,
};

export const cartSlice = createSlice({
    name: "cart",
    initialState,
    reducers: {
        addItem(state, action: PayloadAction<CartItem>) {
            const existing = state.items.find((i) => i.id === action.payload.id);
            if (existing) {
                existing.quantity += action.payload.quantity;
            } else {
                state.items.push(action.payload);
            }
        },
        removeItem(state, action: PayloadAction<string>) {
            state.items = state.items.filter((i) => i.id !== action.payload);
        },
        updateQuantity(state, action: PayloadAction<{ id: string; quantity: number }>) {
            const item = state.items.find((i) => i.id === action.payload.id);
            if (item) {
                item.quantity = Math.max(1, action.payload.quantity);
            }
        },
        clearCart(state) {
            state.items = [];
            state.promoCode = null;
            state.discountType = null;
            state.discountValue = 0;
        },
        applyPromo(state, action: PayloadAction<PromoPayload>) {
            state.promoCode = action.payload.code;
            state.discountType = action.payload.discountType;
            state.discountValue = action.payload.discountValue;
        },
        clearPromo(state) {
            state.promoCode = null;
            state.discountType = null;
            state.discountValue = 0;
        },
    },
});

export const { addItem, removeItem, updateQuantity, clearCart, applyPromo, clearPromo } = cartSlice.actions;

export const selectCartItemCount = (state: { cart: CartState }) =>
    state.cart.items.reduce((sum, i) => sum + i.quantity, 0);

export const selectCartTotal = (state: { cart: CartState }) =>
    state.cart.items.reduce((sum, i) => sum + i.price * i.quantity, 0);

export const selectCartSubtotalHT = (state: { cart: CartState }) => {
    const total = state.cart.items.reduce((sum, i) => sum + i.price * i.quantity, 0);
    // prix Printful = TTC, on retrouve le HT en divisant par 1.20
    return total / 1.2;
};

export const selectDiscount = (state: { cart: CartState }) => {
    const subtotalTTC = selectCartTotal(state);
    if (state.cart.discountType === "percent") {
        return (subtotalTTC * state.cart.discountValue) / 100;
    }
    if (state.cart.discountType === "fixed") {
        return Math.min(state.cart.discountValue, subtotalTTC);
    }
    return 0;
};

export const selectPromoCode = (state: { cart: CartState }) => state.cart.promoCode;
export const selectDiscountType = (state: { cart: CartState }) => state.cart.discountType;
export const selectDiscountValue = (state: { cart: CartState }) => state.cart.discountValue;
