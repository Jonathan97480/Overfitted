"use client";

import { useEffect, useState } from "react";
import { Settings2, X } from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface ConsentState {
    functional: true; // toujours true, non modifiable
    analytics: boolean;
}

type ConsentVersion = 1;

interface StoredConsent {
    v: ConsentVersion;
    consent: ConsentState;
    ts: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const COOKIE_NAME = "ovf_consent";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 395; // 13 mois (CNIL max)

function readConsent(): StoredConsent | null {
    const match = document.cookie
        .split("; ")
        .find((r) => r.startsWith(`${COOKIE_NAME}=`));
    if (!match) return null;
    try {
        return JSON.parse(decodeURIComponent(match.split("=")[1])) as StoredConsent;
    } catch {
        return null;
    }
}

function writeConsent(analytics: boolean) {
    const payload: StoredConsent = {
        v: 1,
        consent: { functional: true, analytics },
        ts: Date.now(),
    };
    document.cookie = `${COOKIE_NAME}=${encodeURIComponent(
        JSON.stringify(payload)
    )}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
}

// ── Toggle ────────────────────────────────────────────────────────────────────

function Toggle({
    checked,
    disabled,
    onChange,
    id,
}: {
    checked: boolean;
    disabled?: boolean;
    onChange?: (v: boolean) => void;
    id: string;
}) {
    return (
        <button
            id={id}
            role="switch"
            aria-checked={checked}
            disabled={disabled}
            onClick={() => onChange?.(!checked)}
            className={`relative inline-flex h-5 w-9 flex-shrink-0 rounded-full transition-colors focus:outline-none ${disabled
                    ? "bg-[#1E293B] cursor-not-allowed opacity-60"
                    : checked
                        ? "bg-[#FF6B00] cursor-pointer"
                        : "bg-[#1E293B] cursor-pointer"
                }`}
        >
            <span
                className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform mt-[3px] ${checked ? "translate-x-[18px]" : "translate-x-[3px]"
                    }`}
            />
        </button>
    );
}

// ── CookieSettingsModal ───────────────────────────────────────────────────────

function CookieSettingsModal({
    analytics: initialAnalytics,
    onSave,
    onClose,
}: {
    analytics: boolean;
    onSave: (analytics: boolean) => void;
    onClose: () => void;
}) {
    const [analytics, setAnalytics] = useState(initialAnalytics);

    return (
        <div
            className="fixed inset-0 z-[200] flex items-center justify-center px-4"
            role="dialog"
            aria-modal="true"
            aria-label="Paramètres cookies"
        >
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                onClick={onClose}
            />

            <div className="relative z-10 w-full max-w-md bg-[#0A1628] border border-[#00F0FF]/20 font-mono">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-[#00F0FF]/15 bg-[#050A14]">
                    <span className="text-[10px] uppercase tracking-widest text-[#00F0FF]">
                        COOKIE_SETTINGS
                    </span>
                    <button onClick={onClose} className="text-[#475569] hover:text-white transition-colors">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-5 space-y-5">
                    <p className="text-xs text-[#475569] leading-relaxed">
                        Gérez vos préférences. Les cookies fonctionnels sont requis pour le
                        fonctionnement du site et ne peuvent pas être désactivés.
                    </p>

                    {/* Fonctionnels */}
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <label
                                htmlFor="toggle-functional"
                                className="text-xs text-white uppercase tracking-widest"
                            >
                                Fonctionnels
                            </label>
                            <p className="text-[10px] text-[#475569] mt-0.5 leading-snug">
                                Session d'authentification, choix de consentement.
                                Obligatoires — toujours actifs.
                            </p>
                        </div>
                        <Toggle id="toggle-functional" checked disabled />
                    </div>

                    <hr className="border-[#1E293B]" />

                    {/* Analytics */}
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <label
                                htmlFor="toggle-analytics"
                                className="text-xs text-white uppercase tracking-widest cursor-pointer"
                            >
                                Analytics
                            </label>
                            <p className="text-[10px] text-[#475569] mt-0.5 leading-snug">
                                Compteurs anonymisés (côté serveur). Aucun traceur tiers.
                            </p>
                        </div>
                        <Toggle
                            id="toggle-analytics"
                            checked={analytics}
                            onChange={setAnalytics}
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="px-5 pb-5 flex gap-3 justify-end">
                    <button
                        onClick={onClose}
                        className="text-[10px] uppercase tracking-widest text-[#475569] hover:text-white transition-colors px-3 py-2"
                    >
                        Annuler
                    </button>
                    <button
                        onClick={() => onSave(analytics)}
                        className="text-[10px] uppercase tracking-widest bg-[#FF6B00] text-black px-4 py-2 hover:bg-[#FF6B00]/90 transition-colors"
                    >
                        Enregistrer
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── CookieBanner ──────────────────────────────────────────────────────────────

export function CookieBanner() {
    const [visible, setVisible] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [pendingAnalytics, setPendingAnalytics] = useState(false);

    // Lecture du consentement au mount (SSR safe)
    useEffect(() => {
        const stored = readConsent();
        if (!stored) {
            setVisible(true);
        }
    }, []);

    if (!visible) return null;

    const accept = () => {
        writeConsent(true);
        setVisible(false);
    };

    const refuse = () => {
        writeConsent(false);
        setVisible(false);
    };

    const openSettings = () => {
        const stored = readConsent();
        setPendingAnalytics(stored?.consent.analytics ?? false);
        setShowSettings(true);
    };

    const saveSettings = (analytics: boolean) => {
        writeConsent(analytics);
        setShowSettings(false);
        setVisible(false);
    };

    return (
        <>
            {/* Bandeau */}
            <div
                role="region"
                aria-label="Bannière de consentement cookies"
                className="fixed bottom-0 left-0 right-0 z-[100] border-t border-[#00F0FF]/15 bg-[#050A14]/95 backdrop-blur-sm"
            >
                <div className="max-w-5xl mx-auto px-4 py-3 flex flex-col sm:flex-row items-start sm:items-center gap-3">
                    {/* Texte */}
                    <p className="flex-1 text-[11px] text-[#94A3B8] font-mono leading-relaxed">
                        <span className="text-[#00F0FF] mr-1">COOKIE_NOTICE :</span>
                        On utilise des cookies pour faire fonctionner le site. Pas pour vous
                        espionner — on a des IA pour ça.{" "}
                        <a href="/legal#cookies" className="text-[#00F0FF] hover:underline">
                            En savoir plus
                        </a>
                    </p>

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                            onClick={openSettings}
                            className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-widest font-mono text-[#475569] hover:text-white border border-[#1E293B] hover:border-[#475569] px-3 py-1.5 transition-colors"
                            aria-label="Paramétrer les cookies"
                        >
                            <Settings2 className="w-3 h-3" />
                            Paramétrer
                        </button>
                        <button
                            onClick={refuse}
                            className="text-[10px] uppercase tracking-widest font-mono text-[#475569] hover:text-white border border-[#1E293B] hover:border-[#475569] px-3 py-1.5 transition-colors"
                        >
                            Refuser
                        </button>
                        <button
                            onClick={accept}
                            className="text-[10px] uppercase tracking-widest font-mono bg-[#FF6B00] text-black px-4 py-1.5 hover:bg-[#FF6B00]/90 transition-colors"
                        >
                            Accepter
                        </button>
                    </div>
                </div>
            </div>

            {/* Modal paramètres */}
            {showSettings && (
                <CookieSettingsModal
                    analytics={pendingAnalytics}
                    onSave={saveSettings}
                    onClose={() => setShowSettings(false)}
                />
            )}
        </>
    );
}
