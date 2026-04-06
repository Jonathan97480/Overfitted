import { adminApi } from "./adminApi";

export interface StatsResponse {
    total_users: number;
    total_designs: number;
    total_orders: number;
    total_revenue: number;
    orders_by_status: Record<string, number>;
    designs_by_status: Record<string, number>;
}

export interface UserOut {
    id: number;
    username: string;
    email: string;
}

export interface DesignOut {
    id: number;
    user_id: number | null;
    original_url: string;
    svg_url: string | null;
    dpi: number | null;
    status: "pending" | "processing" | "ready" | "failed";
    created_at: string;
}

export interface OrderOut {
    id: number;
    user_id: number | null;
    design_id: number;
    stripe_session_id: string | null;
    printful_order_id: string | null;
    status: "pending" | "paid" | "submitted" | "shipped" | "cancelled";
    created_at: string;
}

export interface ProductOut {
    id: number;
    name: string;
    printful_variant_id: string;
    price: number;
    category: string | null;
}

export type CatalogueStatus = "draft" | "active" | "archived";

export interface CatalogueItemOut {
    id: number;
    title: string;
    description: string | null;
    image_url: string | null;
    price: number;
    category: string | null;
    status: CatalogueStatus;
    printful_variant_id: string | null;
    tags: string | null;
    created_at: string;
}

export interface PromoCodeOut {
    id: number;
    code: string;
    discount_percent: number;
    max_uses: number | null;
    uses_count: number;
    is_active: boolean;
    expires_at: string | null;
    created_at: string;
}

export interface PromoCodeCreate {
    code: string;
    discount_percent: number;
    max_uses?: number | null;
    expires_at?: string | null;
}

export interface PromoCodeUpdate {
    discount_percent?: number;
    max_uses?: number | null;
    is_active?: boolean;
    expires_at?: string | null;
}

export interface ImageUploadResult {
    url: string;
    width: number;
    height: number;
    dpi: number;
    print_ready: boolean;
}

export interface ImageProcessResult extends ImageUploadResult {
    bg_removed: boolean;
    upscaled: boolean;
    vectorized: boolean;
}

