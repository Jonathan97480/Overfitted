import { configureStore, type Middleware } from "@reduxjs/toolkit";
import { adminApi } from "./adminApi";
import { adminAuthSlice } from "./adminAuthSlice";
import { publicApi } from "./publicApi";
import { shopSlice } from "./slices/shopSlice";
import { cartSlice } from "./slices/cartSlice";
import { uploadSlice } from "./slices/uploadSlice";
import { designSlice } from "./slices/designSlice";
import { cartPersistMiddleware, loadCartFromStorage } from "./cartPersistMiddleware";

const preloadedCart = loadCartFromStorage();

const store = configureStore({
    reducer: {
        adminAuth: adminAuthSlice.reducer,
        shop: shopSlice.reducer,
        cart: cartSlice.reducer,
        upload: uploadSlice.reducer,
        design: designSlice.reducer,
        [adminApi.reducerPath]: adminApi.reducer,
        [publicApi.reducerPath]: publicApi.reducer,
    },
    preloadedState: Object.keys(preloadedCart).length > 0
        ? { cart: preloadedCart as ReturnType<typeof cartSlice.reducer> }
        : undefined,
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware().concat(
            adminApi.middleware as Middleware,
            publicApi.middleware as Middleware,
            cartPersistMiddleware
        ),
});

export { store };
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
