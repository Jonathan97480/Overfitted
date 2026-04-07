import type { Metadata } from "next";
import Link from "next/link";
import { AppHeader } from "@/components/public/AppHeader";
import { AppFooter } from "@/components/public/AppFooter";

export const metadata: Metadata = {
    title: "Mentions légales & CGV — Overfitted.io",
    description:
        "Mentions légales, politique de confidentialité et conditions générales de vente de Overfitted.io.",
};

const SECTIONS = [
    { id: "editeur", label: "Éditeur" },
    { id: "hebergeur", label: "Hébergeur" },
    { id: "confidentialite", label: "Politique de confidentialité" },
    { id: "droits", label: "Droits des utilisateurs" },
    { id: "cookies", label: "Cookies" },
    { id: "cgv", label: "CGV" },
] as const;

function SectionTitle({ id, children }: { id: string; children: React.ReactNode }) {
    return (
        <h2
            id={id}
            className="font-mono text-[11px] uppercase tracking-[0.25em] text-[#00F0FF] mb-4 pt-2 scroll-mt-8"
        >
            <span className="text-[#FF6B00] mr-2">//</span>
            {children}
        </h2>
    );
}

function Rule() {
    return <hr className="border-[#00F0FF]/10 my-8" />;
}

function Para({ children }: { children: React.ReactNode }) {
    return (
        <p className="font-mono text-[12px] text-[#AAAAAA] leading-relaxed mb-3">
            {children}
        </p>
    );
}

function Highlight({ children }: { children: React.ReactNode }) {
    return (
        <span className="text-[#FFFFFF]">{children}</span>
    );
}

function AlertBox({ children }: { children: React.ReactNode }) {
    return (
        <div
            className="border border-[#FF6B00]/40 bg-[#FF6B00]/5 p-4 font-mono text-[11px] text-[#AAAAAA] leading-relaxed"
            style={{ boxShadow: "0 0 12px rgba(255,107,0,0.08)" }}
        >
            {children}
        </div>
    );
}

