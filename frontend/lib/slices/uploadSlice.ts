import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import type { RootState } from "../store";

export interface RoastResult {
    verdict: string;
    score: number;
    issues: string[];
    roast: string;
}

interface UploadState {
    status: "idle" | "uploading" | "analyzing" | "ready" | "error";
    fixerTaskId: string | null;
    soulTaskId: string | null;
    roastTaskId: string | null;
    roastResult: RoastResult | null;
    soulScore: number | null;
    imageUrl: string | null;
    dpi: [number, number] | null;
    imageFormat: string | null;
    errorMessage: string | null;
}

const initialState: UploadState = {
    status: "idle",
    fixerTaskId: null,
    soulTaskId: null,
    roastTaskId: null,
    roastResult: null,
    soulScore: null,
    imageUrl: null,
    dpi: null,
    imageFormat: null,
    errorMessage: null,
};

export const uploadSlice = createSlice({
    name: "upload",
    initialState,
    reducers: {
        setImageUrl(state, action: PayloadAction<string>) {
            state.imageUrl = action.payload;
        },
        startUploading(state) {
            state.status = "uploading";
            state.errorMessage = null;
            state.fixerTaskId = null;
            state.soulTaskId = null;
            state.roastTaskId = null;
            state.roastResult = null;
            state.soulScore = null;
            state.dpi = null;
            state.imageFormat = null;
        },
        setAnalyzing(state) {
            state.status = "analyzing";
        },
        setImageMeta(
            state,
            action: PayloadAction<{ dpi: [number, number] | null; format: string }>
        ) {
            state.dpi = action.payload.dpi;
            state.imageFormat = action.payload.format;
        },
        setFixerTaskId(state, action: PayloadAction<string>) {
            state.fixerTaskId = action.payload;
        },
        setSoulTaskId(state, action: PayloadAction<string>) {
            state.soulTaskId = action.payload;
        },
        setRoastTaskId(state, action: PayloadAction<string>) {
            state.roastTaskId = action.payload;
        },
        setSoulScore(state, action: PayloadAction<number>) {
            state.soulScore = action.payload;
        },
        setRoastResult(state, action: PayloadAction<RoastResult>) {
            state.roastResult = action.payload;
            state.status = "ready";
        },
        setReady(state) {
            state.status = "ready";
        },
        setError(state, action: PayloadAction<string>) {
            state.status = "error";
            state.errorMessage = action.payload;
        },
        reset() {
            return initialState;
        },
    },
});

export const {
    setImageUrl,
    startUploading,
    setAnalyzing,
    setImageMeta,
    setFixerTaskId,
    setSoulTaskId,
    setRoastTaskId,
    setSoulScore,
    setRoastResult,
    setReady,
    setError,
    reset,
} = uploadSlice.actions;

export const selectUpload = (state: RootState) => state.upload;