const adminApiExtended = adminApi.injectEndpoints({
    endpoints: (build) => ({
        // Stats
        getStats: build.query<StatsResponse, void>({
            query: () => "/stats",
            providesTags: ["Stats"],
        }),

        // Users
        listUsers: build.query<UserOut[], { skip?: number; limit?: number }>({
            query: ({ skip = 0, limit = 50 } = {}) =>
                `/users?skip=${skip}&limit=${limit}`,
            providesTags: ["User"],
        }),
        deleteUser: build.mutation<{ deleted: number }, number>({
            query: (id) => ({ url: `/users/${id}`, method: "DELETE" }),
            invalidatesTags: ["User", "Stats"],
        }),

        // Designs
        listDesigns: build.query<DesignOut[], { skip?: number; limit?: number }>({
            query: ({ skip = 0, limit = 50 } = {}) =>
                `/designs?skip=${skip}&limit=${limit}`,
            providesTags: ["Design"],
        }),
        updateDesignStatus: build.mutation<
            DesignOut,
            { id: number; status: DesignOut["status"] }
        >({
            query: ({ id, status }) => ({
                url: `/designs/${id}`,
                method: "PATCH",
                body: { status },
            }),
            invalidatesTags: ["Design", "Stats"],
        }),
        deleteDesign: build.mutation<{ deleted: number }, number>({
            query: (id) => ({ url: `/designs/${id}`, method: "DELETE" }),
            invalidatesTags: ["Design", "Stats"],
        }),

        // Orders
        listOrders: build.query<OrderOut[], { skip?: number; limit?: number }>({
            query: ({ skip = 0, limit = 50 } = {}) =>
                `/orders?skip=${skip}&limit=${limit}`,
            providesTags: ["Order"],
        }),
        updateOrderStatus: build.mutation<
            OrderOut,
            { id: number; status: OrderOut["status"] }
        >({
            query: ({ id, status }) => ({
                url: `/orders/${id}`,
                method: "PATCH",
                body: { status },
            }),
            invalidatesTags: ["Order", "Stats"],
        }),

        // Products
        listProducts: build.query<ProductOut[], void>({
            query: () => "/products",
            providesTags: ["Product"],
        }),
        createProduct: build.mutation<
            ProductOut,
            Omit<ProductOut, "id">
        >({
            query: (body) => ({ url: "/products", method: "POST", body }),
            invalidatesTags: ["Product"],
        }),
        updateProduct: build.mutation<
            ProductOut,
            { id: number; name?: string; price?: number; category?: string | null }
        >({
            query: ({ id, ...body }) => ({
                url: `/products/${id}`,
                method: "PATCH",
                body,
            }),
            invalidatesTags: ["Product"],
        }),
        deleteProduct: build.mutation<{ deleted: number }, number>({
            query: (id) => ({ url: `/products/${id}`, method: "DELETE" }),
            invalidatesTags: ["Product"],
        }),

        // Catalogue (créations boutique admin)
        listCatalogue: build.query<CatalogueItemOut[], { skip?: number; limit?: number }>({
            query: ({ skip = 0, limit = 100 } = {}) =>
                `/catalogue?skip=${skip}&limit=${limit}`,
            providesTags: ["Catalogue"],
        }),
        createCatalogueItem: build.mutation<
            CatalogueItemOut,
            Omit<CatalogueItemOut, "id" | "created_at">
        >({
            query: (body) => ({ url: "/catalogue", method: "POST", body }),
            invalidatesTags: ["Catalogue"],
        }),
        updateCatalogueItem: build.mutation<
            CatalogueItemOut,
            { id: number } & Partial<Omit<CatalogueItemOut, "id" | "created_at">>
        >({
            query: ({ id, ...body }) => ({
                url: `/catalogue/${id}`,
                method: "PATCH",
                body,
            }),
            invalidatesTags: ["Catalogue"],
        }),
        deleteCatalogueItem: build.mutation<{ deleted: number }, number>({
            query: (id) => ({ url: `/catalogue/${id}`, method: "DELETE" }),
            invalidatesTags: ["Catalogue"],
        }),
        uploadCatalogueImage: build.mutation<ImageUploadResult, FormData>({
            query: (formData) => ({
                url: "/catalogue/upload-image",
                method: "POST",
                body: formData,
            }),
        }),
        processCatalogueImage: build.mutation<ImageProcessResult, FormData>({
            query: (formData) => ({
                url: "/catalogue/process-image",
                method: "POST",
                body: formData,
            }),
        }),

        // Promo codes
        listPromo: build.query<PromoCodeOut[], void>({
            query: () => "/promo",
            providesTags: ["Promo"],
        }),
        createPromoCode: build.mutation<PromoCodeOut, PromoCodeCreate>({
            query: (body) => ({ url: "/promo", method: "POST", body }),
            invalidatesTags: ["Promo"],
        }),
        updatePromoCode: build.mutation<PromoCodeOut, { id: number } & PromoCodeUpdate>({
            query: ({ id, ...body }) => ({ url: `/promo/${id}`, method: "PATCH", body }),
            invalidatesTags: ["Promo"],
        }),
        deletePromoCode: build.mutation<{ deleted: number }, number>({
            query: (id) => ({ url: `/promo/${id}`, method: "DELETE" }),
            invalidatesTags: ["Promo"],
        }),
    }),
});

export const {
    useGetStatsQuery,
    useListUsersQuery,
    useDeleteUserMutation,
    useListDesignsQuery,
    useUpdateDesignStatusMutation,
    useDeleteDesignMutation,
    useListOrdersQuery,
    useUpdateOrderStatusMutation,
    useListProductsQuery,
    useCreateProductMutation,
    useUpdateProductMutation,
    useDeleteProductMutation,
    useListCatalogueQuery,
    useCreateCatalogueItemMutation,
    useUpdateCatalogueItemMutation,
    useDeleteCatalogueItemMutation,
    useUploadCatalogueImageMutation,
    useProcessCatalogueImageMutation,
    useListPromoQuery,
    useCreatePromoCodeMutation,
    useUpdatePromoCodeMutation,
    useDeletePromoCodeMutation,
} = adminApiExtended;
