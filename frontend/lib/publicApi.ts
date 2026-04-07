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

// ─── Auth types ───────────────────────────────────────────────────────────────

export interface RegisterArg {
    email: string;
    password: string;
}

export interface LoginArg {
    email: string;
    password: string;
}

export interface AuthMeResponse {
    id: number;
    email: string;
    display_name: string | null;
    role: string;
    created_at?: string;
}

export interface PatchMeArg {
    display_name?: string;
    email?: string;
    current_password?: string;
    new_password?: string;
}

export interface ExportMeData {
    user: { id: number; email: string; display_name: string | null; created_at: string };
    designs: unknown[];
    orders: unknown[];
    invoices: unknown[];
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

// ─── Commerce / Orders types ──────────────────────────────────────────────

export interface OrderItem {
    name: string;
    qty: number;
    price?: string;
}

export type OrderStatus = "pending" | "paid" | "submitted" | "shipped" | "cancelled";

export interface UserOrder {
    id: number;
    invoice_number: string | null;
    status: OrderStatus;
    created_at: string;
    amount_ttc: number | null;
    printful_order_id: string | null;
    items: OrderItem[];
}

export interface OrderDetail extends UserOrder {
    printful_status: string | null;
    tracking_number: string | null;
    tracking_url: string | null;
    estimated_delivery: string | null;
}

// ─── API ─────────────────────────────────────────────────────────────────────

export const publicApi = createApi({
    reducerPath: "publicApi",
    baseQuery: fetchBaseQuery({
        baseUrl: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000",
    }),
    tagTypes: ["PublicProduct", "Me"],
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

        // Auth — register
        register: build.mutation<{ message: string; user_id: number }, RegisterArg>({
            query: (body) => ({
                url: "/auth/register",
                method: "POST",
                body,
                credentials: "include" as RequestCredentials,
            }),
        }),

        // Auth — login
        login: build.mutation<AuthMeResponse, LoginArg>({
            query: (body) => ({
                url: "/auth/login",
                method: "POST",
                body,
                credentials: "include" as RequestCredentials,
            }),
        }),

        // Auth — me (current user)
        getMe: build.query<AuthMeResponse, void>({
            query: () => ({ url: "/auth/me", credentials: "include" as RequestCredentials }),
            providesTags: ["Me"],
        }),

        // Auth — patch me (display_name, email, password)
        patchMe: build.mutation<AuthMeResponse, PatchMeArg>({
            query: (body) => ({
                url: "/auth/me",
                method: "PATCH",
                body,
                credentials: "include" as RequestCredentials,
            }),
            invalidatesTags: ["Me"],
        }),

        // Auth — delete me (RGPD Art. 17 anonymisation)
        deleteMe: build.mutation<{ message: string }, void>({
            query: () => ({
                url: "/auth/me",
                method: "DELETE",
                credentials: "include" as RequestCredentials,
            }),
        }),

        // Auth — logout
        logout: build.mutation<void, void>({
            query: () => ({
                url: "/auth/logout",
                method: "POST",
                credentials: "include" as RequestCredentials,
            }),
        }),

        // Promo — valider un code promo
        validatePromo: build.mutation<
            { valid: true; discount_type: "percent" | "fixed"; discount_value: number; code: string },
            { code: string; cart_total: number }
        >({
            query: (body) => ({
                url: "/commerce/promo/validate",
                method: "POST",
                body,
            }),
        }),

        // Orders — liste des commandes de l'utilisateur
        getMyOrders: build.query<UserOrder[], void>({
            query: () => ({ url: "/commerce/orders", credentials: "include" as RequestCredentials }),
        }),

        // Orders — détail + statut Printful (polling 60s côté page)
        getOrderDetail: build.query<OrderDetail, number>({
            query: (id) => ({ url: `/commerce/order/${id}`, credentials: "include" as RequestCredentials }),
        }),

        // Checkout — créer une session Stripe Checkout
        createCheckoutSession: build.mutation<
            { session_url: string },
            { items: { variant_id: number; quantity: number }[]; promo_code?: string }
        >({
            query: (body) => ({
                url: "/commerce/checkout/create-session",
                method: "POST",
                body,
                credentials: "include" as RequestCredentials,
            }),
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
    useRegisterMutation,
    useLoginMutation,
    useGetMeQuery,
    useLogoutMutation,
    useValidatePromoMutation,
    useGetMyOrdersQuery,
    useGetOrderDetailQuery,
    usePatchMeMutation,
    useDeleteMeMutation,
    useCreateCheckoutSessionMutation,
} = publicApi;
