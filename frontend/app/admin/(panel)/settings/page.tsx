"use client";
import { useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Zap, CheckCircle, XCircle, Loader2, Save } from "lucide-react";
import {
    useGetSettingsQuery,
    useTestServiceMutation,
    usePatchSettingsMutation,
    usePurgeFailedDesignsMutation,
    type ServiceTestResult,
} from "@/lib/adminEndpoints";
import { ApiKeyField } from "@/components/admin/ApiKeyField";

type FieldType = "password" | "text";

interface FieldDef {
    key: string;
    label: string;
    type: FieldType;
    placeholder?: string;
}

interface SectionDef {
    id: string;
    title: string;
    subtitle: string;
    testService: string;
    fields: FieldDef[];
}

const SECTIONS: SectionDef[] = [
    {
        id: "llm",
        title: "IA / LLM",
        subtitle: "LM Studio, Ollama ou toute API compatible OpenAI",
        testService: "llm",
        fields: [
            { key: "LLM_BASE_URL", label: "URL de base", type: "text", placeholder: "http://localhost:1234" },
            { key: "LLM_MODEL", label: "Modele", type: "text", placeholder: "gemma-4-e4b-it" },
        ],
    },
    {
        id: "printful",
        title: "Printful",
        subtitle: "Impression et expedition a la demande",
        testService: "printful",
        fields: [
            { key: "PRINTFUL_API_KEY", label: "API Key", type: "password" },
            { key: "PRINTFUL_STORE_ID", label: "Store ID", type: "text", placeholder: "Ex: 12345678 — visible dans votre dashboard Printful" },
        ],
    },
    {
        id: "stripe",
        title: "Stripe",
        subtitle: "Paiement en ligne",
        testService: "stripe",
        fields: [
            { key: "STRIPE_SECRET_KEY", label: "Secret Key", type: "password" },
            { key: "STRIPE_WEBHOOK_SECRET", label: "Webhook Secret", type: "password" },
        ],
    },
    {
        id: "openai",
        title: "OpenAI",
        subtitle: "Cloud fallback — generation IA",
        testService: "openai",
        fields: [
            { key: "OPENAI_API_KEY", label: "API Key", type: "password" },
        ],
    },
];

const ADVANCED_KEYS = ["ADMIN_PASSWORD", "ADMIN_JWT_SECRET", "DATABASE_URL", "REDIS_URL"];

