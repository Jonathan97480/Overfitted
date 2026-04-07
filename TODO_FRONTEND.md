# 📋 TODO — Overfitted.io Frontend

> Mise à jour manuelle au fil du développement. État au 06/04/2026 — Phase 0, 2 et 3 complétées ✅
> Convention : `- [x]` fait · `- [ ]` à faire · `- [~]` en cours

---

## 🎨 Design Tokens (extraits des maquettes)

```
Fond principal       #0A0A0A (quasi noir, code overlay fané en bg)
Neon Orange          #FF6B00  → boutons CTA, logo, underline nav actif, jauge aiguille
Cyber Cyan           #00F0FF  → bordures panels, scan line, sliders, nav hover
Texte principal      #FFFFFF
Texte secondaire     #AAAAAA (labels monospace)
Surface panel        #111827 (cards, toolkits)
Bordure panel        1px solid #00F0FF avec box-shadow cyan glow

Typo logo     : Bubble/cursive stylisé, fill orange, stroke cyan, glitch RGB-split
Typo UI       : JetBrains Mono, UPPERCASE, espacement lettres élevé
Typo corps    : JetBrains Mono (tout est monospace dans l'UI)

Bouton CTA    : bg #FF6B00, uppercase, texte principal + sous-titre parenthèse
               ex: "OVERFIT ME\n(FIX THE DESIGN)"
               border-radius: ~8px, padding généreux, width: 100%

Window chrome : barre titre sombre + titre monospace + 3 boutons □ □ X (style Win95 rétro)
Status bar    : barre fixe bas de page, monospace, "State: X | Redux Store: SYNCED"
Badge chaos   : "[XX% HUMAN CHAOS]" en cyan, monospace, style label terminal
```

---

## Phase 0 — Init & Setup

- [x] **Initialiser Next.js 15** — `npx create-next-app@latest frontend --typescript --tailwind --app`
- [x] **Shadcn/ui** — `npx shadcn@latest init` (thème dark, style "default")
- [x] **Redux Toolkit + RTK Query** — `npm install @reduxjs/toolkit react-redux`
- [x] **Framer Motion** — `npm install framer-motion`
- [ ] **i18n (internationalisation FR/EN)** — `npm install next-intl`
  - Fichiers de traduction : `messages/fr.json` + `messages/en.json`
  - Détection automatique de la langue système (`Accept-Language` header) à l'arrivée
  - Stockage du choix utilisateur : `localStorage` + cookie `NEXT_LOCALE` (pour SSR)
  - Redux slice `i18nSlice` — `locale: 'fr' | 'en'`, synchronisé avec `next-intl`
  - Routing : `app/[locale]/...` — URLs `/fr/shop`, `/en/shop` (ou sans préfixe pour la langue par défaut FR)