export default function LegalPage() {
    return (
        <div className="min-h-screen bg-[#0A0A0A] flex flex-col">
            <AppHeader />

            {/* Page header */}
            <section className="border-b border-[#00F0FF]/10 py-8 px-6">
                <div className="max-w-7xl mx-auto">
                    <p className="font-mono text-[10px] text-[#444] uppercase tracking-widest mb-2">
                        <Link href="/" className="hover:text-[#00F0FF] transition-colors">HOME</Link>
                        {" "}›{" "}
                        <span className="text-[#AAAAAA]">LEGAL</span>
                    </p>
                    <h1 className="font-mono text-xl text-white uppercase tracking-[0.15em]">
                        <span className="text-[#FF6B00]">LEGAL</span>_RECORDS
                    </h1>
                    <p className="font-mono text-[11px] text-[#555] mt-1 uppercase tracking-widest">
                        Mentions légales · Politique de confidentialité · CGV
                    </p>
                </div>
            </section>

            {/* Body: sidebar + content */}
            <div className="max-w-7xl mx-auto w-full px-6 py-10 flex gap-10 flex-1">
                {/* Sticky sidebar */}
                <aside className="hidden lg:block w-52 shrink-0">
                    <nav className="sticky top-8">
                        <p className="font-mono text-[9px] uppercase tracking-[0.3em] text-[#555] mb-4">
                            SOMMAIRE
                        </p>
                        <ul className="flex flex-col gap-1">
                            {SECTIONS.map((s) => (
                                <li key={s.id}>
                                    <a
                                        href={`#${s.id}`}
                                        className="block font-mono text-[11px] text-[#666] uppercase tracking-widest px-3 py-1.5 border-l border-[#222] hover:border-[#00F0FF] hover:text-[#00F0FF] transition-all"
                                    >
                                        {s.label}
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </nav>
                </aside>

                {/* Content */}
                <article className="flex-1 min-w-0">

                    {/* ── Éditeur ── */}
                    <SectionTitle id="editeur">Éditeur du site</SectionTitle>
                    <Para>
                        Le site <Highlight>overfitted.io</Highlight> est édité par :{" "}
                        <Highlight>Overfitted SAS</Highlight> — Société par actions simplifiée au capital de [CAPITAL] €.
                    </Para>
                    <Para>
                        SIRET : <Highlight>[SIRET]</Highlight> — N° TVA intracommunautaire :{" "}
                        <Highlight>FR[TVA]</Highlight>
                    </Para>
                    <Para>
                        Siège social : <Highlight>[ADRESSE]</Highlight>
                    </Para>
                    <Para>
                        Directeur de la publication : <Highlight>[NOM DIRIGEANT]</Highlight>
                    </Para>
                    <Para>
                        Contact : <Highlight>legal@overfitted.io</Highlight>
                    </Para>

                    <Rule />

                    {/* ── Hébergeur ── */}
                    <SectionTitle id="hebergeur">Hébergeur</SectionTitle>
                    <Para>
                        Le site est hébergé par <Highlight>Vercel Inc.</Highlight>, 440 N Barranca Ave #4133,
                        Covina, CA 91723, USA — <Highlight>vercel.com</Highlight>
                    </Para>
                    <Para>
                        Les images produits sont hébergées par <Highlight>Printful Inc.</Highlight> via leur CDN
                        (files.cdn.printful.com).
                    </Para>

                    <Rule />

                    {/* ── Confidentialité ── */}
                    <SectionTitle id="confidentialite">Politique de confidentialité</SectionTitle>
                    <Para>
                        Conformément au Règlement Général sur la Protection des Données (RGPD — Règlement UE 2016/679)
                        et à la loi Informatique et Libertés n° 78-17 du 6 janvier 1978 modifiée.
                    </Para>
                    <Para>
                        <Highlight>Données collectées :</Highlight> adresse email, nom d'affichage (optionnel),
                        historique de commandes et designs uploadés. Aucune donnée bancaire n'est stockée — les
                        paiements sont traités par Stripe conformément à la norme PCI DSS.
                    </Para>
                    <Para>
                        <Highlight>Base légale :</Highlight> exécution du contrat (commandes), intérêt légitime
                        (analytics anonymisés), consentement (cookies non essentiels).
                    </Para>
                    <Para>
                        <Highlight>Durée de conservation :</Highlight> données de compte — jusqu'à suppression du
                        compte ou 3 ans d'inactivité. Factures et données comptables — 10 ans (obligation légale
                        Art. L123-22 Code de commerce).
                    </Para>
                    <Para>
                        <Highlight>DPO / Contact RGPD :</Highlight>{" "}
                        <Highlight>privacy@overfitted.io</Highlight>
                    </Para>
                    <Para>
                        <Highlight>Sous-traitants :</Highlight> Stripe (paiement) — Printful (fabrication et
                        expédition) — Vercel (hébergement). Chacun est soumis à des contrats de traitement des
                        données conformes au RGPD.
                    </Para>

                    <Rule />

                    {/* ── Droits des utilisateurs ── */}
                    <SectionTitle id="droits">Droits des utilisateurs</SectionTitle>
                    <Para>
                        Conformément aux articles 15 à 22 du RGPD, vous disposez des droits suivants sur vos données
                        personnelles :
                    </Para>
                    <ul className="font-mono text-[12px] text-[#AAAAAA] leading-relaxed mb-4 space-y-2 pl-4">
                        {[
                            ["Art. 15", "Droit d'accès", "export JSON de toutes vos données via votre compte"],
                            ["Art. 16", "Droit de rectification", "modification email / nom dans /account/profile"],
                            ["Art. 17", "Droit à l'effacement", "suppression du compte (données anonymisées, factures conservées)"],
                            ["Art. 18", "Droit à la limitation", "sur demande écrite à privacy@overfitted.io"],
                            ["Art. 20", "Droit à la portabilité", "export JSON téléchargeable depuis votre profil"],
                            ["Art. 21", "Droit d'opposition", "sur demande pour tout traitement non contractuel"],
                        ].map(([art, title, detail]) => (
                            <li key={art} className="flex flex-col gap-0.5">
                                <span>
                                    <span className="text-[#FF6B00]">{art}</span>
                                    {" — "}
                                    <span className="text-white">{title}</span>
                                </span>
                                <span className="text-[#555] text-[11px] pl-4">→ {detail}</span>
                            </li>
                        ))}
                    </ul>
                    <Para>
                        Pour exercer vos droits :{" "}
                        <Highlight>privacy@overfitted.io</Highlight> — réponse sous 30 jours (délai légal).
                        En cas de litige :{" "}
                        <Highlight>cnil.fr</Highlight> (autorité de contrôle française).
                    </Para>
                    <Para>
                        Les liens directs vers les actions RGPD sont disponibles dans votre{" "}
                        <Link href="/account/profile" className="text-[#00F0FF] hover:underline">
                            espace compte
                        </Link>
                        .
                    </Para>

                    <Rule />

                    {/* ── Cookies ── */}
                    <SectionTitle id="cookies">Cookies</SectionTitle>
                    <Para>
                        Conformément à la délibération CNIL n° 2020-091 du 17 septembre 2020, votre consentement
                        est requis avant tout dépôt de cookie non strictement nécessaire.
                    </Para>
                    <div className="mb-4 space-y-2">
                        {[
                            {
                                name: "SESSION / AUTH",
                                type: "Fonctionnel (obligatoire)",
                                color: "#00F0FF",
                                desc: "Cookie HttpOnly de session (JWT). Requis pour l'authentification. Durée : session navigateur.",
                            },
                            {
                                name: "OVF_CONSENT",
                                type: "Fonctionnel (obligatoire)",
                                color: "#00F0FF",
                                desc: "Stocke votre choix de consentement cookies. Durée : 12 mois.",
                            },
                            {
                                name: "ANALYTICS",
                                type: "Analytics (consentement requis)",
                                color: "#FF6B00",
                                desc: "Compteurs de vues anonymisés (Redis, côté serveur). Aucun cookie tiers publicitaire.",
                            },
                        ].map((c) => (
                            <div
                                key={c.name}
                                className="border border-[#222] p-3 font-mono text-[11px]"
                            >
                                <div className="flex items-center gap-3 mb-1">
                                    <span
                                        className="uppercase tracking-wider text-[10px] font-bold"
                                        style={{ color: c.color }}
                                    >
                                        {c.name}
                                    </span>
                                    <span className="text-[#555] text-[9px] uppercase tracking-widest">
                                        {c.type}
                                    </span>
                                </div>
                                <p className="text-[#666]">{c.desc}</p>
                            </div>
                        ))}
                    </div>
                    <Para>
                        Aucun cookie publicitaire ou de tracking tiers n'est utilisé sur ce site.
                    </Para>

                    <Rule />

                    {/* ── CGV ── */}
                    <SectionTitle id="cgv">Conditions générales de vente</SectionTitle>

                    <Para>
                        Les présentes conditions s'appliquent à toute commande passée sur{" "}
                        <Highlight>overfitted.io</Highlight> par un consommateur au sens de l'article
                        préliminaire du Code de la consommation.
                    </Para>

                    <h3 className="font-mono text-[10px] text-[#FFFFFF] uppercase tracking-widest mb-2 mt-6">
                        1. Produits & Prix
                    </h3>
                    <Para>
                        Les prix sont affichés en euros TTC (TVA 20% incluse). Les frais de livraison sont
                        calculés et affichés avant validation de la commande. Overfitted se réserve le droit
                        de modifier ses prix à tout moment ; les commandes validées sont facturées au prix
                        affiché lors de la commande.
                    </Para>

                    <h3 className="font-mono text-[10px] text-[#FFFFFF] uppercase tracking-widest mb-2 mt-6">
                        2. Commande & Paiement
                    </h3>
                    <Para>
                        Le paiement est sécurisé via <Highlight>Stripe</Highlight> (norme PCI DSS niveau 1).
                        La commande est confirmée après validation du paiement. Une confirmation par email est
                        envoyée avec le récapitulatif et le lien de facture PDF.
                    </Para>

                    <h3 className="font-mono text-[10px] text-[#FFFFFF] uppercase tracking-widest mb-2 mt-6">
                        3. Fabrication & Livraison (Print-on-Demand)
                    </h3>
                    <Para>
                        Les produits Overfitted.io sont fabriqués à la demande (<Highlight>Print-on-Demand</Highlight>)
                        par <Highlight>Printful Inc.</Highlight> La fabrication est initiée après confirmation du
                        paiement. Le délai de production est de 2 à 7 jours ouvrés, auquel s'ajoute le délai de
                        livraison du transporteur (3 à 10 jours ouvrés selon la destination).
                    </Para>

                    <h3 className="font-mono text-[10px] text-[#FFFFFF] uppercase tracking-widest mb-2 mt-6">
                        4. Droit de rétractation — Exception produits personnalisés
                    </h3>
                    <AlertBox>
                        <p className="text-[#FF6B00] uppercase tracking-wider text-[10px] mb-2 font-bold">
                            ⚠ EXCLUSION DU DROIT DE RÉTRACTATION — ART. L221-28 12° CODE DE LA CONSOMMATION
                        </p>
                        <p className="mb-2">
                            Conformément à <Highlight>l'article L221-28 12° du Code de la consommation</Highlight>,
                            le droit de rétractation de 14 jours prévu par la Directive européenne 2011/83/UE{" "}
                            <Highlight>ne s'applique pas</Highlight> aux biens confectionnés selon les
                            spécifications du consommateur ou nettement personnalisés.
                        </p>
                        <p className="mb-2">
                            <Highlight>Tous les produits Overfitted.io</Highlight> sont fabriqués à la demande
                            avec un design unique intégré. En tant que biens personnalisés, ils sont{" "}
                            <Highlight>exclus du droit de rétractation</Highlight> dès lors que la production
                            a été lancée.
                        </p>
                        <p className="text-[#888] text-[10px]">
                            Cette exception est portée à votre connaissance avant la validation de la commande,
                            conformément à l'article L221-5 du Code de la consommation.
                        </p>
                    </AlertBox>
                    <Para>
                        Pour toute commande non encore mise en production, un annulation peut être demandée
                        dans les 2 heures suivant la confirmation de commande à l'adresse{" "}
                        <Highlight>support@overfitted.io</Highlight>.
                    </Para>

                    <h3 className="font-mono text-[10px] text-[#FFFFFF] uppercase tracking-widest mb-2 mt-6">
                        5. Garanties légales
                    </h3>
                    <Para>
                        Indépendamment de l'exclusion du droit de rétractation, les garanties légales de
                        conformité (Art. L217-4 et suivants) et contre les vices cachés (Art. 1641 et suivants
                        du Code civil) s'appliquent. En cas de défaut de conformité, contactez{" "}
                        <Highlight>support@overfitted.io</Highlight> dans un délai de 2 ans à compter de la
                        livraison.
                    </Para>

                    <h3 className="font-mono text-[10px] text-[#FFFFFF] uppercase tracking-widest mb-2 mt-6">
                        6. Facture & TVA
                    </h3>
                    <Para>
                        Une facture conforme aux articles 289 du CGI et au Décret n° 2013-346 est générée
                        automatiquement à chaque commande. Numérotation séquentielle{" "}
                        <Highlight>OVF-AAAA-XXXX</Highlight>, sans trous ni réutilisation. Téléchargeable
                        depuis votre espace compte.
                    </Para>

                    <h3 className="font-mono text-[10px] text-[#FFFFFF] uppercase tracking-widest mb-2 mt-6">
                        7. Médiation
                    </h3>
                    <Para>
                        Conformément à l'article L616-1 du Code de la consommation, tout litige non résolu
                        peut être soumis à un médiateur. Overfitted adhère au service de médiation :{" "}
                        <Highlight>[NOM MÉDIATEUR]</Highlight> — <Highlight>[URL MÉDIATEUR]</Highlight>.
                    </Para>

                    <h3 className="font-mono text-[10px] text-[#FFFFFF] uppercase tracking-widest mb-2 mt-6">
                        8. Droit applicable
                    </h3>
                    <Para>
                        Les présentes CGV sont soumises au droit français. En cas de litige, compétence
                        exclusive des tribunaux français, sauf disposition impérative contraire.
                    </Para>

                    <Rule />

                    <p className="font-mono text-[10px] text-[#444] uppercase tracking-widest text-center">
                        Dernière mise à jour :{" "}
                        <span className="text-[#555]">
                            {new Date().toLocaleDateString("fr-FR", {
                                day: "2-digit",
                                month: "long",
                                year: "numeric",
                            })}
                        </span>
                    </p>
                </article>
            </div>

            <AppFooter />
        </div>
    );
}
