import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import type { RootState } from "../store";

export type GlitchFilter = "STATIC_NOISE" | "COLOR_BLEED" | "ASCII_OVERLAY";

interface DesignState {
    selectedColor: string;       // label ex: "Black"
    selectedColorCode: string;   // hex ex: "#1A1A1A"
    selectedSize: string;        // ex: "M" | ""
    scale: number;               // 50–150 (%)
    position: number;            // 0–100 (vertical %)
    sarcasticText: string;
    glitchFilters: GlitchFilter[];
}

const initialState: DesignState = {
    selectedColor: "Black",
    selectedColorCode: "#1A1A1A",
    selectedSize: "",
    scale: 80,
    position: 40,
    sarcasticText: "",
    glitchFilters: [],
};

export const designSlice = createSlice({
    name: "design",
    initialState,
    reducers: {
        setColor(
            state,
            action: PayloadAction<{ label: string; colorCode: string }>
        ) {
            state.selectedColor = action.payload.label;
            state.selectedColorCode = action.payload.colorCode;
        },
        setSize(state, action: PayloadAction<string>) {
            state.selectedSize = action.payload;
        },
        setScale(state, action: PayloadAction<number>) {
            state.scale = Math.min(150, Math.max(50, action.payload));
        },
        setPosition(state, action: PayloadAction<number>) {
            state.position = Math.min(100, Math.max(0, action.payload));
        },
        setSarcasticText(state, action: PayloadAction<string>) {
            state.sarcasticText = action.payload;
        },
        toggleGlitchFilter(state, action: PayloadAction<GlitchFilter>) {
            const idx = state.glitchFilters.indexOf(action.payload);
            if (idx === -1) {
                state.glitchFilters.push(action.payload);
            } else {
                state.glitchFilters.splice(idx, 1);
            }
        },
        resetDesign() {
            return initialState;
        },
    },
});

export const {
    setColor,
    setSize,
    setScale,
    setPosition,
    setSarcasticText,
    toggleGlitchFilter,
    resetDesign,
} = designSlice.actions;

export const selectDesign = (state: RootState) => state.design;
