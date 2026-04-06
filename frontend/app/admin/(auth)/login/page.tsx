"use client";
import { useState, FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAppDispatch } from "@/lib/hooks";
import { setToken } from "@/lib/adminAuthSlice";

export default function AdminLoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const dispatch = useAppDispatch();
  const router = useRouter();
  const searchParams = useSearchParams();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/admin/login`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ password }),
        }
      );
      if (!res.ok) {
        const data = await res.json();
        setError(data.detail ?? "Erreur d'authentification.");
        return;
      }
      const { access_token } = await res.json();
      dispatch(setToken(access_token));
      const next = searchParams.get("next") ?? "/admin";
      router.push(next);
    } catch {
      setError("Impossible de contacter l'API.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{ background: "var(--admin-bg)" }}
      className="min-h-screen flex items-center justify-center"
    >
      <div
        style={{
          background: "var(--admin-card)",
          border: "1px solid var(--admin-border)",
        }}
        className="w-full max-w-sm rounded-xl p-8 shadow-2xl"
      >
        {/* Logo */}
        <div className="flex items-center justify-center gap-1 mb-8">
          <span className="text-[var(--admin-accent)] font-mono font-bold text-2xl">
            OVER
          </span>
          <span className="text-white font-mono font-bold text-2xl">FITTED</span>
        </div>

        <h2 className="text-white font-semibold text-lg text-center mb-6">
          Accès administration
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Champ username caché requis pour l'accessibilité (gestionnaires de mots de passe) */}
          <input
            type="text"
            name="username"
            value="admin"
            autoComplete="username"
            readOnly
            className="sr-only"
            aria-hidden="true"
            tabIndex={-1}
          />
          <div>
            <label
              htmlFor="password"
              className="block text-sm text-[var(--admin-muted-2)] mb-1.5"
            >
              Mot de passe
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              style={{
                background: "var(--admin-sidebar)",
                border: "1px solid var(--admin-border)",
                color: "white",
              }}
              className="w-full px-3 py-2 rounded-md text-sm outline-none focus:ring-2 focus:ring-[var(--admin-accent)] transition"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="text-red-400 text-sm text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{ background: "var(--admin-accent)" }}
            className="w-full py-2 rounded-md text-sm font-semibold text-black hover:opacity-90 disabled:opacity-50 transition"
          >
            {loading ? "Connexion…" : "Connexion"}
          </button>
        </form>
      </div>
    </div>
  );
}
