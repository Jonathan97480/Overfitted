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

export const adminApiExtended = adminApi.injectEndpoints({
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
} = adminApiExtended;
