import { adminApi } from "./adminApi";

export interface StatsResponse {
    total_users: number;
    total_designs: number;
    total_orders: number;
    total_revenue: number;
    orders_by_status: Record<string, number>;
    designs_by_status: Record<string, number>;
    delta_users: number;
    delta_designs: number;
    delta_orders: number;
    delta_revenue: number;
}

export interface UserOut {
    id: number;
    username: string;
    email: string;
}

export interface UserStatsOut {
    user_id: number;
    username: string;
    email: string;
    designs_count: number;
    orders_count: number;
    orders_paid_count: number;
    designs: { id: number; status: string; dpi: number | null; created_at: string }[];
    orders: { id: number; status: string; design_id: number; stripe_session_id: string | null; created_at: string }[];
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

export interface TagOut {
    id: number;
    name: string;
    slug: string;
    color: string;
}

export interface ProductVariantOut {
    id: number;
    product_id: number;
    printful_variant_id: string;
    color: string | null;
    size: string | null;
    printful_cost_ht: number;
    price: number;
}

export interface ProductOut {
    id: number;
    name: string;
    category: string | null;
    image_url: string | null;
    design_price_ht: number;
    shop_margin_rate: number;
    tva_rate: number;
    /** Prix TTC minimum parmi les variantes */
    price: number;
    printful_catalog_product_id: number | null;
    design_url: string | null;
    mockup_url: string | null;
    placement_json: string | null;
    variants: ProductVariantOut[];
    tags: TagOut[];
}

export interface PrintfulCatalogProduct {
    id: number;
    type: string;
    type_name: string;  // v1: ex. "T-Shirt" | v2: copie de name
    name: string;       // v2: nom complet ex. "Unisex Hoodie | Stanley/Stella STSU177"
    brand: string;
    model: string;
    image: string;
    variant_count: number;
}

export interface PrintfulCatalogVariant {
    id: number;
    product_id: number;
    name: string;
    size: string;
    color: string;
    color_code: string;
    color_code2: string | null;
    price: string;
    in_stock: boolean;
}

export interface PrintfulCatalogProductDetail {
    product: PrintfulCatalogProduct;
    variants: PrintfulCatalogVariant[];
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
    variants_json: string | null;
    design_url: string | null;
    placement_json: string | null;
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

export interface SettingOut {
    key: string;
    label: string;
    is_set: boolean;
    preview: string;
}

export interface ServiceTestResult {
    service: string;
    ok: boolean;
    message: string;
}

export interface InvoiceItemSchema {
    description: string;
    quantity: number;
    unit_price_ht: number;
}

export interface AddressSchema {
    line1: string;
    line2?: string | null;
    city: string;
    postal_code: string;
    country?: string;
}

export interface InvoiceOut {
    id: number;
    order_id: number;
    invoice_number: string;
    issued_at: string;
    user_email: string;
    user_name: string;
    billing_address: string | null;
    shipping_address: string | null;
    items_json: string;
    amount_ht: number;
    tva_rate: number;
    amount_tva: number;
    amount_ttc: number;
    promo_code: string | null;
    discount_amount: number;
}

export interface InvoiceCreate {
    order_id: number;
    user_email: string;
    user_name: string;
    billing_address?: AddressSchema | null;
    shipping_address?: AddressSchema | null;
    items: InvoiceItemSchema[];
    tva_rate?: number;
    promo_code?: string | null;
    discount_amount?: number;
}

// ─── Stats avancées ────────────────────────────────────────────────────────

export interface DayPoint {
    date: string;
    value: number;
}

export interface PageViewItem {
    url: string;
    views: number;
}

export interface TrafficStats {
    orders_per_day: DayPoint[];
    designs_per_day: DayPoint[];
    period_days: number;
    top_pages: PageViewItem[];
}

export interface ProductStatItem {
    id: number;
    name: string;
    category: string | null;
    sales_count: number;
    revenue: number;
    views_count: number;
}

export interface ProductsStats {
    top_products: ProductStatItem[];
    top_designs_by_orders: { design_id: number; orders_count: number }[];
}

export interface FinanceDayPoint {
    date: string;
    revenue: number;
    costs: number;
    margin: number;
}

export interface FinanceStats {
    days: FinanceDayPoint[];
    total_revenue: number;
    total_costs: number;
    total_margin: number;
    avg_order_value: number;
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
        getUserStats: build.query<UserStatsOut, number>({
            query: (id) => `/users/${id}/stats`,
            providesTags: ["User"],
        }),

