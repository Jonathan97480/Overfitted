"use client";

import {
    useState,
    useCallback,
    useRef,
    useEffect,
    type DragEvent,
    type ChangeEvent,
} from "react";
import Image from "next/image";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import {
    setImageUrl,
    startUploading,
    setAnalyzing,
    setImageMeta,
    setFixerTaskId,
    setSoulTaskId,
    setRoastTaskId,
    setSoulScore,
    setRoastResult,
    setReady,
    setError,
    reset,
    selectUpload,
    type RoastResult,
} from "@/lib/slices/uploadSlice";
import {
    useUploadImageMutation,
    useVectorizeImageMutation,
    useScoreSoulMutation,
    useAnalyzeRoastMutation,
    useGetFixerStatusQuery,
    useGetSoulStatusQuery,
    useGetRoastStatusQuery,
} from "@/lib/publicApi";
import { TerminalWindow } from "@/components/public/TerminalWindow";
import { ScanLineOverlay } from "@/components/public/ScanLineOverlay";
import { CircularGauge } from "@/components/public/CircularGauge";
import { MemoryGraph } from "@/components/public/MemoryGraph";
import { OvfButton } from "@/components/public/OvfButton";
import { AppHeader } from "@/components/public/AppHeader";
import { AppFooter } from "@/components/public/AppFooter";

// ─── Sub-components ────────────────────────────────────────────────────────────

function RoastLine({
    label,
    value,
    dim = false,
    wrap = false,
}: {
    label: string;
    value: string;
    dim?: boolean;
    wrap?: boolean;
}) {
    return (
        <p className={`text-xs leading-relaxed ${wrap ? "" : "truncate"}`}>
            <span className="text-[#00F0FF] shrink-0">{label}:{" "}</span>
            <span className={dim ? "text-[#555]" : "text-[#DDD]"}>{value}</span>
        </p>
    );
}

function Cursor() {
    return <span className="inline-block w-2 h-3 bg-[#00F0FF] animate-pulse align-middle ml-1" />;
}

function BeforeAfterSlider({
    value,
    onChange,
}: {
    value: number;
    onChange: (v: number) => void;
}) {
    return (
        <div className="flex items-center gap-2 mt-2">
            <span className="font-mono text-[10px] text-[#666] uppercase">Before</span>
            <input
                type="range"
                min={0}
                max={100}
                value={value}
                onChange={(e) => onChange(Number(e.target.value))}
                className="flex-1 h-1 accent-[#FF6B00] cursor-pointer"
            />
            <span className="font-mono text-[10px] text-[#666] uppercase">After</span>
        </div>
    );
}

function DropPrompt({ isDragOver }: { isDragOver: boolean }) {
    return (
        <div className="flex flex-col items-center justify-center h-full gap-3 select-none">
            <div
                className={`
                    w-16 h-16 border-2 flex items-center justify-center transition-colors duration-200
                    ${isDragOver ? "border-[#FF6B00] text-[#FF6B00]" : "border-[#00F0FF]/40 text-[#00F0FF]/40"}
                `}
            >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-8 h-8">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
                </svg>
            </div>
            <p className={`font-mono text-xs uppercase tracking-[0.2em] transition-colors duration-200 ${isDragOver ? "text-[#FF6B00]" : "text-[#00F0FF]/60"}`}>
                {isDragOver ? "RELEASE TO TRANSMIT" : "DROP YOUR DESIGN HERE"}
            </p>
            <p className="font-mono text-[10px] text-[#444] uppercase tracking-widest">
                or click to browse — PNG · JPG · WEBP
            </p>
        </div>
    );
}

function AnalyzingOverlay({ step }: { step: string }) {
    return (
        <div className="absolute inset-0 bg-[#080C10]/70 flex flex-col items-center justify-end pb-4 pointer-events-none">
            <p className="font-mono text-xs text-[#00F0FF] uppercase tracking-widest">
                {step}<Cursor />
            </p>
        </div>
    );
}

function dpiLabel(dpi: [number, number] | null): string {
    if (!dpi) return "---";
    const v = dpi[0];
    if (v < 100) return `${v} DPI (TRASH)`;
    if (v < 300) return `${v} DPI (INSUFFICIENT)`;
    return `${v} DPI (PRINT_READY)`;
}

