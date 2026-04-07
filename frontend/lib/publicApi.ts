import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

export interface PublicProduct {
    id: number;
    name: string;
    thumbnail_url: string | null;
    variants?: number;
    synced?: number;
}

export interface SyncVariant {
    id: number;
    name: string;
    size: string;
    color: string;
    color_code: string;
    availability_status: "active" | "discontinued" | "out_of_stock";
    retail_price: string;
    thumbnail_url: string | null;
    files?: { url: string; type: string }[];
}

export interface ProductDetail {
    sync_product: PublicProduct & {
        description?: string;
        category?: string;
    };
    sync_variants: SyncVariant[];
}

// ─── Upload / Fixer / Soul / Roast types ────────────────────────────────────

export interface UploadImageResponse {
    filename: string;
    format: string;
    size: [number, number];
    dpi: [number, number];
    print_ready: boolean;
}

export interface TaskDispatchResponse {
    task_id: string;
    status: string;
}

export interface TaskStatusResponse {
    task_id: string;
    status: string;
    result: unknown;
}

export interface AnalyzeRoastArg {
    filename: string;
    format: string;
    size: number[];
    print_ready: boolean;
    dpi?: number[] | null;
}

// ─── API ─────────────────────────────────────────────────────────────────────

export const publicApi = createApi({
    reducerPath: "publicApi",
    baseQuery: fetchBaseQuery({
        baseUrl: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000",
    }),
    tagTypes: ["PublicProduct"],
    endpoints: (build) => ({
        getPublicProducts: build.query<
            { paging: { total: number; offset: number; limit: number }; result: PublicProduct[] },
            void
        >({
            query: () => "/api/products",
            providesTags: ["PublicProduct"],
        }),
        getProductById: build.query<{ result: ProductDetail }, number>({
            query: (id) => `/api/products/${id}`,
            providesTags: (_result, _error, id) => [{ type: "PublicProduct", id }],
        }),

        // Upload validation (sync — returns DPI + metadata)
        uploadImage: build.mutation<UploadImageResponse, FormData>({
            query: (body) => ({ url: "/fixer/upload", method: "POST", body }),
        }),

        // Celery async: vectorize pipeline
        vectorizeImage: build.mutation<TaskDispatchResponse, FormData>({
            query: (body) => ({ url: "/fixer/vectorize", method: "POST", body }),
        }),

        // Celery async: soul score
        scoreSoul: build.mutation<TaskDispatchResponse, FormData>({
            query: (body) => ({ url: "/soul/score", method: "POST", body }),
        }),

        // Celery async: roast (takes JSON ImageAnalysis)
        analyzeRoast: build.mutation<TaskDispatchResponse, AnalyzeRoastArg>({
            query: (body) => ({
                url: "/roast/analyze",
                method: "POST",
                body,
            }),
        }),

        // Polling — fixer task status
        getFixerStatus: build.query<TaskStatusResponse, string>({
            query: (taskId) => `/fixer/status/${taskId}`,
        }),

        // Polling — soul task status
        getSoulStatus: build.query<TaskStatusResponse, string>({
            query: (taskId) => `/soul/status/${taskId}`,
        }),

        // Polling — roast task status
        getRoastStatus: build.query<TaskStatusResponse, string>({
            query: (taskId) => `/roast/status/${taskId}`,
        }),
    }),
});

export const {
    useGetPublicProductsQuery,
    useGetProductByIdQuery,
    useUploadImageMutation,
    useVectorizeImageMutation,
    useScoreSoulMutation,
    useAnalyzeRoastMutation,
    useGetFixerStatusQuery,
    useGetSoulStatusQuery,
    useGetRoastStatusQuery,
} = publicApi;
