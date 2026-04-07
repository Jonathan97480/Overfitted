import type { Metadata } from "next";
import Link from "next/link";
import { AppHeader } from "@/components/public/AppHeader";
import { AppFooter } from "@/components/public/AppFooter";
import { TerminalWindow } from "@/components/public/TerminalWindow";
import { NeonBadge } from "@/components/public/NeonBadge";
import { OvfButton } from "@/components/public/OvfButton";

export const metadata: Metadata = {
    title: "À propos — Overfitted.io",
    description:
        "Critiqué par l'IA, réparé pour les Humains. L'histoire, la vision et la technologie derrière Overfitted.io.",
};

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
    return (
        <p className="font-mono text-[9px] uppercase tracking-[0.35em] text-[#FF6B00] mb-3">
            <span className="mr-2 opacity-50">//</span>{children}
        </p>
    );
}

function TerminalLine({
    label,
    value,
    variant = "normal",
}: {
    label: string;
    value: React.ReactNode;
    variant?: "normal" | "warn" | "ok";
}) {
    const valueColor =
        variant === "warn" ? "text-[#FF6B00]" :
            variant === "ok" ? "text-[#22C55E]" :
                "text-[#AAAAAA]";
    return (
        <div className="flex gap-3 font-mono text-[11px] leading-relaxed">
            <span className="text-[#555] shrink-0 w-44 uppercase tracking-wider">{label}</span>
            <span className={valueColor}>{value}</span>
        </div>
    );
}

function PipelineStep({
    step,
    label,
    desc,
    status,
}: {
    step: string;
    label: string;
    desc: string;
    status: "ok" | "warn" | "active";
}) {
    const borderColor =
        status === "ok" ? "border-[#22C55E]/40" :
            status === "warn" ? "border-[#FF6B00]/40" :
                "border-[#00F0FF]/40";
    const dotColor =
        status === "ok" ? "bg-[#22C55E]" :
            status === "warn" ? "bg-[#FF6B00]" :
                "bg-[#00F0FF]";
    return (
        <div className={`border-l-2 ${borderColor} pl-4 py-2`}>
            <div className="flex items-center gap-2 mb-1">
                <span className={`inline-block w-1.5 h-1.5 rounded-full ${dotColor}`} />
                <span className="font-mono text-[10px] text-[#555] uppercase tracking-widest">{step}</span>
            </div>
            <p className="font-mono text-[12px] text-white uppercase tracking-wide mb-0.5">{label}</p>
            <p className="font-mono text-[11px] text-[#666]">{desc}</p>
        </div>
    );
}

