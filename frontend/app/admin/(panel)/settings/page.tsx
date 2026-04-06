"use client";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, EyeOff } from "lucide-react";

interface ApiKey {
  label: string;
  envKey: string;
  placeholder: string;
}

const API_KEYS: ApiKey[] = [
  { label: "Stripe Secret Key", envKey: "STRIPE_SECRET_KEY", placeholder: "sk_live_…" },
  { label: "Printful API Key", envKey: "PRINTFUL_API_KEY", placeholder: "••••••••" },
  { label: "OpenAI API Key", envKey: "OPENAI_API_KEY", placeholder: "sk-proj-…" },
  { label: "Admin JWT Secret", envKey: "ADMIN_JWT_SECRET", placeholder: "••••••••" },
];

export default function AdminSettingsPage() {
  const [visible, setVisible] = useState<Record<string, boolean>>({});

  return (
    <div className="space-y-6 max-w-2xl">
      {/* API Keys */}
      <Card
        style={{
          background: "var(--admin-card)",
          border: "1px solid var(--admin-border)",
        }}
      >
        <CardHeader>
          <CardTitle className="text-white text-sm font-semibold">
            Clés API
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-[var(--admin-muted-2)]">
            Ces valeurs sont définies dans le fichier <code className="font-mono bg-white/10 px-1 rounded">.env</code>{" "}
            du backend. Elles ne sont pas modifiables depuis cette interface pour des raisons de sécurité.
          </p>
          {API_KEYS.map(({ label, envKey, placeholder }) => (
            <div key={envKey}>
              <label className="block text-xs text-[var(--admin-muted-2)] mb-1">
                {label}{" "}
                <span className="font-mono text-[var(--admin-accent)]">
                  {envKey}
                </span>
              </label>
              <div className="flex items-center gap-2">
                <input
                  type={visible[envKey] ? "text" : "password"}
                  readOnly
                  value={placeholder}
                  style={{
                    background: "var(--admin-sidebar)",
                    border: "1px solid var(--admin-border)",
                    color: "var(--admin-muted-2)",
                  }}
                  className="flex-1 px-3 py-2 rounded-md text-sm font-mono outline-none cursor-not-allowed"
                />
                <button
                  onClick={() =>
                    setVisible((v) => ({ ...v, [envKey]: !v[envKey] }))
                  }
                  className="text-[var(--admin-muted)] hover:text-white transition-colors"
                >
                  {visible[envKey] ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Infos système */}
      <Card
        style={{
          background: "var(--admin-card)",
          border: "1px solid var(--admin-border)",
        }}
      >
        <CardHeader>
          <CardTitle className="text-white text-sm font-semibold">
            Informations système
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {[
            { label: "Backend", value: process.env.NEXT_PUBLIC_API_URL },
            { label: "Version", value: "0.1.0" },
            { label: "Environnement", value: process.env.NODE_ENV },
          ].map(({ label, value }) => (
            <div key={label} className="flex justify-between text-sm">
              <span className="text-[var(--admin-muted-2)]">{label}</span>
              <span className="text-white font-mono">{value}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Danger zone */}
      <Card
        style={{
          background: "var(--admin-card)",
          border: "1px solid #EF444440",
        }}
      >
        <CardHeader>
          <CardTitle className="text-red-400 text-sm font-semibold">
            Zone dangereuse
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-[var(--admin-muted-2)]">
            Ces actions sont irréversibles. Procéder avec précaution.
          </p>
          <button
            onClick={() =>
              alert("Action non implémentée — connecter à l'endpoint backend.")
            }
            className="px-4 py-2 rounded-md text-sm font-semibold text-red-400 border border-red-400/30 hover:bg-red-400/10 transition"
          >
            Purger les designs en échec
          </button>
        </CardContent>
      </Card>
    </div>
  );
}
