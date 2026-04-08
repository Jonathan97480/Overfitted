import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export type CollectionFilter = string;  // dynamique depuis la DB (slug du tag)
export type ProductTypeFilter = string;  // dynamique depuis la BDD (ex: "T-SHIRTS PREMIUM")

// Valeurs par défaut (fallback si l'API n'est pas disponible)
const ALL_TYPES: ProductTypeFilter[] = [
    "T-SHIRTS PREMIUM",
    "HOODIES OVERSIZE",
    "XXXL PAD",
    "STICKERS",
];

interface ShopState {
    selectedCollections: CollectionFilter[];
    selectedProductTypes: ProductTypeFilter[];
    sarcasmLevel: number;
    collectionsInitialized: boolean;
    productTypesInitialized: boolean;
}

const initialState: ShopState = {
    selectedCollections: [],   // [] = tous les items affichés avant chargement DB
    selectedProductTypes: [],  // [] = tous les produits affichés avant chargement DB
    sarcasmLevel: 75,
    collectionsInitialized: false,
    productTypesInitialized: false,
};

export const shopSlice = createSlice({
    name: "shop",
    initialState,
    reducers: {
        toggleCollection(state, action: PayloadAction<CollectionFilter>) {
            const col = action.payload;
            const idx = state.selectedCollections.indexOf(col);
            if (idx >= 0) {
                state.selectedCollections.splice(idx, 1);
            } else {
                state.selectedCollections.push(col);
            }
        },
        toggleProductType(state, action: PayloadAction<ProductTypeFilter>) {
            const t = action.payload;
            const idx = state.selectedProductTypes.indexOf(t);
            if (idx >= 0) {
                state.selectedProductTypes.splice(idx, 1);
            } else {
                state.selectedProductTypes.push(t);
            }
        },
        setSarcasmLevel(state, action: PayloadAction<number>) {
            state.sarcasmLevel = action.payload;
        },
        // Appelé une seule fois au chargement des collections (tags) depuis la DB
        initCollections(state, action: PayloadAction<string[]>) {
            if (!state.collectionsInitialized) {
                state.selectedCollections = [...action.payload];
                state.collectionsInitialized = true;
            }
        },
        // Appelé une seule fois au chargement des types depuis la DB
        initProductTypes(state, action: PayloadAction<string[]>) {
            if (!state.productTypesInitialized) {
                state.selectedProductTypes = [...action.payload];
                state.productTypesInitialized = true;
            }
        },
    },
});

export const {
    toggleCollection,
    toggleProductType,
    setSarcasmLevel,
    initCollections,
    initProductTypes,
} = shopSlice.actions;

export { ALL_TYPES };
