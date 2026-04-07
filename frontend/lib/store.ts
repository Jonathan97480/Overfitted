import { configureStore } from "@reduxjs/toolkit";
import { adminApi } from "./adminApi";
import { adminAuthSlice } from "./adminAuthSlice";
import { publicApi } from "./publicApi";
import { shopSlice } from "./slices/shopSlice";
import { cartSlice } from "./slices/cartSlice";

export const store = configureStore({
    reducer: {
        adminAuth: adminAuthSlice.reducer,
        shop: shopSlice.reducer,
        cart: cartSlice.reducer,
        [adminApi.reducerPath]: adminApi.reducer,
        [publicApi.reducerPath]: publicApi.reducer,
    },
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware().concat(adminApi.middleware, publicApi.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
