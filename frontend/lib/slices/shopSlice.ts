import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export type CollectionFilter = "SYNTAX" | "HALLUCINATION" | "PULSE";
export type ProductTypeFilter = string;  // dynamique depuis la BDD (ex: "T-SHIRTS PREMIUM")

const ALL_COLLECTIONS: CollectionFilter[] = ["SYNTAX", "HALLUCINATION", "PULSE"];
// Valeurs par défaut (fallback si l'API n'est pas disponible)
const ALL_TYPES: ProductTypeFilter[] = [
    "T-SHIRTS PREMIUM",
    "HOODIES OVERSIZE",
    "XXXL PAD",
    "STICKERS",
];

interface ShopState {
    pendingCollections: CollectionFilter[];
    pendingProductTypes: ProductTypeFilter[];
    pendingSarcasmLevel: number;
    appliedCollections: CollectionFilter[];
    appliedProductTypes: ProductTypeFilter[];
    appliedSarcasmLevel: number;
    productTypesInitialized: boolean;
}

const initialState: ShopState = {
    pendingCollections: [...ALL_COLLECTIONS],
    pendingProductTypes: [],      // initialisé depuis la DB via initProductTypes
    pendingSarcasmLevel: 75,
    appliedCollections: [...ALL_COLLECTIONS],
    appliedProductTypes: [],      // [] = affiche tout jusqu'à ce que la DB charge
    appliedSarcasmLevel: 75,
    productTypesInitialized: false,
};

export const shopSlice = createSlice({
    name: "shop",
    initialState,
    reducers: {
        togglePendingCollection(state, action: PayloadAction<CollectionFilter>) {
            const col = action.payload;
            const idx = state.pendingCollections.indexOf(col);
            if (idx >= 0) {
                state.pendingCollections.splice(idx, 1);
            } else {
                state.pendingCollections.push(col);
            }
        },
        togglePendingProductType(state, action: PayloadAction<ProductTypeFilter>) {
            const t = action.payload;
            const idx = state.pendingProductTypes.indexOf(t);
            if (idx >= 0) {
                state.pendingProductTypes.splice(idx, 1);
            } else {
                state.pendingProductTypes.push(t);
            }
        },
        setPendingSarcasmLevel(state, action: PayloadAction<number>) {
            state.pendingSarcasmLevel = action.payload;
        },
        applyFilters(state) {
            state.appliedCollections = [...state.pendingCollections];
            state.appliedProductTypes = [...state.pendingProductTypes];
            state.appliedSarcasmLevel = state.pendingSarcasmLevel;
        },
        // Appelé une seule fois au chargement des types depuis la DB
        initProductTypes(state, action: PayloadAction<string[]>) {
            if (!state.productTypesInitialized) {
                state.pendingProductTypes = [...action.payload];
                state.appliedProductTypes = [...action.payload];
                state.productTypesInitialized = true;
            }
        },
    },
});

export const {
    togglePendingCollection,
    togglePendingProductType,
    setPendingSarcasmLevel,
    applyFilters,
    initProductTypes,
} = shopSlice.actions;

export { ALL_COLLECTIONS, ALL_TYPES };