function CollectionCard({
    name,
    tag,
    desc,
    accent,
}: {
    name: string;
    tag: string;
    desc: string;
    accent: "orange" | "cyan" | "green";
}) {
    const accentColor =
        accent === "orange" ? "#FF6B00" :
            accent === "cyan" ? "#00F0FF" :
                "#22C55E";
    return (
        <div
            className="border border-[#1A1A1A] bg-[#0D1117] p-5 flex flex-col gap-3"
            style={{ boxShadow: `0 0 18px ${accentColor}0D` }}
        >
            <div className="flex items-start justify-between gap-2">
                <p
                    className="font-mono text-[13px] uppercase tracking-[0.15em] font-bold leading-tight"
                    style={{ color: accentColor }}
                >
                    {name}
                </p>
                <span
                    className="font-mono text-[9px] uppercase tracking-widest border px-2 py-0.5 shrink-0"
                    style={{ color: accentColor, borderColor: `${accentColor}50` }}
                >
                    {tag}
                </span>
            </div>
            <p className="font-mono text-[11px] text-[#666] leading-relaxed">{desc}</p>
        </div>
    );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function AboutPage() {
    return (
        <div className="min-h-screen bg-[#0A0A0A] flex flex-col">
            <AppHeader />

            {/* ── Hero ── */}
            <section className="relative border-b border-[#00F0FF]/10 py-16 px-6 overflow-hidden">
                {/* Background code overlay */}
                <div
                    className="absolute inset-0 pointer-events-none select-none"
                    aria-hidden="true"
                    style={{ opacity: 0.025 }}
                >
                    <pre className="font-mono text-[9px] text-[#00F0FF] leading-4 whitespace-pre-wrap p-6">
                        {[
                            "def overfit(design: Image) -> Image:",
                            "    soul_score = soul_o_meter.analyze(design)",
                            "    if soul_score < 70:",
                            "        roast = roast_engine.generate(design)",
                            "        fixed = fixer.upscale(design, target_dpi=300)",
                            "        return fixed",
                            "    return design  # rare. very rare.",
                            "",
                            "class HumanArtist:",
                            "    dpi = 72  # always",
                            "    confidence = float('inf')  # unfortunately",
                            "    skill = None  # we fix that",
                        ].join("\n")}
                    </pre>
                </div>

                <div className="relative max-w-7xl mx-auto">
                    <NeonBadge label="ABOUT_OVERFITTED.IO" className="mb-6" />
                    <h1 className="font-mono text-3xl md:text-5xl font-black text-white uppercase tracking-tight leading-none mb-4">
                        CRITIQUÉ PAR L&apos;IA,
                        <br />
                        <span className="text-[#FF6B00]">RÉPARÉ</span> POUR LES HUMAINS.
                    </h1>
                    <p className="font-mono text-[13px] text-[#555] uppercase tracking-widest max-w-xl">
                        Un pipeline d&apos;IA qui analyse vos designs, les insulte poliment,
                        et les améliore avant de les imprimer. Parce que 72 DPI, c&apos;est une déclaration de guerre.
                    </p>
                </div>
            </section>

            <div className="max-w-7xl mx-auto w-full px-6 py-12 space-y-20">

                {/* ── Brand pitch ── */}
                <section className="grid md:grid-cols-2 gap-8 items-start">
                    <div>
                        <SectionLabel>Mission</SectionLabel>
                        <TerminalWindow title="BRAND_MANIFEST.txt">
                            <div className="space-y-2">
                                <TerminalLine label="MISSION:" value="Faire souffrir vos designs pour leur bien" />
                                <TerminalLine label="MÉTHODE:" value="IA + DPI + Cynisme + Printful" />
                                <TerminalLine label="CIBLE:" value="Humains créatifs mal équipés" />
                                <TerminalLine label="RÉSULTAT:" value="T-shirts imprimables à 300 DPI" variant="ok" />
                                <TerminalLine label="DROIT DE RÉTRACTATION:" value="Inexistant (Art. L221-28)" variant="warn" />
                                <TerminalLine
                                    label="STATUS:"
                                    value={
                                        <span className="flex items-center gap-1.5">
                                            <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#22C55E] animate-pulse" />
                                            ONLINE — ROASTING HUMANS
                                        </span>
                                    }
                                    variant="ok"
                                />
                            </div>
                        </TerminalWindow>
                    </div>

                    <div className="space-y-4">
                        <SectionLabel>Vision</SectionLabel>
                        <p className="font-mono text-[12px] text-[#AAAAAA] leading-relaxed">
                            Overfitted.io est né d&apos;un constat simple :{" "}
                            <span className="text-white">les humains produisent des designs à 72 DPI</span> avec
                            une confiance inversement proportionnelle à leur résolution.
                        </p>
                        <p className="font-mono text-[12px] text-[#AAAAAA] leading-relaxed">
                            Notre pipeline IA analyse chaque création uploadée, calcule son{" "}
                            <span className="text-[#FF6B00]">Soul Score™</span>, la roast avec la précision
                            d&apos;un modèle de langage bien entraîné, puis la corrige pour qu&apos;elle survive
                            à l&apos;impression.
                        </p>
                        <p className="font-mono text-[12px] text-[#AAAAAA] leading-relaxed">
                            Le tout imprimé à la demande par Printful, expédié directement.{" "}
                            <span className="text-white">Aucun stock. Aucune excuse. Juste des pixels corrigés.</span>
                        </p>
                    </div>
                </section>

                {/* ── Collections ── */}
                <section>
                    <SectionLabel>Collections</SectionLabel>
                    <h2 className="font-mono text-lg text-white uppercase tracking-[0.12em] mb-8">
                        TROIS FAMILLES DE CHAOS ORGANIQUE
                    </h2>
                    <div className="grid md:grid-cols-3 gap-4">
                        <CollectionCard
                            name="SYNTAX COLLECTION"
                            tag="HUMAN_CHAOS"
                            accent="orange"
                            desc="Designs générés par des humains convaincus de maîtriser les prompts IA. Taux de réussite : 12%. Notre IA les corrige. Votre ego s'en remettra."
                        />
                        <CollectionCard
                            name="HALLUCINATION DROP"
                            tag="AI_GENERATED"
                            accent="cyan"
                            desc="Sorties brutes de diffusion, non filtrées, non corrigées, non excusées. 6 doigts inclus. Imprimées telles quelles — l'authenticité avant la perfection."
                        />
                        <CollectionCard
                            name="PULSE (PROCEDURAL)"
                            tag="LIVE_DATA"
                            accent="green"
                            desc="Généré en temps réel depuis des flux de données : cours crypto, météo, trafic réseau. Chaque pièce est unique. Comme vos erreurs."
                        />
                    </div>
                </section>

                {/* ── Pipeline tech ── */}
                <section>
                    <SectionLabel>Technologie</SectionLabel>
                    <h2 className="font-mono text-lg text-white uppercase tracking-[0.12em] mb-8">
                        LE PIPELINE — DE VOTRE FICHIER À SON T-SHIRT
                    </h2>
                    <div className="grid md:grid-cols-2 gap-10">
                        {/* Steps */}
                        <div className="space-y-5">
                            <PipelineStep
                                step="STEP_01"
                                label="FIXER — Image Processing"
                                desc="Validation DPI (≥ 300), upscale ESRGAN, suppression fond (rembg), vectorisation SVG (vtracer). Tout synchrone ou via worker Celery/Redis."
                                status="ok"
                            />
                            <PipelineStep
                                step="STEP_02"
                                label="SOUL-O-METER — Scoring IA"
                                desc="Analyse multi-critères : cohérence visuelle, lisibilité, originalité, imprimabilité. Score 0-100, 70+ requis pour validation. Sous 50 : appel d'urgence."
                                status="ok"
                            />
                            <PipelineStep
                                step="STEP_03"
                                label="ROAST ENGINE — LLM Critique"
                                desc="Modèle de langage (LM Studio local ou OpenAI cloud) génère une critique technique dévastatrice mais constructive. Ton : expert cynique."
                                status="active"
                            />
                            <PipelineStep
                                step="STEP_04"
                                label="PRINTFUL — Print-on-Demand"
                                desc="API Printful : création de la commande, envoi du fichier corrigé, suivi fabrication + expédition. Aucun stock physique côté Overfitted."
                                status="warn"
                            />
                        </div>

                        {/* Stack terminal */}
                        <TerminalWindow title="TECH_STACK.json" className="h-fit">
                            <div className="space-y-3">
                                <div>
                                    <p className="font-mono text-[9px] text-[#FF6B00] uppercase tracking-widest mb-1">
                                        // Backend
                                    </p>
                                    <div className="space-y-1">
                                        {[
                                            ["RUNTIME", "Python 3.12 + FastAPI"],
                                            ["ORM", "SQLAlchemy async + aiosqlite/PostgreSQL"],
                                            ["QUEUE", "Celery 5 + Redis (tâches longues)"],
                                            ["IMAGE", "Pillow · ESRGAN · rembg · vtracer"],
                                            ["LLM", "LM Studio local · OpenAI GPT-4o (fallback)"],
                                            ["PAYMENTS", "Stripe Checkout + Webhooks"],
                                            ["POD", "Printful API v2"],
                                        ].map(([k, v]) => (
                                            <div key={k} className="flex gap-2 font-mono text-[10px]">
                                                <span className="text-[#444] w-20 shrink-0">{k}</span>
                                                <span className="text-[#AAAAAA]">{v}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className="border-t border-[#1A1A1A] pt-3">
                                    <p className="font-mono text-[9px] text-[#00F0FF] uppercase tracking-widest mb-1">
                                        // Frontend
                                    </p>
                                    <div className="space-y-1">
                                        {[
                                            ["FRAMEWORK", "Next.js 15 · App Router · TypeScript"],
                                            ["STATE", "Redux Toolkit + RTK Query"],
                                            ["UI", "Tailwind CSS · Shadcn/ui"],
                                            ["ANIM", "Framer Motion (glitch · scan)"],
                                            ["FONTS", "JetBrains Mono (tout l'UI)"],
                                        ].map(([k, v]) => (
                                            <div key={k} className="flex gap-2 font-mono text-[10px]">
                                                <span className="text-[#444] w-20 shrink-0">{k}</span>
                                                <span className="text-[#AAAAAA]">{v}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className="border-t border-[#1A1A1A] pt-3">
                                    <p className="font-mono text-[9px] text-[#555] uppercase tracking-widest mb-1">
                                        // Infra
                                    </p>
                                    <div className="space-y-1">
                                        {[
                                            ["DEPLOY", "Docker Compose · Vercel (frontend)"],
                                            ["CDN", "Printful CDN · Vercel Edge"],
                                            ["AUTH", "JWT HttpOnly Cookies"],
                                        ].map(([k, v]) => (
                                            <div key={k} className="flex gap-2 font-mono text-[10px]">
                                                <span className="text-[#444] w-20 shrink-0">{k}</span>
                                                <span className="text-[#AAAAAA]">{v}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </TerminalWindow>
                    </div>
                </section>

                {/* ── Manifesto numbers ── */}
                <section className="border border-[#1A1A1A] bg-[#0D1117] p-8">
                    <SectionLabel>En chiffres</SectionLabel>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                        {[
                            { value: "72", unit: "DPI", label: "DPI moyen des designs uploadés par les humains" },
                            { value: "300", unit: "DPI", label: "DPI minimum requis pour survivre à l'impression" },
                            { value: "4.2×", unit: "", label: "Upscale moyen appliqué par le pipeline Fixer" },
                            { value: "100%", unit: "", label: "Taux de sarcasme de la Roast Engine" },
                        ].map(({ value, unit, label }) => (
                            <div key={label} className="text-center">
                                <p className="font-mono text-3xl font-black text-[#FF6B00] leading-none">
                                    {value}
                                    <span className="text-base text-[#FF6B00]/60 ml-1">{unit}</span>
                                </p>
                                <p className="font-mono text-[10px] text-[#555] uppercase tracking-widest mt-2 leading-relaxed">
                                    {label}
                                </p>
                            </div>
                        ))}
                    </div>
                </section>

                {/* ── CTA ── */}
                <section className="text-center space-y-6 pb-4">
                    <TerminalWindow title="CALL_TO_ACTION" className="max-w-xl mx-auto">
                        <div className="space-y-2 text-left mb-5">
                            <TerminalLine label="SYSTEM:" value="Prêt à recevoir votre fichier" variant="ok" />
                            <TerminalLine label="DPI_CHECK:" value="En attente de votre upload..." />
                            <TerminalLine label="ROAST_ENGINE:" value="Chargée. Motivée. Impatiente." variant="warn" />
                            <TerminalLine label="VERDICT:" value="Uploadez. On s'occupe du reste." />
                        </div>
                        <OvfButton href="/upload" subtitle="(ON FERA CE QU'ON PEUT)">
                            UPLOAD VOTRE CRÉATION
                        </OvfButton>
                    </TerminalWindow>
                    <p className="font-mono text-[10px] text-[#333] uppercase tracking-widest">
                        OU ALORS{" "}
                        <Link href="/shop" className="text-[#555] hover:text-[#00F0FF] transition-colors underline underline-offset-2">
                            PARCOUREZ LE SHOP
                        </Link>
                        {" "}— si vous avez peur du jugement de l&apos;IA.
                    </p>
                </section>
            </div>

            {/* Bottom status bar */}
            <div
                className="fixed bottom-0 left-0 right-0 h-6 bg-[#000] border-t border-[#1A1A1A] flex items-center px-4 gap-6 z-40"
                style={{ boxShadow: "0 -1px 0 rgba(0,240,255,0.08)" }}
            >
                <span className="font-mono text-[9px] text-[#555] uppercase tracking-widest">
                    About State:{" "}
                    <span className="text-[#22C55E]">LOADED</span>
                </span>
                <span className="font-mono text-[9px] text-[#333] uppercase tracking-widest">|</span>
                <span className="font-mono text-[9px] text-[#555] uppercase tracking-widest">
                    Roast Engine:{" "}
                    <span className="text-[#FF6B00]">ARMED</span>
                </span>
            </div>

            <div className="pb-6">
                <AppFooter />
            </div>
        </div>
    );
}
