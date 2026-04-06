"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAppDispatch, useAppSelector } from "./hooks";
import { clearToken, hydrateToken } from "./adminAuthSlice";

/**
 * Hook d'authentification admin.
 *
 * - Hydrate le token depuis localStorage au premier rendu (persistance entre
 *   rechargements de page sans serveur).
 * - Expose `isAuthenticated`, `token` et `logout()`.
 * - `logout()` vide le store, supprime localStorage + cookie, redirige vers /admin/login.
 */
export function useAdminAuth() {
    const dispatch = useAppDispatch();
    const router = useRouter();
    const { token, isAuthenticated } = useAppSelector((s) => s.adminAuth);

    // Hydratation au premier rendu (localStorage → Redux)
    useEffect(() => {
        if (!isAuthenticated) {
            dispatch(hydrateToken());
        }
    }, [dispatch, isAuthenticated]);

    const logout = () => {
        dispatch(clearToken());
        router.push("/admin/login");
    };

    return { isAuthenticated, token, logout };
}