        // Designs
        listDesigns: build.query<DesignOut[], { skip?: number; limit?: number }>({
            query: ({ skip = 0, limit = 50 } = {}) =>
                `/designs?skip=${skip}&limit=${limit}`,
            providesTags: ["Design"],
        }),
        getDesign: build.query<DesignOut, number>({
            query: (id) => `/designs/${id}`,
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
            Omit<ProductOut, "id" | "variants"> & { variants?: { printful_variant_id: string; color?: string | null; size?: string | null; printful_cost_ht?: number }[] }
        >({
            query: (body) => ({ url: "/products", method: "POST", body }),
            invalidatesTags: ["Product"],
        }),
        updateProduct: build.mutation<
            ProductOut,
            {
                id: number;
                name?: string;
                category?: string | null;
                image_url?: string | null;
                design_price_ht?: number;
                shop_margin_rate?: number;
                tva_rate?: number;
                printful_catalog_product_id?: number | null;
                design_url?: string | null;
                mockup_url?: string | null;
                placement_json?: string | null;
            }
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
        updateProductVariant: build.mutation<
            ProductVariantOut,
            { product_id: number; variant_id: number; color?: string | null; size?: string | null; printful_cost_ht?: number }
        >({
            query: ({ product_id, variant_id, ...body }) => ({
                url: `/products/${product_id}/variants/${variant_id}`,
                method: "PATCH",
                body,
            }),
            invalidatesTags: ["Product"],
        }),
        deleteProductVariant: build.mutation<{ deleted: number }, { product_id: number; variant_id: number }>({
            query: ({ product_id, variant_id }) => ({
                url: `/products/${product_id}/variants/${variant_id}`,
                method: "DELETE",
            }),
            invalidatesTags: ["Product"],
        }),
        syncPrintfulProducts: build.mutation<{ synced: number; updated: number; variants_added: number }, void>({
            query: () => ({ url: "/products/sync-printful", method: "POST" }),
            invalidatesTags: ["Product"],
        }),
        publishProduct: build.mutation<CatalogueItemOut, number>({
            query: (id) => ({ url: `/products/${id}/publish`, method: "POST" }),
            invalidatesTags: ["Product", "Catalogue"],
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

        // Settings
        getSettings: build.query<SettingOut[], void>({
            query: () => "/settings",
            providesTags: ["Settings"],
        }),
        patchSettings: build.mutation<{ updated: string[] }, { settings: Record<string, string> }>({
            query: (body) => ({ url: "/settings", method: "PATCH", body }),
            invalidatesTags: ["Settings"],
        }),
        testService: build.mutation<ServiceTestResult, string>({
            query: (service) => ({ url: `/settings/test/${service}`, method: "POST" }),
        }),
        purgeFailedDesigns: build.mutation<{ deleted: number }, void>({
            query: () => ({ url: "/settings/purge-failed-designs", method: "POST" }),
            invalidatesTags: ["Design", "Stats"],
        }),

        // Invoices
        listInvoices: build.query<
            InvoiceOut[],
            { skip?: number; limit?: number; search?: string; date_from?: string; date_to?: string }
        >({
            query: ({ skip = 0, limit = 100, search, date_from, date_to } = {}) => {
                const params = new URLSearchParams({ skip: String(skip), limit: String(limit) });
                if (search) params.set("search", search);
                if (date_from) params.set("date_from", date_from);
                if (date_to) params.set("date_to", date_to);
                return `/invoices?${params.toString()}`;
            },
            providesTags: ["Invoice"],
        }),
        createInvoice: build.mutation<InvoiceOut, InvoiceCreate>({
            query: (body) => ({ url: "/invoices", method: "POST", body }),
            invalidatesTags: ["Invoice"],
        }),

        // Stats avancées
        getTrafficStats: build.query<TrafficStats, { days?: number }>({
            query: ({ days = 30 } = {}) => `/stats/traffic?days=${days}`,
            providesTags: ["Stats"],
        }),
        getProductsStats: build.query<ProductsStats, void>({
            query: () => "/stats/products",
            providesTags: ["Stats"],
        }),
        getFinanceStats: build.query<FinanceStats, { days?: number }>({
            query: ({ days = 30 } = {}) => `/stats/finance?days=${days}`,
            providesTags: ["Stats"],
        }),

        // Catalogue Printful (parcourir + ajouter au store)
        browsePrintfulCatalog: build.query<
            { result: PrintfulCatalogProduct[]; paging?: { total: number; offset: number; limit: number } },
            { offset?: number; limit?: number; search?: string; category_id?: number }
        >({
            query: ({ offset = 0, limit = 20, search, category_id } = {}) => {
                const params = new URLSearchParams({ offset: String(offset), limit: String(limit) });
                if (search) params.set("search", search);
                if (category_id !== undefined) params.set("category_id", String(category_id));
                return `/printful/catalog?${params.toString()}`;
            },
        }),
        getPrintfulCatalogProduct: build.query<{ result: PrintfulCatalogProductDetail }, number>({
            query: (id) => `/printful/catalog/${id}`,
        }),
        addPrintfulProductToStore: build.mutation<
            { product_id: number; synced: number },
            { name: string; variants: { id: number; name: string; price: string }[]; thumbnail?: string; catalog_product_id?: number }
        >({
            query: (body) => ({ url: "/printful/store-products", method: "POST", body }),
            invalidatesTags: ["Product"],
        }),
        generateMockup: build.mutation<
            { mockup_url: string; placement_json: Record<string, unknown> },
            {
                printful_catalog_product_id: number;
                variant_id: number;
                design_url: string;
                placement?: string;
                area_width?: number;
                area_height?: number;
                design_width?: number;
                design_height?: number;
                position_top?: number;
                position_left?: number;
            }
        >({
            query: (body) => ({ url: "/catalog/generate-mockup", method: "POST", body }),
        }),
        getMockupTemplates: build.query<{ templates: PrintfulTemplate[]; available_placements: Record<string, string> }, number>({
            query: (productId) => `/catalog/mockup-templates/${productId}`,
        }),

        // Designs Shop
        listShopDesigns: build.query<ShopDesignOut[], void>({
            query: () => "/designs-shop",
            providesTags: ["ShopDesign"],
        }),
        uploadShopDesign: build.mutation<ShopDesignOut, FormData>({
            query: (body) => ({ url: "/designs-shop/upload", method: "POST", body }),
            invalidatesTags: ["ShopDesign"],
        }),
        processShopDesign: build.mutation<ShopDesignOut, { id: number; remove_bg?: boolean; upscale?: boolean; vectorize?: boolean }>({
            query: ({ id, ...body }) => ({ url: `/designs-shop/${id}/process`, method: "POST", body }),
            invalidatesTags: ["ShopDesign"],
        }),
        deleteShopDesign: build.mutation<{ deleted: number }, number>({
            query: (id) => ({ url: `/designs-shop/${id}`, method: "DELETE" }),
            invalidatesTags: ["ShopDesign"],
        }),

        // Tags
        listTags: build.query<TagOut[], void>({
            query: () => "/tags",
            providesTags: ["Tag"],
        }),
        createTag: build.mutation<TagOut, { name: string; color?: string }>({
            query: (body) => ({ url: "/tags", method: "POST", body }),
            invalidatesTags: ["Tag"],
        }),
        updateTag: build.mutation<TagOut, { id: number; name?: string; color?: string }>({
            query: ({ id, ...body }) => ({ url: `/tags/${id}`, method: "PATCH", body }),
            invalidatesTags: ["Tag"],
        }),
        deleteTag: build.mutation<{ deleted: number }, number>({
            query: (id) => ({ url: `/tags/${id}`, method: "DELETE" }),
            invalidatesTags: ["Tag", "Product"],
        }),
        setProductTags: build.mutation<ProductOut, { product_id: number; tag_ids: number[] }>({
            query: ({ product_id, tag_ids }) => ({ url: `/products/${product_id}/tags`, method: "PUT", body: { tag_ids } }),
            invalidatesTags: ["Product"],
        }),
    }),
});

export interface PrintfulTemplate {
    placement: string;
    template_id: number;
    image_url: string;
    background_url: string;
    template_width: number;
    template_height: number;
    print_area_width: number;
    print_area_height: number;
    print_area_top: number;
    print_area_left: number;
    is_default: boolean;
}

export interface ShopDesignOut {
    id: number;
    filename: string;
    url: string;
    dpi: number | null;
    print_ready: boolean;
    bg_removed: boolean;
    upscaled: boolean;
    vectorized: boolean;
    created_at: string;
}

export const {
    useGetStatsQuery,
    useListUsersQuery,
    useDeleteUserMutation,
    useGetUserStatsQuery,
    useListDesignsQuery,
    useGetDesignQuery,
    useUpdateDesignStatusMutation,
    useDeleteDesignMutation,
    useListOrdersQuery,
    useUpdateOrderStatusMutation,
    useListProductsQuery,
    useCreateProductMutation,
    useUpdateProductMutation,
    useDeleteProductMutation,
    useUpdateProductVariantMutation,
    useDeleteProductVariantMutation,
    useSyncPrintfulProductsMutation,
    usePublishProductMutation,
    useListShopDesignsQuery,
    useUploadShopDesignMutation,
    useProcessShopDesignMutation,
    useDeleteShopDesignMutation,
    useListTagsQuery,
    useCreateTagMutation,
    useUpdateTagMutation,
    useDeleteTagMutation,
    useSetProductTagsMutation,
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
    useGetSettingsQuery,
    usePatchSettingsMutation,
    useTestServiceMutation,
    usePurgeFailedDesignsMutation,
    useListInvoicesQuery,
    useCreateInvoiceMutation,
    useGetTrafficStatsQuery,
    useGetProductsStatsQuery,
    useGetFinanceStatsQuery,
    useBrowsePrintfulCatalogQuery,
    useGetPrintfulCatalogProductQuery,
    useAddPrintfulProductToStoreMutation,
    useGenerateMockupMutation,
    useGetMockupTemplatesQuery,
} = adminApiExtended;
