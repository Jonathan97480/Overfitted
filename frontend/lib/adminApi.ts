import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

export const adminApi = createApi({
    reducerPath: "adminApi",
    baseQuery: fetchBaseQuery({
        baseUrl: process.env.NEXT_PUBLIC_API_URL + "/api/admin",
        prepareHeaders: (headers) => {
            if (typeof window !== "undefined") {
                const token = localStorage.getItem("admin_token");
                if (token) headers.set("Authorization", `Bearer ${token}`);
            }
            return headers;
        },
    }),
    tagTypes: ["User", "Design", "Order", "Product", "Tag", "ProductType", "Promo", "Settings", "Stats", "Catalogue", "Invoice", "ShopDesign"],
    endpoints: () => ({}),
});
