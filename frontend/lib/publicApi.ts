import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

export interface PublicProduct {
    id: number;
    name: string;
    thumbnail_url: string | null;
    variants?: number;
    synced?: number;
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
    }),
});

export const { useGetPublicProductsQuery } = publicApi;