export default function AdminSettingsPage() {
    const { data: settings = [], isLoading } = useGetSettingsQuery();
    const [testService] = useTestServiceMutation();
    const [patchSettings] = usePatchSettingsMutation();
    const [purgeFailedDesigns] = usePurgeFailedDesignsMutation();

    const [fieldValues, setFieldValues] = useState<Record<string, Record<string, string>>>({});
    const [savingSection, setSavingSection] = useState<string | null>(null);
    const [testResults, setTestResults] = useState<Record<string, ServiceTestResult>>({});
    const [testingService, setTestingService] = useState<string | null>(null);
    const [purging, setPurging] = useState(false);
    const [purgeCount, setPurgeCount] = useState<number | null>(null);

    const settingByKey = Object.fromEntries(settings.map((s) => [s.key, s]));

    function setField(sectionId: string, key: string, value: string) {
        setFieldValues((prev) => ({
            ...prev,
            [sectionId]: { ...(prev[sectionId] ?? {}), [key]: value },
        }));
    }

    async function handleSave(sectionId: string, keys: string[]) {
        const vals = fieldValues[sectionId] ?? {};
        const toSave = Object.fromEntries(
            keys.filter((k) => vals[k]?.trim()).map((k) => [k, vals[k].trim()])
        );
        if (!Object.keys(toSave).length) {
            toast.info("Aucune modification a sauvegarder.");
            return;
        }
        setSavingSection(sectionId);
        try {
            await patchSettings({ settings: toSave }).unwrap();
            toast.success("Parametres sauvegardes.");
            setFieldValues((prev) => ({ ...prev, [sectionId]: {} }));
        } catch {
            toast.error("Erreur lors de la sauvegarde.");
        } finally {
            setSavingSection(null);
        }
    }

    async function handleTest(serviceId: string) {
        setTestingService(serviceId);
        try {
            const res = await testService(serviceId).unwrap();
            setTestResults((prev) => ({ ...prev, [serviceId]: res }));
        } catch {
            setTestResults((prev) => ({
                ...prev,
                [serviceId]: { service: serviceId, ok: false, message: "Erreur reseau." },
            }));
        } finally {
            setTestingService(null);
        }
    }

    async function handlePurge() {
        if (!confirm("Supprimer tous les designs en echec ? Action irreversible.")) return;
        setPurging(true);
        try {
            const res = await purgeFailedDesigns().unwrap();
            setPurgeCount(res.deleted);
        } finally {
            setPurging(false);
        }
    }

    return (
        <div className="space-y-6 max-w-2xl">
            {SECTIONS.map((section) => {
                const vals = fieldValues[section.id] ?? {};
                const result = testResults[section.testService];
                const isTesting = testingService === section.testService;
                const isSaving = savingSection === section.id;
                const sectionKeys = section.fields.map((f) => f.key);
                const hasUnsaved = sectionKeys.some((k) => vals[k]?.trim());

                return (
                    <Card
                        key={section.id}
                        style={{ background: "var(--admin-card)", border: "1px solid var(--admin-border)" }}
                    >
                        <CardHeader className="pb-3">
                            <div className="flex items-start justify-between">
                                <div>
                                    <CardTitle className="text-white text-sm font-semibold">
                                        {section.title}
                                    </CardTitle>
                                    <p className="text-xs text-[var(--admin-muted-2)] mt-0.5">{section.subtitle}</p>
                                </div>
                                {result && (
                                    <span
                                        className={`flex items-center gap-1 text-xs font-semibold ${result.ok ? "text-green-400" : "text-red-400"
                                            }`}
                                    >
                                        {result.ok ? <CheckCircle size={12} /> : <XCircle size={12} />}
                                        {result.message}
                                    </span>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {section.fields.map((field) => {
                                const setting = settingByKey[field.key];
                                return (
                                    <ApiKeyField
                                        key={field.key}
                                        label={field.label}
                                        envKey={field.key}
                                        type={field.type}
                                        value={vals[field.key] ?? ""}
                                        onChange={(v) => setField(section.id, field.key, v)}
                                        placeholder={field.placeholder ?? (setting?.is_set ? setting.preview : undefined)}
                                        isSet={setting?.is_set}
                                        preview={setting?.preview}
                                    />
                                );
                            })}
                            <div className="flex items-center justify-between pt-1">
                                <button
                                    onClick={() => handleTest(section.testService)}
                                    disabled={isTesting}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold text-[var(--admin-accent)] border border-[var(--admin-accent)]/30 hover:bg-[var(--admin-accent)]/10 transition disabled:opacity-40"
                                >
                                    {isTesting ? (
                                        <Loader2 size={11} className="animate-spin" />
                                    ) : (
                                        <Zap size={11} />
                                    )}
                                    Tester la connexion
                                </button>
                                <button
                                    onClick={() => handleSave(section.id, sectionKeys)}
                                    disabled={isSaving || !hasUnsaved}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold bg-[var(--admin-accent)] text-white hover:bg-[var(--admin-accent)]/90 transition disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                    {isSaving ? (
                                        <Loader2 size={11} className="animate-spin" />
                                    ) : (
                                        <Save size={11} />
                                    )}
                                    Sauvegarder
                                </button>
                            </div>
                        </CardContent>
                    </Card>
                );
            })}

            {/* Configuration avancee */}
            <Card style={{ background: "var(--admin-card)", border: "1px solid var(--admin-border)" }}>
                <CardHeader>
                    <CardTitle className="text-white text-sm font-semibold">Configuration avancee</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    <p className="text-xs text-[var(--admin-muted-2)]">
                        Cles systeme — modifiables uniquement via le fichier{" "}
                        <code className="font-mono bg-white/10 px-1 rounded">.env</code> backend.
                    </p>
                    {isLoading ? (
                        <div className="space-y-2">
                            {[...Array(4)].map((_, i) => (
                                <div
                                    key={i}
                                    className="h-7 rounded-md animate-pulse"
                                    style={{ background: "var(--admin-sidebar)" }}
                                />
                            ))}
                        </div>
                    ) : (
                        ADVANCED_KEYS.map((key) => {
                            const s = settingByKey[key];
                            return (
                                <div key={key} className="flex items-center justify-between text-xs">
                                    <span className="font-mono text-[var(--admin-accent)]">{key}</span>
                                    {s?.is_set ? (
                                        <span className="font-mono text-[var(--admin-muted-2)]">{s.preview}</span>
                                    ) : (
                                        <span className="text-red-400">non configuree</span>
                                    )}
                                </div>
                            );
                        })
                    )}
                </CardContent>
            </Card>

            {/* Informations systeme */}
            <Card style={{ background: "var(--admin-card)", border: "1px solid var(--admin-border)" }}>
                <CardHeader>
                    <CardTitle className="text-white text-sm font-semibold">
                        Informations systeme
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

            {/* Zone dangereuse */}
            <Card style={{ background: "var(--admin-card)", border: "1px solid #EF444440" }}>
                <CardHeader>
                    <CardTitle className="text-red-400 text-sm font-semibold">
                        Zone dangereuse
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    <p className="text-xs text-[var(--admin-muted-2)]">
                        Ces actions sont irreversibles. Proceder avec precaution.
                    </p>
                    <div className="flex items-center gap-4">
                        <button
                            onClick={handlePurge}
                            disabled={purging}
                            className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold text-red-400 border border-red-400/30 hover:bg-red-400/10 transition disabled:opacity-50"
                        >
                            {purging && <Loader2 size={13} className="animate-spin" />}
                            Purger les designs en echec
                        </button>
                        {purgeCount !== null && (
                            <span className="text-xs text-[var(--admin-muted-2)]">
                                {purgeCount} design{purgeCount !== 1 ? "s" : ""} supprime{purgeCount !== 1 ? "s" : ""}
                            </span>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}