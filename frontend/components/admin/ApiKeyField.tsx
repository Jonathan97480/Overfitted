"use client";
import { useState } from "react";
import { Eye, EyeOff, Copy, Check } from "lucide-react";

interface ApiKeyFieldProps {
    label: string;
    envKey: string;
    type?: "password" | "text";
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
    isSet?: boolean;
    preview?: string;
}

export function ApiKeyField({
    label,
    envKey,
    type = "password",
    value,
    onChange,
    placeholder,
    isSet,
    preview,
}: ApiKeyFieldProps) {
    const [revealed, setRevealed] = useState(false);
    const [copied, setCopied] = useState(false);

    function handleCopy() {
        const text = value || preview || "";
        if (!text) return;
        navigator.clipboard.writeText(text).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        });
    }

    const inputType = type === "password" && !revealed ? "password" : "text";
    const ph = placeholder ?? (isSet ? preview : "(non configurée)");

    return (
        <div>
            <label className="block text-xs text-[var(--admin-muted-2)] mb-1">
                {label}{" "}
                <span className="font-mono text-[var(--admin-accent)] text-[10px]">{envKey}</span>
                {isSet !== undefined && (
                    <span
                        className={`ml-2 inline-block w-1.5 h-1.5 rounded-full align-middle ${isSet ? "bg-green-400" : "bg-red-400"
                            }`}
                    />
                )}
            </label>
            <div
                className="flex items-center gap-1 rounded-md px-2"
                style={{
                    background: "var(--admin-sidebar)",
                    border: `1px solid ${isSet ? "var(--admin-border)" : "#EF444440"}`,
                }}
            >
                <input
                    type={inputType}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={ph}
                    className="flex-1 py-2 text-sm font-mono bg-transparent outline-none text-white placeholder:text-[var(--admin-muted)]"
                    autoComplete="off"
                    spellCheck={false}
                />
                {type === "password" && (
                    <button
                        type="button"
                        onClick={() => setRevealed((r) => !r)}
                        className="text-[var(--admin-muted)] hover:text-white transition-colors p-1"
                        aria-label={revealed ? "Masquer" : "Révéler"}
                    >
                        {revealed ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                )}
                <button
                    type="button"
                    onClick={handleCopy}
                    className="text-[var(--admin-muted)] hover:text-white transition-colors p-1"
                    aria-label="Copier"
                >
                    {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                </button>
            </div>
        </div>
    );
}
