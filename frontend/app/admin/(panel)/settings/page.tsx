"use client";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, EyeOff, Zap, CheckCircle, XCircle, Loader2 } from "lucide-react";
import {
    useGetSettingsQuery,
    useTestServiceMutation,
    usePurgeFailedDesignsMutation,
    type ServiceTestResult,
} from "@/lib/adminEndpoints";

const SERVICES = [
    { id: "stripe", label: "Stripe", envKey: "STRIPE_SECRET_KEY" },
    { id: "openai", label: "OpenAI", envKey: "OPENAI_API_KEY" },
    { id: "printful", label: "Printful", envKey: "PRINTFUL_API_KEY" },
] as const;

export default function AdminSettingsPage() {
    const { data: settings = [], isLoading } = useGetSettingsQuery();
    const [testService] = useTestServiceMutation();
    const [purgeFailedDesigns] = usePurgeFailedDesignsMutation();

    const [visible, setVisible] = useState<Record<string, boolean>>({});
    const [testResults, setTestResults] = useState<Record<string, ServiceTestResult>>({});
    const [testingService, setTestingService] = useState<string | null>(null);
    const [purging, setPurging] = useState(false);
    const [purgeCount, setPurgeCount] = useState<number | null>(null);

    async function handleTest(serviceId: string) {
        setTestingService(serviceId);
        try {
            const res = await testService(serviceId).unwrap();
            setTestResults((prev) => ({ ...prev, [serviceId]: res }));
        } catch {
            setTestResults((prev) => ({
                ...prev,
                [serviceId]: { service: serviceId, ok: false, message: "Erreur réseau." },
            }));
        } finally {
            setTestingService(null);
        }
    }

    async function handlePurge() {
        if (!confirm("Supprimer tous les designs en échec ? Action irréversible.")) return;
        setPurging(true);
        try {
            const res = await purgeFailedDesigns().unwrap();
            setPurgeCount(res.deleted);
        } finally {
            setPurging(false);
        }
    }

    const settingByKey = Object.fromEntries(settings.map((s) => [s.key, s]));

    return (
        <div className="space-y-6 max-w-2xl">
            {/* Services */}
            <Card style={{ background: "var(--admin-card)", border: "1px solid var(--admin-border)" }}>
                <CardHeader>
                    <CardTitle className="text-white text-sm font-semibold">
                        Connexions services
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    {SERVICES.map(({ id, label, envKey }) => {
                        const setting = settingByKey[envKey];
                        const result = testResults[id];
                        const isTesting = testingService === id;
                        return (
                            <div
                                key={id}
                                className="flex items-center justify-between px-3 py-2 rounded-md"
                                style={{ background: "var(--admin-sidebar)", border: "1px solid var(--admin-border)" }}
                            >
                                <div className="flex items-center gap-3">
                                    <span className="text-sm text-white font-medium w-20">{label}</span>
                                    {isLoading ? (
                                        <span className="text-xs text-[var(--admin-muted-2)]">…</span>
                                    ) : setting?.is_set ? (
                                        <span className="text-xs font-mono text-[var(--admin-muted-2)]">
                                            {setting.preview}
                                        </span>
                                    ) : (
                                        <span className="text-xs text-red-400">non configurée</span>
                                    )}
                                </div>
                                <div className="flex items-center gap-2">
                                    {result && (
                                        <span
                                            className={`flex items-center gap-1 text-xs font-semibold ${result.ok ? "text-green-400" : "text-red-400"
                                                }`}
                                        >
                                            {result.ok ? (
                                                <CheckCircle size={12} />
                                            ) : (
                                                <XCircle size={12} />
                                            )}
                                            {result.message}
                                        </span>
                                    )}
                                    <button
                                        onClick={() => handleTest(id)}
                                        disabled={isTesting || !setting?.is_set}
                                        className="flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold text-[var(--admin-accent)] border border-[var(--admin-accent)]/30 hover:bg-[var(--admin-accent)]/10 transition disabled:opacity-40 disabled:cursor-not-allowed"
                                    >
                                        {isTesting ? (
                                            <Loader2 size={11} className="animate-spin" />
                                        ) : (
                                            <Zap size={11} />
                                        )}
                                        Tester
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </CardContent>
            </Card>

            {/* Clés API */}
            <Card style={{ background: "var(--admin-card)", border: "1px solid var(--admin-border)" }}>
                <CardHeader>
                    <CardTitle className="text-white text-sm font-semibold">Clés API</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p className="text-xs text-[var(--admin-muted-2)]">
                        Valeurs définies dans le fichier{" "}
                        <code className="font-mono bg-white/10 px-1 rounded">.env</code>{" "}
                        du backend. Non modifiables depuis l&apos;interface.
                    </p>
                    {isLoading ? (
                        <div className="space-y-2">
                            {[...Array(5)].map((_, i) => (
                                <div key={i} className="h-9 rounded-md animate-pulse" style={{ background: "var(--admin-sidebar)" }} />
                            ))}
                        </div>
                    ) : (
                        settings.map(({ key, label, is_set, preview }) => (
                            <div key={key}>
                                <label className="block text-xs text-[var(--admin-muted-2)] mb-1">
                                    {label}{" "}
                                    <span className="font-mono text-[var(--admin-accent)]">{key}</span>
                                </label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type={visible[key] ? "text" : "password"}
                                        readOnly
                                        value={is_set ? preview : "(non défini)"}
                                        style={{
                                            background: "var(--admin-sidebar)",
                                            border: `1px solid ${is_set ? "var(--admin-border)" : "#EF444440"}`,
                                            color: is_set ? "var(--admin-muted-2)" : "#F87171",
                                        }}
                                        className="flex-1 px-3 py-2 rounded-md text-sm font-mono outline-none cursor-not-allowed"
                                    />
                                    {is_set && (
                                        <button
                                            onClick={() =>
                                                setVisible((v) => ({ ...v, [key]: !v[key] }))
                                            }
                                            className="text-[var(--admin-muted)] hover:text-white transition-colors"
                                        >
                                            {visible[key] ? <EyeOff size={15} /> : <Eye size={15} />}
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </CardContent>
            </Card>

            {/* Infos système */}
            <Card style={{ background: "var(--admin-card)", border: "1px solid var(--admin-border)" }}>
                <CardHeader>
                    <CardTitle className="text-white text-sm font-semibold">
                        Informations système
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                    {[
                        { label: "Backend", value: process.env.NEXT_PUBLIC_API_URL ?? "—" },
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
            <Card style={{ background: "var(--admin-card)", border: "1px solid #EF444440" }}>
                <CardHeader>
                    <CardTitle className="text-red-400 text-sm font-semibold">
                        Zone dangereuse
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    <p className="text-xs text-[var(--admin-muted-2)]">
                        Ces actions sont irréversibles. Procéder avec précaution.
                    </p>
                    <div className="flex items-center gap-4">
                        <button
                            onClick={handlePurge}
                            disabled={purging}
                            className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold text-red-400 border border-red-400/30 hover:bg-red-400/10 transition disabled:opacity-50"
                        >
                            {purging && <Loader2 size={13} className="animate-spin" />}
                            Purger les designs en échec
                        </button>
                        {purgeCount !== null && (
                            <span className="text-xs text-[var(--admin-muted-2)]">
                                {purgeCount} design{purgeCount !== 1 ? "s" : ""} supprimé{purgeCount !== 1 ? "s" : ""}
                            </span>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