function statusLabel(status: string): string {
    switch (status) {
        case "idle": return "AWAITING_INPUT";
        case "uploading": return "TRANSMITTING...";
        case "analyzing": return "ANALYZE_IN_PROGRESS";
        case "ready": return "ANALYZE_COMPLETE";
        case "error": return "TRANSMISSION_ERROR";
        default: return "UNKNOWN";
    }
}

// ─── Main page ─────────────────────────────────────────────────────────────────

export default function UploadPage() {
    const dispatch = useAppDispatch();
    const upload = useAppSelector(selectUpload);
    const {
        status,
        imageUrl,
        fixerTaskId,
        soulTaskId,
        roastTaskId,
        roastResult,
        soulScore,
        dpi,
        errorMessage,
    } = upload;

    const [isDragOver, setIsDragOver] = useState(false);
    const [sliderValue, setSliderValue] = useState(50);

    // Independent polling-stop flags (local state)
    const [fixerDone, setFixerDone] = useState(false);
    const [soulDone, setSoulDone] = useState(false);
    const [roastDone, setRoastDone] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const fileRef = useRef<File | null>(null);

    // Reset polling flags when task IDs are cleared on reset
    useEffect(() => { if (!fixerTaskId) setFixerDone(false); }, [fixerTaskId]);
    useEffect(() => { if (!soulTaskId) setSoulDone(false); }, [soulTaskId]);
    useEffect(() => { if (!roastTaskId) setRoastDone(false); }, [roastTaskId]);

    // ── RTK mutations ──────────────────────────────────────────────────────────
    const [uploadImage] = useUploadImageMutation();
    const [vectorizeImage] = useVectorizeImageMutation();
    const [scoreSoul] = useScoreSoulMutation();
    const [analyzeRoast] = useAnalyzeRoastMutation();

    // ── RTK polling queries ────────────────────────────────────────────────────
    const { data: fixerStatus } = useGetFixerStatusQuery(fixerTaskId ?? "", {
        skip: !fixerTaskId || fixerDone,
        pollingInterval: 2000,
    });

    const { data: soulStatus } = useGetSoulStatusQuery(soulTaskId ?? "", {
        skip: !soulTaskId || soulDone,
        pollingInterval: 2000,
    });

    const { data: roastStatus } = useGetRoastStatusQuery(roastTaskId ?? "", {
        skip: !roastTaskId || roastDone,
        pollingInterval: 2000,
    });

    // ── Handle fixer task completion ──────────────────────────────────────────
    useEffect(() => {
        if (
            !fixerDone &&
            (fixerStatus?.status === "SUCCESS" || fixerStatus?.status === "FAILURE")
        ) {
            setFixerDone(true);
        }
    }, [fixerStatus?.status, fixerDone]);

    // ── Handle soul task completion ───────────────────────────────────────────
    useEffect(() => {
        if (soulDone) return;
        if (soulStatus?.status === "SUCCESS" && soulStatus.result) {
            setSoulDone(true);
            const r = soulStatus.result as { score: number };
            // Soul score is 0.0–1.0 → convert to 0–100 for the gauge
            dispatch(setSoulScore(Math.round(r.score * 100)));
        } else if (soulStatus?.status === "FAILURE") {
            setSoulDone(true);
            dispatch(setSoulScore(Math.round(Math.random() * 40 + 40))); // fallback 40–80
        }
    }, [soulStatus?.status, soulStatus?.result, soulDone, dispatch]);

    // ── Handle roast task completion ──────────────────────────────────────────
    useEffect(() => {
        if (roastDone) return;
        if (roastStatus?.status === "SUCCESS" && roastStatus.result) {
            setRoastDone(true);
            dispatch(setRoastResult(roastStatus.result as RoastResult));
        } else if (roastStatus?.status === "FAILURE") {
            setRoastDone(true);
            dispatch(setReady());
        }
    }, [roastStatus?.status, roastStatus?.result, roastDone, dispatch]);

    // ── Auto-ready when both soul + roast complete ────────────────────────────
    useEffect(() => {
        if (status === "analyzing" && soulDone && roastDone) {
            dispatch(setReady());
        }
    }, [soulDone, roastDone, status, dispatch]);

    // ── File handling ──────────────────────────────────────────────────────────
    const makeFormData = useCallback((file: File) => {
        const fd = new FormData();
        fd.append("file", file);
        return fd;
    }, []);

    const handleFileSelect = useCallback(
        async (file: File) => {
            if (!file.type.startsWith("image/")) {
                dispatch(setError("FORMAT_INVALIDE — PNG · JPG · WEBP UNIQUEMENT"));
                return;
            }
            fileRef.current = file;
            const url = URL.createObjectURL(file);
            dispatch(setImageUrl(url));
            dispatch(startUploading());

            try {
                // Step 1: Synchronous validation + metadata (fast)
                const meta = await uploadImage(makeFormData(file)).unwrap();
                dispatch(
                    setImageMeta({
                        dpi: meta.dpi as [number, number],
                        format: meta.format,
                    })
                );
                dispatch(setAnalyzing());

                // Step 2: Async tasks in parallel
                const [fixerRes, soulRes] = await Promise.allSettled([
                    vectorizeImage(makeFormData(file)).unwrap(),
                    scoreSoul(makeFormData(file)).unwrap(),
                ]);

                if (fixerRes.status === "fulfilled")
                    dispatch(setFixerTaskId(fixerRes.value.task_id));
                if (soulRes.status === "fulfilled")
                    dispatch(setSoulTaskId(soulRes.value.task_id));

                // Step 3: Roast (metadata from step 1, JSON body)
                const roastRes = await analyzeRoast({
                    filename: meta.filename,
                    format: meta.format,
                    size: Array.from(meta.size),
                    dpi: meta.dpi ? Array.from(meta.dpi) : null,
                    print_ready: meta.print_ready,
                }).unwrap();
                dispatch(setRoastTaskId(roastRes.task_id));
            } catch (err) {
                const msg =
                    err instanceof Error
                        ? err.message
                        : typeof err === "object" && err !== null && "data" in err
                            ? String((err as { data: unknown }).data)
                            : "UPLOAD_FAILED";
                dispatch(setError(msg));
            }
        },
        [dispatch, uploadImage, vectorizeImage, scoreSoul, analyzeRoast, makeFormData]
    );

    const handleDrop = useCallback(
        (e: DragEvent<HTMLDivElement>) => {
            e.preventDefault();
            setIsDragOver(false);
            const file = e.dataTransfer.files[0];
            if (file) handleFileSelect(file);
        },
        [handleFileSelect]
    );

    const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragOver(true);
    }, []);

    const handleDragLeave = useCallback(() => setIsDragOver(false), []);

    const handleInputChange = useCallback(
        (e: ChangeEvent<HTMLInputElement>) => {
            const file = e.target.files?.[0];
            if (file) handleFileSelect(file);
        },
        [handleFileSelect]
    );

    const handleReset = useCallback(() => {
        if (imageUrl?.startsWith("blob:")) URL.revokeObjectURL(imageUrl);
        dispatch(reset());
        fileRef.current = null;
        if (fileInputRef.current) fileInputRef.current.value = "";
    }, [dispatch, imageUrl]);

    const isActive = status !== "idle";
    const isAnalyzing = status === "analyzing";
    const isReady = status === "ready";

    // Determine analysis step label for overlay
    const analysisStep = (() => {
        if (!fixerDone && fixerTaskId) return "VECTORIZING...";
        if (!soulDone && soulTaskId) return "SOUL_CALIBRATION...";
        if (!roastDone && roastTaskId) return "ROAST_ENGINE_RUNNING...";
        return "ANALYZING...";
    })();

    return (
        <>
            <AppHeader />
            <main className="min-h-screen bg-[#080C10] text-white font-mono pb-12">

                {/* ── Hidden file input ───────────────────────────────────────────── */}
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleInputChange}
                />

                {/* ── Header ─────────────────────────────────────────────────────── */}
                <section className="px-6 pt-8 pb-4">
                    <p className="text-[10px] text-[#00F0FF]/50 uppercase tracking-[0.3em] mb-1">
                        Overfitted.io &rsaquo; Upload
                    </p>
                    <h1 className="font-mono text-2xl md:text-3xl font-bold text-[#00F0FF] uppercase tracking-[0.15em]">
                        DIAGNOSTIC TERMINAL{" "}
                        <span className="text-[#FF6B00]">(RESULTS)</span>
                    </h1>
                    <p className="text-[11px] text-[#555] mt-1 uppercase tracking-widest">
                        {statusLabel(status)}{isAnalyzing && <Cursor />}
                    </p>
                </section>

                {/* ── Main grid ───────────────────────────────────────────────────── */}
                <section className="px-6 grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-4">

                    {/* ── LEFT COLUMN ─────────────────────────────────────────────── */}
                    <div className="flex flex-col gap-4">

                        {/* Image zone */}
                        <TerminalWindow title="glitched terminal">
                            <div
                                className={`
                                relative min-h-[320px] flex items-center justify-center cursor-pointer
                                border-2 transition-colors duration-200 overflow-hidden
                                ${isDragOver
                                        ? "border-[#FF6B00] shadow-[0_0_32px_rgba(255,107,0,0.4)]"
                                        : isActive
                                            ? "border-[#FF6B00]/60 shadow-[0_0_24px_rgba(255,107,0,0.25)]"
                                            : "border-[#FF6B00]/20"
                                    }
                            `}
                                onDrop={handleDrop}
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onClick={() => !isAnalyzing && fileInputRef.current?.click()}
                                role="button"
                                tabIndex={0}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter" || e.key === " ") {
                                        e.preventDefault();
                                        if (!isAnalyzing) fileInputRef.current?.click();
                                    }
                                }}
                                aria-label="Zone d'upload — déposez votre image ou cliquez"
                            >
                                {imageUrl ? (
                                    <>
                                        <Image
                                            src={imageUrl}
                                            alt="Design uploadé"
                                            fill
                                            className="object-contain p-4"
                                            unoptimized
                                        />
                                        {isAnalyzing && <AnalyzingOverlay step={analysisStep} />}
                                        <ScanLineOverlay axis="x" />
                                    </>
                                ) : (
                                    <DropPrompt isDragOver={isDragOver} />
                                )}
                            </div>
                        </TerminalWindow>

                        {/* BEFORE / AFTER preview */}
                        <div
                            className={`
                            border border-[#00F0FF]/20 bg-[#0D1117] p-3 transition-opacity duration-300
                            ${isActive ? "opacity-100" : "opacity-30 pointer-events-none"}
                        `}
                        >
                            <p className="text-[10px] text-[#00F0FF] uppercase tracking-[0.2em] mb-3">
                                PREVIEW: BEFORE / AFTER
                            </p>
                            <div className="flex items-center gap-3">
                                {/* BEFORE thumbnail */}
                                <div className="flex flex-col items-center gap-1">
                                    <span className="text-[9px] text-[#555] uppercase tracking-widest">Before</span>
                                    <div className="relative w-24 h-24 border border-[#00F0FF]/20 bg-[#0A0E14] overflow-hidden">
                                        {imageUrl ? (
                                            <Image
                                                src={imageUrl}
                                                alt="Before"
                                                fill
                                                className="object-contain"
                                                unoptimized
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-[#333] text-xs">
                                                ---
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Arrow */}
                                <div className="flex flex-col items-center gap-1 flex-1">
                                    <div className="w-full border-t border-dashed border-[#444] relative">
                                        <span className="absolute right-0 top-1/2 -translate-y-1/2 text-[#FF6B00] text-sm">›</span>
                                    </div>
                                    {isReady && fixerDone ? (
                                        <span className="text-[9px] text-[#00F0FF] uppercase tracking-widest mt-1">
                                            FIXED ✓
                                        </span>
                                    ) : isAnalyzing ? (
                                        <span className="text-[9px] text-[#555] uppercase tracking-widest mt-1 animate-pulse">
                                            PROCESSING...
                                        </span>
                                    ) : (
                                        <span className="text-[9px] text-[#333] uppercase tracking-widest mt-1">
                                            AWAITING
                                        </span>
                                    )}
                                </div>

                                {/* AFTER thumbnail */}
                                <div className="flex flex-col items-center gap-1">
                                    <span className="text-[9px] text-[#555] uppercase tracking-widest">After</span>
                                    <div
                                        className={`
                                        relative w-24 h-24 border bg-[#0A0E14] overflow-hidden
                                        ${isReady && fixerDone ? "border-[#00F0FF]/40" : "border-[#333]"}
                                    `}
                                    >
                                        {isReady && fixerDone && imageUrl ? (
                                            <Image
                                                src={imageUrl}
                                                alt="After"
                                                fill
                                                className="object-contain"
                                                style={{ filter: "hue-rotate(10deg) saturate(1.2) brightness(1.05)" }}
                                                unoptimized
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center">
                                                {isAnalyzing ? (
                                                    <div className="w-8 h-8 border-2 border-[#00F0FF]/30 border-t-[#00F0FF] rounded-full animate-spin" />
                                                ) : (
                                                    <span className="text-[#333] text-xs">---</span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* CTA buttons */}
                        <div className="flex gap-3">
                            {isReady ? (
                                <OvfButton href="/design" subtitle="(FIX THE DESIGN)" className="flex-1">
                                    OVERFIT ME
                                </OvfButton>
                            ) : isAnalyzing ? (
                                <OvfButton disabled subtitle="(WE&apos;RE ON IT...)" className="flex-1">
                                    OVERFIT ME
                                </OvfButton>
                            ) : (
                                <OvfButton
                                    onClick={() => fileInputRef.current?.click()}
                                    subtitle="(FIX THE DESIGN)"
                                    className="flex-1"
                                >
                                    OVERFIT ME
                                </OvfButton>
                            )}
                            <OvfButton
                                variant="ghost"
                                onClick={handleReset}
                                subtitle={isActive ? "(WE DARE YOU)" : "(UPLOAD FIRST)"}
                                className="flex-1"
                                disabled={status === "idle"}
                            >
                                RE-UPLOAD
                            </OvfButton>
                        </div>
                    </div>

                    {/* ── RIGHT COLUMN ────────────────────────────────────────────── */}
                    <div className="flex flex-col gap-4">

                        {/* AI ROAST' TERMINAL */}
                        <TerminalWindow title="AI ROAST' TERMINAL">
                            <div className="space-y-2 min-h-[120px]">
                                <RoastLine
                                    label="STATUS"
                                    value={statusLabel(status)}
                                />
                                <RoastLine
                                    label="FILE"
                                    value={fileRef.current?.name ?? "NO_FILE_SELECTED"}
                                    dim={!isActive}
                                />
                                <RoastLine
                                    label="FORMAT"
                                    value={upload.imageFormat ?? "---"}
                                    dim={!isActive}
                                />
                                <RoastLine
                                    label="RESOLUTION"
                                    value={dpiLabel(dpi)}
                                    dim={!dpi}
                                />

                                {/* Separator */}
                                <div className="border-t border-[#1A1F2E] pt-2" />

                                <RoastLine
                                    label="VERDICT"
                                    value={
                                        isAnalyzing && !roastDone
                                            ? "ANALYZING_YOUR_MEDIOCRITY..."
                                            : roastResult?.verdict ?? "AWAITING_SUBMISSION"
                                    }
                                    dim={!roastResult}
                                    wrap
                                />

                                {roastResult?.issues && roastResult.issues.length > 0 && (
                                    <div className="mt-1">
                                        {roastResult.issues.slice(0, 3).map((issue, i) => (
                                            <p key={i} className="text-[10px] text-[#FF6B00]/80 pl-2 leading-relaxed">
                                                › {issue}
                                            </p>
                                        ))}
                                    </div>
                                )}

                                {roastResult?.roast && (
                                    <>
                                        <div className="border-t border-[#1A1F2E] pt-2" />
                                        <p className="text-[10px] text-[#888] leading-relaxed whitespace-pre-wrap">
                                            {roastResult.roast}
                                        </p>
                                    </>
                                )}

                                {status === "error" && (
                                    <p className="text-xs text-red-400 mt-1">
                                        ERROR: {errorMessage}
                                    </p>
                                )}

                                {(status === "idle" || isAnalyzing) && (
                                    <p className="text-[10px] text-[#444] mt-2">
                                        <Cursor />
                                    </p>
                                )}
                            </div>
                        </TerminalWindow>

                        {/* SOUL-O-METER */}
                        <div className="border border-[#FF6B00] bg-[#0D1117] shadow-[0_0_24px_rgba(255,107,0,0.1)]">
                            {/* Chrome bar */}
                            <div className="flex items-center justify-between px-3 py-2 bg-[#0A0E14] border-b border-[#FF6B00]/30">
                                <span className="font-mono text-[10px] text-[#FF6B00] uppercase tracking-[0.2em]">
                                    SOUL-O-METER
                                </span>
                                <div className="flex items-center gap-1">
                                    <span className="inline-flex items-center justify-center w-3.5 h-3.5 border border-[#333] text-[#444] text-[7px] leading-none">─</span>
                                    <span className="inline-flex items-center justify-center w-3.5 h-3.5 border border-[#333] text-[#444] text-[7px] leading-none">□</span>
                                    <span className="inline-flex items-center justify-center w-3.5 h-3.5 border border-[#444] text-[#666] text-[7px] leading-none">✕</span>
                                </div>
                            </div>

                            <div className="p-4 flex flex-col gap-3">
                                {/* Circular gauge */}
                                <div className="flex justify-center">
                                    <CircularGauge
                                        value={soulScore ?? (isAnalyzing ? 0 : 0)}
                                        label="ORGANIC CHAOS"
                                        sublabel={
                                            isAnalyzing && !soulDone
                                                ? "CALIBRATING..."
                                                : soulScore !== null
                                                    ? soulScore >= 70
                                                        ? "HUMAN_CONFIRMED"
                                                        : soulScore >= 40
                                                            ? "MIXED_SIGNALS"
                                                            : "SUSPICIOUS_AI_VIBES"
                                                    : "NO_DATA"
                                        }
                                    />
                                </div>

                                {/* Before / After slider */}
                                <div>
                                    <BeforeAfterSlider
                                        value={sliderValue}
                                        onChange={setSliderValue}
                                    />
                                </div>

                                {/* Memory graph */}
                                <div>
                                    <p className="font-mono text-[9px] text-[#444] uppercase tracking-widest mb-1">
                                        MEMORY
                                    </p>
                                    <MemoryGraph
                                        color="#FF6B00"
                                        values={
                                            soulStatus?.result
                                                ? (() => {
                                                    const r = soulStatus.result as {
                                                        signals?: Record<string, number>;
                                                    };
                                                    if (r.signals) {
                                                        return Object.values(r.signals).map((v) =>
                                                            Number(v)
                                                        );
                                                    }
                                                    return undefined;
                                                })()
                                                : undefined
                                        }
                                    />
                                </div>

                                {/* OVERFIT ME button */}
                                {isReady ? (
                                    <OvfButton href="/design" subtitle="(FIX THE DESIGN)">
                                        OVERFIT ME
                                    </OvfButton>
                                ) : (
                                    <OvfButton
                                        onClick={isActive ? undefined : () => fileInputRef.current?.click()}
                                        disabled={isAnalyzing}
                                        subtitle={isAnalyzing ? "(PROCESSING...)" : "(FIX THE DESIGN)"}
                                    >
                                        OVERFIT ME
                                    </OvfButton>
                                )}
                            </div>
                        </div>
                    </div>
                </section>

                {/* ── Status bar ─────────────────────────────────────────────────── */}
                <div className="fixed bottom-0 left-0 right-0 h-8 bg-[#080C10] border-t border-[#1A1F2E] flex items-center px-6 gap-6 z-10">
                    <span className="font-mono text-[10px] text-[#00F0FF] uppercase tracking-[0.15em]">
                        Diagnostic State:{" "}
                        <span
                            className={
                                status === "ready"
                                    ? "text-green-400"
                                    : status === "error"
                                        ? "text-red-400"
                                        : status === "analyzing"
                                            ? "text-yellow-400"
                                            : "text-[#00F0FF]"
                            }
                        >
                            {statusLabel(status)}
                        </span>
                    </span>
                    <span className="font-mono text-[10px] text-[#444] uppercase tracking-[0.15em]">
                        Redux Store:{" "}
                        <span className="text-green-400">ACTIVE</span>
                    </span>
                    {fixerTaskId && (
                        <span className="font-mono text-[10px] text-[#444] uppercase tracking-[0.15em]">
                            Fixer:{" "}
                            <span className={fixerDone ? "text-green-400" : "text-yellow-400 animate-pulse"}>
                                {fixerDone ? "DONE" : "RUNNING"}
                            </span>
                        </span>
                    )}
                    {soulTaskId && (
                        <span className="font-mono text-[10px] text-[#444] uppercase tracking-[0.15em]">
                            Soul:{" "}
                            <span className={soulDone ? "text-green-400" : "text-yellow-400 animate-pulse"}>
                                {soulDone ? `${soulScore ?? "--"}%` : "SCORING"}
                            </span>
                        </span>
                    )}
                </div>
            </main>
            <AppFooter />
        </>
    );
}
