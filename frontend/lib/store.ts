import { configureStore } from "@reduxjs/toolkit";
import { adminApi } from "./adminApi";
import { adminAuthSlice } from "./adminAuthSlice";
import { publicApi } from "./publicApi";

export const store = configureStore({
    reducer: {
        adminAuth: adminAuthSlice.reducer,
        [adminApi.reducerPath]: adminApi.reducer,
        [publicApi.reducerPath]: publicApi.reducer,
    },
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware().concat(adminApi.middleware, publicApi.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