- [x] **Configurer `tailwind.config.ts`** — couleurs : `neon: #FF6B00`, `cyan: #00F0FF`, `dark: #0A0A0A`, `panel: #111827`
- [x] **Polices** — `JetBrains Mono` uniquement via `next/font/google` (toute l'UI est mono)
- [x] **Variables d'env** — `NEXT_PUBLIC_API_URL=http://localhost:8000` dans `.env.local`
- [x] **Store Redux** — `store.ts` + `Provider` dans `app/layout.tsx`
- [x] **RTK Query base API** — `apiSlice.ts` avec `baseUrl = NEXT_PUBLIC_API_URL`
- [ ] **ESLint + Prettier** — config stricte TypeScript (no `any`)
- [x] **`npm run build` et `npm test` passent** — pipeline CI-ready

---

## Phase 1 — Design System

### Composants atomiques
- [ ] **`OvfLogo`** — "Overfitted" bubble text avec stroke cyan, Framer Motion glitch RGB-split au mount (3 couches décalées rouge/cyan/blanc à ±2px)
- [ ] **`GlitchText`** — texte monospace avec animation glitch keyframes (translateX aléatoire + clip-rect rapide), props: `children`, `intensity: 'low'|'medium'|'high'`
- [ ] **`ScanLineOverlay`** — ligne verticale cyan (#00F0FF) qui traverse une zone de gauche à droite en boucle (Framer Motion `x` animation), utilisée sur les previews image
- [ ] **`TerminalWindow`** — conteneur avec chrome Win95 rétro : barre titre sombre + texte uppercase + boutons □ □ X non fonctionnels, bordure cyan glow, fond #111
- [ ] **`TerminalOutput`** — texte monospace dans `TerminalWindow`, format `CLE: VALEUR`, support multi-lignes, prop `lines: {key: string, value: string, variant?: 'normal'|'warn'|'error'}[]`
- [ ] **`NeonBadge`** — `[XX% HUMAN CHAOS]` style badge, prop `label`, couleur cyan, monospace uppercase, utilisé sur les product cards
- [ ] **`StatusBadge`** — badge statut pipeline (PENDING/PROCESSING/READY/FAILED), couleur conditionnelle (orange/cyan/vert/rouge)
- [ ] **`CyberCard`** — carte avec bordure 1px cyan, box-shadow `0 0 12px #00F0FF40`, fond #111827, window chrome optionnel (prop `withChrome`)
- [ ] **`OvfButton`** — bouton CTA orange, uppercase, sous-titre parenthèse optionnel, variantes : `primary` (orange filled) | `ghost` (text only)
- [ ] **`CircularGauge`** — jauge circulaire Soul-O-Meter : fond sombre, graduation 0-100 (ou 0-130), aiguille orange animée (Framer Motion rotate), label % centré, sous-titre (ex: "ORGANIC CHAOS")
- [ ] **`MemoryGraph`** — mini graphe waveform plat style oscilloscope, données fictives ou prop `values: number[]`, couleur orange, fond transparent
- [ ] **`BeforeAfterSlider`** — comparaison avant/après : slider horizontal avec poignée circulaire, clip CSS pour révéler l'image "after"
- [ ] **`ColorSwatch`** — carré arrondi cliquable pour sélection couleur t-shirt, état sélectionné avec bordure cyan
- [ ] **`VerticalSlider`** — input range vertical (CSS `writing-mode: vertical-lr`), couleur cyan, label au-dessus, utilisé pour SCALE et POSITION
- [ ] **`PageStatusBar`** — barre fixe `position: fixed; bottom: 0`, monospace, affiche "State: X | Redux Store: SYNCED", hauteur ~24px, bg #000, texte cyan/blanc

- [ ] **`LanguageSwitcher`** — composant dans l'`AppHeader` (droite) :
  - Affichage : `FR | EN` en monospace, langue active surlignée orange
  - Au clic : met à jour `i18nSlice`, cookie `NEXT_LOCALE`, rerend les textes sans rechargement de page
  - Détection auto au premier chargement : langue système via `Accept-Language` → si non FR/EN → défaut FR

### Layouts
- [ ] **`RootLayout`** — fond #0A0A0A, code overlay fané en background (pseudo-élément, opacity 0.05), `PageStatusBar` inclus en global
- [ ] **`AppHeader`** — `OvfLogo` centré + nav horizontale centrée (`HOME|SHOP|UPLOAD|DESIGN|ABOUT`) + **`LanguageSwitcher` à droite** + icône panier (compteur items) + icône compte (login/avatar), item actif souligné orange, monospace uppercase
- [ ] **`AppFooter`** — liens : Mentions légales (`/legal`) | CGV | Contact | badge "HUMAN CHAOS APPROVED"
- [ ] **`AdminLayout`** — sidebar collapsable + header + breadcrumb (Phase 3)

---

---

## Phase 2 — Backend : Admin REST API (prérequis panneau)

> Le SQLAdmin `/admin` (backend) reste le CRUD brut.
> Ces endpoints sont l'API JSON consommée par le panneau Next.js.

- [x] **`app/services/admin_api/router.py`** — nouveau router FastAPI `/api/admin`
- [x] **Middleware auth admin** — dependency `require_admin_token` (JWT ou session cookie)
- [x] **`GET /api/admin/stats`** — total users, designs, orders + revenue Stripe
- [x] **`GET /api/admin/users`** — liste paginée (id, email, created_at, nb designs, total dépensé TTC)
- [x] **`GET /api/admin/designs`** — liste paginée + filtre par `status`
- [x] **`PATCH /api/admin/designs/{id}/status`** — changer le statut d'un design
- [x] **`GET /api/admin/orders`** — liste paginée + filtre par `status`
- [x] **`PATCH /api/admin/orders/{id}/status`** — mettre à jour le statut d'une commande
- [x] **`GET /api/admin/products`** — liste complète
- [x] **`POST /api/admin/products`** — créer un produit
- [x] **`PATCH /api/admin/products/{id}`** — éditer un produit
- [x] **`DELETE /api/admin/products/{id}`** — supprimer un produit
- [x] **CRUD `/api/admin/promo`** — codes promo (liste, créer, éditer, supprimer)
- [x] **`POST /auth/register`** + **`POST /auth/login`** + **`GET /auth/me`** — auth utilisateurs publics (JWT HttpOnly cookie)
- [x] **`POST /commerce/promo/validate`** — vérifie un code promo (actif, non expiré, quota)
- [x] **`GET /commerce/invoice/{order_id}`** — génération PDF facture (weasyprint ou reportlab)
- [x] **`GET /api/admin/invoices`** — liste paginée des factures admin
- [x] **`GET /commerce/checkout/confirm`** — vérification post-paiement Stripe (`session_id`)
- [x] **`GET /auth/me/export`** — export JSON données utilisateur (RGPD Art. 15)
- [x] **`DELETE /auth/me`** — anonymisation compte (RGPD Art. 17) — bloqué si commande active
- [x] **`PATCH /auth/me`** — modification email/nom/mot de passe
- [x] **Tests** — 20+ tests pour les nouveaux endpoints (auth, CRUD, promo, invoice PDF, RGPD)

---

## Phase 3 — Admin Panel (Next.js)

> **Style :** Classic admin dashboard — sidebar fixe + topbar + content area.
> Thème dark neutre (#0F1117 fond, #1A1D27 sidebar/cards, #252836 bordures),
> accents orange (#FF6B00) pour les actions et états actifs uniquement.
> Aucun glitch, aucun effect cyberpunk — interface professionnelle lisible.

---

### Admin Design Tokens

```
Fond page          #0F1117
Fond sidebar       #1A1D27
Fond card/table    #1E2130
Bordure            1px solid #252836
Texte principal    #F1F1F1
Texte secondaire   #8B8FA8
Accent actif       #FF6B00
Accent hover       #FF6B0022  (orange très transparent)
Danger             #EF4444
Succès/Ready       #22C55E
Warning/Processing #F59E0B
Info/Pending       #3B82F6

Typo               Inter (pas monospace — lisibilité data)
Sidebar width      240px (collapsed: 64px)
Topbar height      60px
Row height table   48px
Border-radius      6px (cards), 4px (badges), 8px (modals)
```

---

### Layout Admin

- [x] **`AdminLayout`** — layout racine : `<Sidebar /> + <div class="flex-1"><Topbar /><main /></div>`
- [x] **`AdminSidebar`** — sidebar fixe 240px, sections avec séparateurs :
  - **Logo** : "Overfitted" petit + badge "ADMIN" orange en haut
  - **Nav principale** : Dashboard, Statistiques, Designs, Commandes, Produits, Utilisateurs, Codes Promo, Factures, Paramètres — icônes Lucide + label
  - **État actif** : `border-l-2 border-orange text-orange bg-orange/10`, items inactifs `text-secondary hover:text-white hover:bg-white/5`
  - **Bas sidebar** : avatar initiales + email tronqué + bouton Déconnexion
  - **Collapse** : bouton `<` / `>` qui réduit à 64px (icônes seules + tooltip)
- [x] **`AdminTopbar`** — barre 60px : breadcrumb gauche + titre page | search input centre | notifications + avatar droite
- [x] **`middleware.ts`** — protection de toutes les routes `/admin/*` via `proxy.ts` (Next.js 16)

---

### Auth
- [x] **Page `/admin/login`** — formulaire centré, carte 400px, logo Overfitted, inputs `Username` + `Password`, bouton orange "Se connecter", message d'erreur inline
- [x] **RTK Query `adminAuthApi`** — `POST /api/admin/login` + gestion cookie session
- [x] **Hook `useAdminAuth`** — vérifie session, expose `logout()`

---

### Dashboard `/admin`

- [x] **`StatsRow`** — rangée de 4 cartes KPI horizontales :
  - Carte : icône Lucide + chiffre grand + label + delta (↑ +12% ce mois) en vert/rouge
  - KPIs : Total Users | Designs en attente | Revenue mensuel (€) | Commandes actives
- [x] **`RecentDesignsTable`** — tableau 5 derniers designs avec colonnes : Aperçu (thumb 40px) | ID | DPI | Statut badge | Date → lien "Voir tout"
- [x] **`RecentOrdersTable`** — tableau 5 dernières commandes : ID | Produit | Montant | Statut | Date → lien "Voir tout"
- [x] **RTK Query polling 30s** sur stats + recent items

---

### Statistiques `/admin/stats`

> Section dédiée à l'analyse du trafic et de la performance commerciale.
> Données agrégées côté backend, affichées via graphes Recharts.

#### Prérequis backend
- [x] **`GET /api/admin/stats/traffic`** — visiteurs uniques par jour/semaine/mois (via logs ou middleware compteur)
- [x] **`GET /api/admin/stats/products`** — produits les plus consultés + les plus vendus (compteur vues + agrégat orders)
- [x] **`GET /api/admin/stats/finance`** — revenus (Stripe) et dépenses (Printful) par période
- [x] **Middleware compteur vues** — `backend/app/middleware/analytics.py` : incrémente un compteur Redis `views:{product_id}` à chaque `GET /api/products/{id}`

#### Composants frontend
- [x] **`StatsNav`** — sub-nav horizontale dans la page : Trafic | Produits | Finances
- [x] **Sous-section Trafic**
  - `UniqueVisitorsChart` — courbe (Recharts `LineChart`) visiteurs uniques sur 30 jours, sélecteur période (7j / 30j / 90j)
  - `TopPagesTable` — tableau : URL | Vues | Visiteurs uniques | Taux de rebond estimé
- [x] **Sous-section Produits**
  - `MostViewedProducts` — top 10 articles consultés : thumbnail + nom + compteur vues + badge catégorie
  - `BestSellersChart` — bar chart horizontal (Recharts `BarChart`) top 5 articles vendus, axe = quantité vendue
  - `SalesRankTable` — tableau complet : Produit | Vues | Ventes | Taux conversion (ventes/vues %)
- [x] **Sous-section Finances**
  - `FinanceSummaryCards` — 3 cartes : Revenus bruts (Stripe) | Coûts Printful | Marge nette — avec delta vs période précédente
  - `RevenueVsCostChart` — area chart (Recharts `AreaChart`) 2 séries : Revenus vs Dépenses sur 30 jours
  - `TransactionsTable` — tableau paginé : Date | Revenus | Coûts Printful | Marge | Marge %
- [x] **Sélecteur de période global** — date-range picker (Shadcn + `react-day-picker`) appliqué à tous les graphes de la page
- [x] **Export CSV** — bouton qui génère un CSV client-side depuis les données RTK Query actuelles
- [x] **`npm install recharts`** — librairie graphes
- [x] **`npm install next-sitemap`** — génération automatique `sitemap.xml` + `robots.txt`
- [x] **`sitemap.xml`** — toutes les pages publiques indexées, routes `/admin/*` et `/api/*` exclues
- [x] **`robots.txt`** — `Disallow: /admin`, `Disallow: /api`, `Allow: /`

---

### Designs `/admin/designs`

- [x] **Toolbar** — search input + tabs statut (All | Pending | Processing | Ready | Failed) + compteur résultats
- [x] **`DesignsTable`** — tableau paginé 20/page :
  - Colonnes : `[]` checkbox | Aperçu 48px | ID | DPI | `StatusBadge` | Soul Score | Date | Actions
  - `StatusBadge` : pill coloré (Pending=bleu, Processing=jaune, Ready=vert, Failed=rouge)
  - Actions par ligne : dropdown `⋮` → Changer statut / Voir détail / Supprimer
  - Sélection multiple + action groupée "Changer statut"
- [x] **Pagination** — Previous/Next + numéros de pages, affichage "Résultats 1-20 sur 143"
- [x] **Page `/admin/designs/[id]`** — layout 2 colonnes :
  - Gauche : image originale + image SVG (onglets), métadonnées (DPI, format, taille fichier)
  - Droite : Soul-O-Meter scores (barres de progression), roast IA (bloc texte), sélecteur statut + bouton sauvegarder

---

### Commandes `/admin/orders`

- [x] **Toolbar** — search + tabs (All | Pending | Paid | Submitted | Shipped | Cancelled) + export CSV bouton
- [x] **`OrdersTable`** — tableau paginé :
  - Colonnes : ID | User email | Design thumb | Montant | Stripe ID (tronqué+copie) | Printful ID | `StatusBadge` | Date | Actions
  - Actions : dropdown `⋮` → Changer statut / Ouvrir Printful / Voir user
- [x] **`ChangeStatusModal`** — Shadcn Dialog : select statut + champ note optionnel + confirmation

---

### Produits `/admin/products`

- [x] **Toolbar** — search + bouton "Nouveau produit" orange (droite)
- [x] **`ProductsTable`** — tableau :
  - Colonnes : ID | Nom | Catégorie | Printful Variant ID | Prix (€) | Vues | Actions
  - Prix : editable inline au clic (input + Enter pour valider + `PATCH` auto)
  - Actions : Éditer (ouvre modal) / Supprimer (AlertDialog confirmation)
- [x] **`ProductFormModal`** — Shadcn Dialog multi-étapes :
  - **Étape 1 — Infos** : champs `name`, `category` (select), `printful_variant_id`, `price` + validation Zod
  - **Étape 2 — Image** : dropzone upload, puis **outils de traitement** :
    - Bouton **Remove Background** → `POST /fixer/remove-bg` (rembg, retourne PNG transparent)
    - Bouton **Upscale to 300 DPI** → `POST /fixer/vectorize` (dispatch Celery, polling statut)
    - Bouton **Vectoriser en SVG** → `POST /fixer/vectorize` avec option SVG, polling jusqu'à `ready`
    - Indicateur de progression : `ScanLineOverlay` + statut texte pendant le traitement Celery
    - Prévisualisation avant/après (`BeforeAfterSlider`)
  - **Étape 3 — Validation** : résumé récapitulatif + DPI check (`check_print_ready`) affiché + bouton "Créer le produit"
- [x] **Endpoint backend** `POST /fixer/remove-bg` — nouveau endpoint (appelle `remove_background()` de fixer, retourne PNG bytes)

---

### Utilisateurs `/admin/users`

- [x] **Toolbar** — search par email
- [x] **`UsersTable`** — tableau paginé :
  - Colonnes : ID | Email | Date inscription | Nb designs | Nb commandes | Dépenses totales (TTC)
  - Clic ligne → ouvre `UserDetailPanel`
- [x] **`UserDetailPanel`** — Shadcn Sheet (slide-over droite 480px) :
  - Header : initiales avatar + email + date inscription
  - Section Designs : liste compacte avec status + date
  - Section Commandes : liste compacte avec montant TTC + statut + lien facture PDF

---

### Codes Promo `/admin/promo`

#### Prérequis backend
- [x] **Modèle `PromoCode`** — `code` (unique, uppercase), `discount_type: 'percent'|'fixed'`, `discount_value`, `max_uses` (0 = illimité), `uses_count`, `expires_at`, `is_active`
- [x] **Migration Alembic** `add_promo_code`

#### Composants frontend
- [x] **`PromoCodesTable`** — colonnes : Code | Type | Valeur | Utilisations (X/max) | Expiration | Statut | Actions
- [x] **`PromoCodeFormModal`** — champs : `code` (auto-uppercase au typing), `discount_type` (select %), `discount_value`, `max_uses`, `expires_at` (date picker), `is_active` (toggle) + validation Zod
- [x] **`StatusBadge` calculé** — Actif (vert) / Expiré (gris) / Épuisé (rouge) / Inactif (jaune)
- [x] **Bouton copier code** — copie dans le presse-papier, toast confirmation

---

### Factures `/admin/invoices`

> Conformité facturation France (Art. 289 CGI + Décret 2013-346).
> Numérotation séquentielle `OVF-2026-XXXX` — jamais de trous, jamais de réutilisation.

#### Prérequis backend
- [x] **Modèle `Invoice`** — `id`, `order_id` (FK unique), `invoice_number` (`OVF-YYYY-XXXX`), `issued_at`, `user_email`, `user_name`, `items_json`, `amount_ht`, `tva_rate` (0.20), `amount_tva`, `amount_ttc`, `promo_code`, `discount_amount`
- [x] **Génération automatique** à la réception du webhook Stripe `checkout.session.completed`
- [x] **`GET /commerce/invoice/{order_id}`** — retourne le PDF (lib `weasyprint`)
- [x] **Mentions légales PDF obligatoires** :
  - Raison sociale, SIRET, adresse, n° TVA intracommunautaire du vendeur
  - Numéro de facture séquentiel unique
  - Date d'émission
  - Nom/adresse de l'acheteur
  - Description produit, qté, prix unitaire HT, taux TVA (20%), montant TVA, total TTC
  - Code promo + montant remise si applicable
  - Conditions de paiement + délai de rétractation 14 jours (Directive 2011/83/UE)
- [x] **Migration Alembic** `add_invoice`

#### Composants frontend
- [x] **Page `/admin/invoices`** — toolbar : date-range picker + search (email ou n° facture)
- [x] **`InvoicesTable`** — colonnes : N° Facture | Date | Client | Commande | Montant HT | TVA | Montant TTC | Actions
  - Bouton **Télécharger PDF** par ligne → `GET /commerce/invoice/{order_id}`
- [x] **Bouton "Exporter tout (ZIP)"** — télécharge toutes les factures de la période sélectionnée

---

### Paramètres `/admin/settings`

> Configuration des clés API et intégrations externes.
> Les valeurs affichées sont masquées (type `password`), jamais loggées.
> Sauvegarde via `PATCH /api/admin/settings` — valeurs stockées en base chiffrées (ou `.env` rechargé).

#### Prérequis backend
- [x] **Modèle `Settings`** — table `settings` : `key` (unique), `value` (chiffré), `updated_at`
- [x] **`GET /api/admin/settings`** — retourne les clés avec valeur masquée (`***` sauf si explicitement demandé)
- [x] **`PATCH /api/admin/settings`** — met à jour une ou plusieurs clés

#### Composants frontend
- [x] **`SettingsPage`** — layout en sections accordéon (Shadcn Accordion)
- [x] **Section IA / LLM**
  - Champ `LLM_BASE_URL` (ex: `http://localhost:1234` pour LM Studio)
  - Champ `LLM_MODEL` (ex: `gemma-4-e4b-it`)
  - Bouton **Tester la connexion** → `GET /api/admin/settings/test/llm` → badge Connecté ✓ / Erreur ✗
- [x] **Section Printful**
  - Champ `PRINTFUL_API_KEY` (masqué, reveal au clic)
  - Bouton **Tester** → `GET /api/admin/settings/test/printful` → badge statut
- [x] **Section Stripe**
  - Champ `STRIPE_SECRET_KEY` (masqué)
  - Champ `STRIPE_WEBHOOK_SECRET` (masqué)
  - Bouton **Tester** → `GET /api/admin/settings/test/stripe` → badge statut
- [x] **Section OpenAI** (optionnel, cloud fallback)
  - Champ `OPENAI_API_KEY` (masqué)
  - Bouton **Tester**
- [x] **`ApiKeyField`** — composant réutilisable : input type `password` + bouton œil toggle reveal + bouton copier + badge statut connexion
- [x] **Sauvegarde** — bouton "Sauvegarder" par section (pas global), confirmation toast Shadcn Sonner

---

## Phase 4 — Pages Publiques (après admin)

### Page `/` — Home
> Maquette : 3 T-shirts en vitrine (3D-ish podium), panel IA à droite, collections en bas
- [x] **Showcase 3 produits** — Carousel rotatif (clic sur label = animation spring), produits réels DB via RTK Query, labels SYNTAX COLLECTION / HALLUCINATION DROP / PULSE (PROCEDURAL), produit central en grand + glow orange, latéraux réduits + cyan
- [x] **Panel droit "AI CHECKER"** — `TerminalWindow` avec lignes : STATUS / FILE / DPI / FORMAT / HUMANITY_SCORE / AI_ROAST + curseur clignotant
- [x] **Bouton "UPLOAD CREATION (WE DARE YOU)"** — `OvfButton` orange en haut du panneau droit, lien vers `/upload`
- [x] **Soul-O-Meter panel** — `CircularGauge` + Before/After + bouton "OVERFIT ME (FIX THE DESIGN)" fusionné dans le panneau droit
- [x] **Footer** — nav secondaire, badge "HUMAN CHAOS APPROVED" (cercle cyan avec silhouette)
- [x] **AppHeader** — logo SVG centré `h-16` + nav 2 lignes + MemoryGraph hydration fix

---

### Page `/shop` — Prototype Database
> Maquette : sidebar filtres gauche, grille 2×N de product cards style terminal
- [x] **Sidebar "DIAGNOSTIC FILTERS"** (fixe gauche) — sticky left, checkboxes custom orange X, slider sarcasm 0-100% avec label niveau, bouton "APPLIQUER LES FILTRES" orange
  - Checkboxes COLLECTIONS : SYNTAX (Human Chaos) / HALLUCINATION (AI) / PULSE (Live Data Stream) — style checkbox custom orange X
  - Checkboxes PRODUCTS : T-SHIRTS PREMIUM / HOODIES OVERSIZE / XXL PAD / STICKERS
  - Slider "SARCASM LEVEL" horizontal 0-100% avec label niveau (`'SEVERE'`, etc.)
  - Bouton "APPLIQUER LES FILTRES" orange
- [x] **Header** — "PROTOTYPE DATABASE (N RESULTS)" monospace cyan, compteur filtré dynamique
- [x] **Grille produits 2×N** — `CyberCard` avec window chrome "glitched terminal", contenu : image produit | nom + type + détails | `NeonBadge` [XX% HUMAN CHAOS] | prix | bouton "Ajouter au Diagnostic"
- [x] **Redux slice `shopSlice`** — `pendingCollections`, `pendingProductTypes`, `pendingSarcasmLevel`, `applied*` + actions `togglePendingCollection`, `togglePendingProductType`, `setPendingSarcasmLevel`, `applyFilters` — filtrage client-side via `useMemo`
- [x] **Statut bar** — "Shop State: READY | Redux RTK Store: ACTIVE" — fixée en bas via `position: fixed`

---

### Page `/shop/[slug]` — Détail produit ⚠️ manquant
> Indispensable — sans cette page, l'utilisateur ne peut pas voir les variantes/tailles avant d'acheter.
- [x] **Galerie images** — image principale + thumbnails cliquables, zoom scale au hover (group-hover:scale-105)
- [x] **Infos produit** : nom, catégorie, prix TTC récupéré via `retail_price` Printful, `NeonBadge` collection détectée depuis le nom du produit
- [x] **Sélection taille** — boutons taille (XS→3XL) dynamiques selon les `sync_variants` de l'API Printful, épuisés grisés + `line-through` + `cursor-not-allowed`
- [x] **Sélection couleur** — `ColorSwatch` (composant nouveau) si plusieurs couleurs disponibles, reset de la taille au changement de couleur
- [x] **Bouton "AJOUTER AU PANIER"** — `OvfButton` orange → dispatch `cartSlice.addItem()`, feedback "AJOUTÉ ✓" 2s, désactivé si taille non choisie
- [x] **Endpoint backend** — utilise `GET /api/products/{product_id}` déjà existant + `getProductById` RTK Query ajoutée à `publicApi.ts`
- [x] **Breadcrumb** : `HOME › SHOP › [NOM PRODUIT]` monospace cyan, liens actifs
- [x] **Produits similaires** — grille 3 `CyberCard` (autres produits de la liste), cliquables vers leur `/shop/{id}`
- [x] **`og:image` + `og:title`** — `generateMetadata` async dans `layout.tsx` avec fetch SSR Printful + revalidate 3600s

---

### Page `/shop/[slug]` — Note légale POD ⚠️ importante
> Les produits personnalisés (Print-on-Demand avec design custom) sont exclus du droit de rétractation 14j.
> **Art. L221-28 12° Code de la consommation** : "biens confectionnés selon les spécifications du consommateur".
> Cette exception doit être affichée clairement sur la page produit et dans les CGV.
- [x] **Mention visible** sur la page produit : "Ce produit est fabriqué à la demande. Conformément à l'art. L221-28 du Code de la consommation, il ne peut faire l'objet d'un droit de rétractation." — affichée sous le bouton "Ajouter au panier"
- [x] Même mention dans les CGV de `/legal`

---

### Page `/about` — À propos ⚠️ manquant (dans la nav)
- [x] Pitch de marque : "Critiqué par l'IA, réparé pour les Humains" — style TerminalWindow
- [x] Histoire du projet, vision, collections expliquées
- [x] Technologie : pipeline Fixer, Soul-O-Meter, Roast Engine — expliqués en mode hacker
- [x] CTA bas de page vers `/upload`

---

### Page `/contact` — Contact ⚠️ manquant (dans le footer)
> Obligatoire pour la mention légale LCEN (éditeur joignable).
- [x] Formulaire : nom, email, sujet (select), message — validation Zod
- [x] Endpoint backend `POST /contact` — envoie un email (lib `fastapi-mail` ou SMTP direct)
- [x] Succès : `TerminalWindow` "MESSAGE_SENT: NOUS_AVONS_BIEN_RECU_VOTRE_SIGNAL"
- [x] Lien email direct en fallback visible

---

### Page `/upload` — Diagnostic Terminal
> Maquette : zone image centrale avec scan, panel BEFORE/AFTER, terminal roast + Soul-O-Meter à droite
- [x] **Header section** — "DIAGNOSTIC TERMINAL (RESULTS)" titre monospace cyan
- [x] **Zone image centrale** — drag-and-drop + `ScanLineOverlay` vertical cyan animé, bordure neon orange, `TerminalWindow` wrapping
- [x] **Panel BEFORE/AFTER** (bas gauche) — `CyberCard` avec titres BEFORE/AFTER, thumbnails, flèche de comparaison
- [x] **CTA buttons** — "OVERFIT ME (FIX THE DESIGN)" orange + "RE-UPLOAD (WE DARE YOU)" ghost
- [x] **Panel "AI ROAST' TERMINAL"** (droite) — `TerminalWindow` avec STATUS / VERDICT / RESOLUTION: 72 DPI (TRASH)
- [x] **Panel "SOUL-O-METER"** (droite bas) — `CircularGauge` + `BeforeAfterSlider` + `MemoryGraph` + bouton OVERFIT ME
- [x] **Redux slice `uploadSlice`** — état : `idle | uploading | analyzing | ready | error`, `taskId`, `roastResult`, `soulScore`, `imageUrl`
- [x] **RTK Query polling** — `GET /fixer/status/{taskId}` + `GET /soul/status/{taskId}` chaque 2s jusqu'à `ready`

---

### Page `/design` — Design Toolkit
> Maquette : toolkit gauche, preview T-shirt centre, AI Validator Terminal droite
- [x] **Panel gauche "DESIGN TOOLKIT (v1.0)"**
  - Section T-SHIRT COLOR : grille de `ColorSwatch` (noir, blanc, gris, cyan, orange×2)
  - Section DESIGN LAYOUT : `VerticalSlider` SCALE + `VerticalSlider` POSITION (labels verticaux)
  - Section ADD SARCASTIC TEXT : textarea monospace "Write your insult here", bordure cyan
- [x] **Sélection taille** — intégré dans le toolkit avant "ADD TO CART" (XS→XXL, requis avant ajout panier)
- [x] **Preview T-shirt** (centre) — image t-shirt avec design positionné, label du design en cyan sous le visuel (ex: "PROMPT_ENGINEERING_SCUM\n(FLAWED_HUMAN_ART)")
- [x] **Panel droit "AI VALIDATOR TERMINAL"** — `TerminalWindow` : STATUS / MESSAGE / Humanity Score
- [x] **Panel bas droit "HUMANITY SCORE"** — `CircularGauge` + section TECH GLITCH FILTERS (checkboxes : STATIC_NOISE, COLOR_BLEED, ASCII_OVERLAY) + `MemoryGraph`
- [x] **Bouton "ADD TO CART (PURCHASE ORGANIC CHAOS)"** — `OvfButton` orange large, pleine largeur — désactivé tant que taille non choisie
- [x] **Statut bar** — "Design State: OK | Redux Store: SYNCED"
- [x] **Redux slice `designSlice`** — `selectedColor`, `selectedSize`, `scale`, `position`, `sarcasticText`, `glitchFilters`

---

### Emails transactionnels ⚠️ manquants (backend)
> Fondamentaux pour l'UX e-commerce et les obligations légales.
- [x] **Lib backend** — `fastapi-mail` + `jinja2` pour les templates HTML
- [x] **`POST /auth/register`** envoie un email de vérification avec lien tokenisé
- [x] **Template email** : confirmation inscription ("Bienvenue dans le chaos organique")
- [x] **Template email** : vérification adresse email (lien `GET /auth/verify-email?token=xxx`)
- [x] **Template email** : confirmation de commande (récapitulatif + lien suivi + lien facture PDF)
- [x] **Template email** : expédition (numéro de tracking transporteur)
- [x] **Template email** : reset mot de passe (lien `GET /auth/reset-password?token=xxx`)
- [x] **`GET /api/admin/email-preview/[template]`** — prévisualisation des templates dans l'admin (section Paramètres)

---

### Page `/verify-email` — Vérification email
- [x] `GET /verify-email?token=xxx` → appelle `GET /auth/verify-email?token=xxx` → badge ✓ "Email vérifié" ou erreur "Lien expiré"
- [x] Lien "Renvoyer l'email de vérification" si lien expiré

### Page `/forgot-password` — Mot de passe oublié ⚠️ manquant (mentionné dans `/login`)
- [x] Formulaire email seul → `POST /auth/forgot-password` → toast "Si cet email existe, un lien vous a été envoyé"
- [x] (Message volontairement vague pour éviter l'énumération d'emails — sécurité OWASP)

### Page `/reset-password` — Réinitialisation mot de passe ⚠️ manquant
- [x] `GET /reset-password?token=xxx` → formulaire nouveau mot de passe + confirmation → `POST /auth/reset-password`
- [x] Token expiré → message d'erreur + lien vers `/forgot-password`

---

### Pages restantes
- [x] **Page `/checkout`** — redirect vers Stripe Checkout hosted avec `session_id` + code promo appliqué

### Page `/checkout/success` — Confirmation
- [x] **Vérification `session_id`** → `GET /commerce/checkout/confirm?session_id=xxx`
- [x] **`TerminalWindow`** : `ORDER_ID / STATUT: PAID / CONFIRMATION ENVOYÉE PAR EMAIL`
- [x] **Bouton "TÉLÉCHARGER MA FACTURE (PDF)"** → `GET /commerce/invoice/{order_id}`
- [x] **Vider le panier** — `cartSlice.clearCart()` au succès

### Page `/checkout/cancel` — Paiement annulé
- [x] Redirect `/cart` + toast "Paiement annulé — votre panier est intact"

### Page `/register` — Inscription
- [x] **`CyberCard`** centré 420px — champs : `email`, `password`, `confirm_password`, checkbox "J'accepte les CGV" obligatoire
- [x] **Validation Zod** — email format, password 8+ chars, passwords identiques, CGV cochées
- [x] **RTK Query `POST /auth/register`** — redirect `/` après succès + toast "Bienvenue dans le chaos"
- [x] **Lien vers `/login`** en bas du formulaire

### Page `/login` — Connexion
- [x] Formulaire email + password, lien "Pas encore de compte ?" → `/register`, lien "Mot de passe oublié ?" → `/forgot-password`
- [x] **RTK Query `POST /auth/login`** — JWT stocké en cookie HttpOnly (jamais en localStorage)
- [x] **Redirect** vers page précédente après login (param `?next=/cart`)

### Page `/cart` — Panier
- [x] **Redux slice `cartSlice`** — `items: CartItem[]` (inclut `size`), `promoCode`, `discount`, persistance `localStorage`
- [x] **Badge panier** dans `AppHeader` — compteur items dynamique
- [x] **Layout 2 colonnes** :
  - **Articles** : `CartItemRow` (thumbnail + nom + couleur + **taille** + sélecteur qté −/+ + prix ligne + supprimer), panier vide avec lien `/shop`
  - **Récapitulatif `OrderSummaryCard`** :
    - Sous-total HT
    - Remise promo (ligne verte, ex: `-10% · CHAOS10 · −3.00€`)
    - Frais de livraison (via Printful)
    - TVA 20%
    - **Total TTC** (montant légal affiché en gras)
    - `PromoCodeInput` — champ + bouton "Appliquer" → `POST /commerce/promo/validate` → badge ✓ vert si valide / erreur inline si invalide ou expiré
    - Bouton CTA "PROCÉDER AU PAIEMENT" orange → `/checkout`
- [x] **Middleware** `cartPersistMiddleware` — sync `cartSlice` ↔ `localStorage`

### Page `/account/orders` — Historique & Suivi commandes
- [x] **Tableau** : Date | N° Commande | Produit(s) | Montant TTC | Statut | Facture
- [x] **Clic sur une commande** → ouvre `OrderTrackingPanel` (Shadcn Sheet ou page dédiée)
- [x] **`OrderTrackingPanel`** — suivi en temps réel :
  - Timeline verticale avec étapes : Paiement reçu → Préparation → Envoyé chez Printful → En production → Expédié → Livré
  - Étape active mise en évidence (icône colorée + label), étapes futures grisées
  - Statut Printful rafraîchi toutes les 60s via RTK Query polling `GET /commerce/order/{id}`
  - Numéro de tracking transporteur + lien externe quand disponible (`target="_blank"`)
  - Délai de livraison estimé affiché
- [x] **Bouton "Télécharger facture"** par ligne → `GET /commerce/invoice/{order_id}` (PDF)
- [x] **Accès protégé** — redirect `/login` si non connecté

### Page `/account/profile` — Mon compte (RGPD)

> Conformité RGPD (Règlement UE 2016/679) obligatoire pour tout site à destination d'utilisateurs européens.

- [ ] **Informations personnelles** :
  - Email affiché + bouton "Modifier l'email" (confirmation par lien envoyé à l'ancien email)
  - Nom d'affichage optionnel
  - Changement de mot de passe (ancien + nouveau + confirmation)
  - Langue préférée (FR/EN) — sélecteur synchronisé avec `i18nSlice`
- [ ] **Mes données (droit d'accès — Art. 15 RGPD)** :
  - Bouton **"Télécharger mes données"** → `GET /auth/me/export` — retourne JSON avec toutes les données stockées (email, designs, commandes, factures). Format ZIP si plusieurs fichiers.
- [ ] **Suppression de compte (droit à l'effacement — Art. 17 RGPD)** :
  - Bouton **"Supprimer mon compte"** — **grisé + tooltip** si une commande est en cours (statut `pending`, `paid`, ou `submitted`)
  - Si actif : `AlertDialog` de confirmation avec saisie de l'email pour confirmer + case à cocher "Je comprends que cette action est irréversible"
  - Action : `DELETE /auth/me` → anonymise les données (email → `deleted_XXXX@overfitted.io`, hash des données personnelles) — les factures sont conservées pour obligations comptables (Art. 17 §3 RGPD)
  - Déconnexion + redirect `/` après suppression
- [ ] **Consentements** : affichage de la date d'acceptation des CGV + lien vers `/legal`
- [ ] **Prérequis backend** :
  - `GET /auth/me/export` — export JSON données utilisateur
  - `DELETE /auth/me` — anonymisation compte (pas suppression physique, conservation factures)
  - `PATCH /auth/me` — modification email/nom/mot de passe
  - Vérification commandes actives avant autorisation de suppression

### Page `/legal` — Mentions légales & Politique de confidentialité

> Obligatoire (Loi pour la Confiance dans l'Économie Numérique, RGPD Art. 13-14).

- [x] **Layout** — page statique avec sommaire ancré latéral (sticky sidebar sur desktop)
- [x] **Sections obligatoires** :
  - Éditeur du site (raison sociale, SIRET, adresse, email de contact)
  - Hébergeur
  - Politique de confidentialité : données collectées, durée de conservation, base légale du traitement, DPO contact
  - Droits des utilisateurs : accès, rectification, effacement, portabilité, opposition (avec liens directs vers `/account/profile`)
  - Cookies : liste des cookies utilisés (session, analytics), aucun cookie publicitaire tiers
  - CGV : conditions de vente, délai de rétractation 14 jours **sauf produits personnalisés (Art. L221-28 12° Code de la consommation)**
- [~] **Bilingue** — contenu traduit FR/EN via i18n *(différé — i18n non encore implémenté)*
- [x] **Lien dans le footer** de toutes les pages publiques

### Page `/500` — Erreur serveur
- [x] `error.tsx` Next.js : glitch "500" inline + `TerminalWindow` `ERROR: SERVER_MELTDOWN // THE_AI_IS_CRYING`
- [x] Bouton "RÉESSAYER" (`reset()` error boundary) + bouton "RETOUR À LA BASE" (`router.push("/")`)

### Bannière cookies (RGPD) ⚠️ manquant — obligatoire UE
> La CNIL exige un consentement explicite avant tout dépôt de cookie non essentiel.
- [x] **`CookieBanner`** — bandeau bas de page (au-dessus de `PageStatusBar`), affiché au premier chargement si pas de choix stocké
  - Texte court : "On utilise des cookies pour faire fonctionner le site. Pas pour vous espionner — on a des IA pour ça."
  - Boutons : **"Accepter"** (orange) | **"Refuser"** | **"Paramétrer"** (ouvre modal)
  - `CookieSettingsModal` : toggles par catégorie (Fonctionnels ON/grisé | Analytics ON/OFF)
- [x] **Stockage consentement** — cookie `ovf_consent` (valeur JSON) + pas de cookie analytics avant acceptation
- [x] **Lib** : implémentation custom légère (pas besoin de lib tierce)

### Page `/404` — Not Found
- [x] `GlitchText` "404" énorme orange, sous-titre monospace : `ERROR: PAGE_NOT_FOUND // HUMAN_ERROR_DETECTED`
- [x] `TerminalWindow` : `STATUS: 404 | REQUESTED_URL: [path] | SUGGESTION: GO_BACK_HUMAN`
- [x] Bouton "RETOUR À LA BASE" → `/`
- [x] Animation Framer Motion : glitch en boucle lente (toutes les 4s)

---
- [x] **Tableau** : Date | N° Commande | Produit(s) | Montant TTC | Statut | Facture
- [x] **Clic sur une commande** → ouvre `OrderTrackingPanel` (Shadcn Sheet ou page dédiée)
- [x] **`OrderTrackingPanel`** — suivi en temps réel :
  - Timeline verticale avec étapes : Paiement reçu → Préparation → Envoyé chez Printful → En production → Expédié → Livré
  - Étape active mise en évidence (icône colorée + label), étapes futures grisées
  - Statut Printful rafraîchi toutes les 60s via RTK Query polling `GET /commerce/order/{id}`
  - Numéro de tracking transporteur + lien externe quand disponible (`target="_blank"`)
  - Délai de livraison estimé affiché
- [x] **Bouton "Télécharger facture"** par ligne → `GET /commerce/invoice/{order_id}` (PDF)
- [x] **Accès protégé** — redirect `/login` si non connecté

### Page `/account/profile` — Mon compte (RGPD)

- [x] *(voir occurrence principale ci-dessus)*

### Page `/legal` — Mentions légales & Politique de confidentialité

- [x] *(voir occurrence principale ci-dessus)*

### Page `/404` — Not Found
- [x] `GlitchText` "404" énorme orange, sous-titre monospace : `ERROR: PAGE_NOT_FOUND // HUMAN_ERROR_DETECTED`
- [x] `TerminalWindow` : `STATUS: 404 | REQUESTED_URL: [path] | SUGGESTION: GO_BACK_HUMAN`
- [x] Bouton "RETOUR À LA BASE" → `/`
- [x] Animation Framer Motion : glitch en boucle lente (toutes les 4s)

---

## Phase 5 — Qualité & Production

- [ ] **Tests E2E Playwright** — parcours admin : login → voir designs → changer statut → créer code promo → voir facture
- [ ] **Tests E2E Playwright** — parcours user : inscription → upload → roast → ajouter au panier → appliquer code promo → checkout success → télécharger facture
- [ ] **Tests E2E Playwright** — RGPD : suppression compte (grisé si commande active, actif sinon)
- [ ] **Tests E2E Playwright** — i18n : changement de langue FR→EN dans le header
- [ ] **Tests E2E Playwright** — page 404 : URL inconnue → affichage correct glitch
- [ ] **`npm run build`** — zéro erreur TypeScript, zéro `any`
- [ ] **Optimisation images** — `next/image` partout, WebP
- [ ] **SEO** — `metadata` Next.js bilingue sur toutes les pages publiques
- [ ] **Variables d'env prod** — `NEXT_PUBLIC_API_URL` pointant vers le domaine prod
- [ ] **Dockerfile frontend** — `node:20-alpine` + `next build` + `next start`
- [ ] **`docker-compose.yml`** — ajouter service `frontend` + `nginx` reverse proxy

---

## 📌 Ordre d'attaque

```
Phase 0 (init)
  → Phase 1 (design system)
    → Phase 2 (backend admin API) ← en parallèle avec Phase 1
      → Phase 3 (admin panel complet)
        → Phase 4 (pages publiques)
          → Phase 5 (qualité + prod)
```

**Prochaine tâche immédiate :** `npx create-next-app@latest frontend --typescript --tailwind --app`

---

## 📦 Dépendances frontend récap

| Package | Rôle |
|---------|------|
| `next` 15 | Framework |
| `react` / `react-dom` | UI |
| `typescript` | Typage strict |
| `tailwindcss` | Styles |
| `@shadcn/ui` | Composants base |
| `@reduxjs/toolkit` + `react-redux` | State management |
| `framer-motion` | Animations glitch/scan |
| `next-intl` | i18n FR/EN |
| `recharts` | Graphes stats admin |
| `react-day-picker` | Date-range picker |
| `zod` | Validation formulaires |
| `next-sitemap` | sitemap.xml + robots.txt automatiques |
| `weasyprint` *(backend Python)* | Génération PDF factures |
| `fastapi-mail` *(backend Python)* | Emails transactionnels |
