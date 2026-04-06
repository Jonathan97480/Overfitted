import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface AdminAuthState {
  token: string | null;
  isAuthenticated: boolean;
}

const initialState: AdminAuthState = {
  token: null,
  isAuthenticated: false,
};

export const adminAuthSlice = createSlice({
  name: "adminAuth",
  initialState,
  reducers: {
    setToken(state, action: PayloadAction<string>) {
      state.token = action.payload;
      state.isAuthenticated = true;
      if (typeof window !== "undefined") {
        localStorage.setItem("admin_token", action.payload);
        // Cookie pour le middleware SSR (path=/ ; SameSite=Strict)
        document.cookie = `admin_token=${action.payload}; path=/; SameSite=Strict; Max-Age=${8 * 3600}`;
      }
    },
    clearToken(state) {
      state.token = null;
      state.isAuthenticated = false;
      if (typeof window !== "undefined") {
        localStorage.removeItem("admin_token");
        document.cookie = "admin_token=; path=/; Max-Age=0";
      }
    },
    hydrateToken(state) {
      if (typeof window !== "undefined") {
        const token = localStorage.getItem("admin_token");
        if (token) {
          state.token = token;
          state.isAuthenticated = true;
        }
      }
    },
  },
});

export const { setToken, clearToken, hydrateToken } = adminAuthSlice.actions;
