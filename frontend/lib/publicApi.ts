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
    }),
});

export const { useGetPublicProductsQuery, useGetProductByIdQuery } = publicApi;
