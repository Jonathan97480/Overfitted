# 📂 PROJECT CONTEXT: OVERFITTED.IO (v2.0)
**Identité :** E-commerce de Print-on-Demand (POD) avec Assistant IA Satirique.
**Slogan :** "Critiqué par l'IA, réparé pour les Humains."
**Tone :** Arrogant, expert, cynique, technique (Esthétique Glitch/Cyberpunk).

---

## 🎯 VISION & CORE FEATURES
1. **AI Diagnostic & Roast :** Analyse technique (DPI, qualité) avec commentaire acide généré par LLM.
2. **Soul-O-Meter :** Score d'humanité (Human Chaos vs AI Hallucination).
3. **The Fixer :** Pipeline automatisé : Upscaling, Nettoyage, et Vectorisation SVG.
4. **Placement Libre :** Éditeur de blueprint (X, Y, Rotation) avec grille de ciblage CAO.
5. **Collections :** - *Syntax* (Code & Minimalisme)
   - *Hallucination* (Art généré par IA volontairement instable)
   - *Pulse* (Designs procéduraux en temps réel).

---

## 🛠️ TECH STACK GLOBALE

### 🔵 FRONTEND (Next.js 15 + React + TypeScript)
- **State Management :** Redux Toolkit (RTK) - Single Source of Truth pour le tunnel de design.
- **Data Fetching :** RTK Query (Synchronisation auto avec FastAPI).
- **UI & Styling :** Tailwind CSS + Shadcn/ui (Base technique).
- **Animations :** Framer Motion (Glitch, lignes de scan, apparition de texte terminal).
- **Identité Visuelle :** Dark Mode, Neon Orange (#FF6B00), Cyber Cyan (#00F0FF).

### 🐍 BACKEND : ARCHITECTURE & SERVICES (FastAPI)
Le backend est structuré en services modulaires (Clean Architecture) :

#### 1. Roast Engine (IA & LLM)
- **Libs :** `openai`, `langchain`, `pydantic`.
- **Rôle :** Génération de verdicts satiriques en JSON strict (message, score, métadonnées).

#### 2. The Fixer (Pipeline Vision)
- **Libs :** `Pillow (PIL)`, `rembg` (Background removal), `vtracer/pyvtracer` (Vectorisation SVG).
- **Rôle :** Nettoyage des images et conversion bitmap -> vectoriel pour impression 300 DPI.

#### 3. Soul-O-Meter (Analyse de Chaos)
- **Libs :** `scikit-image`, `opencv-python (cv2)`.
- **Rôle :** Algorithmes de détection d'entropie et d'imperfections organiques (authenticité humaine).

#### 4. Commerce & Logistique
- **Libs :** `stripe`, `printful-python`, `httpx`.
- **Rôle :** Gestion des paiements, webhooks de livraison et automatisation des commandes POD.

#### 5. Infrastructure & Performance
- **Queue :** `Redis` + `RQ` (Redis Queue) ou `Celery` pour le traitement d'image asynchrone.
- **Admin :** `sqladmin` pour le dashboard de gestion des designs et des ventes.
- **Conteneurisation :** `Docker` (indispensable pour les dépendances C++ de rembg/vtracer).

---

## 🎨 DESIGN GUIDELINES (UI/UX)
- **Header :** Logo "Overfitted" (Style Bubble Néon Orange).
- **Favicon :** Silhouette humaine minimale (Option 1).
- **Terminal UI :** Utiliser des polices Monospace pour tous les retours de l'IA.
- **Interaction :** Chaque action "Fixer" doit déclencher une animation de "Scan" visuelle.

---

## 📜 CODING STANDARDS (RÈGLES D'OR)
1. **No Any :** TypeScript strict partout.
2. **API-First :** Le backend doit être testable via Swagger (`/docs`) avant l'intégration front.
3. **Async Processing :** Ne jamais faire attendre le client pendant une vectorisation (utiliser les Workers Redis).
4. **Imprimabilité :** Toute image envoyée à Printful doit être validée en SVG ou 300 DPI minimum.

---

## 🚀 ROADMAP ACTUELLE
- [x] DNA de marque & Vision Stratégique.
- [x] Identité Visuelle & Maquettes (Home, Shop, Upload, Design).
- [ ] **NEXT STEP :** Initialisation du Backend (`/backend`) avec FastAPI et SQLAdmin.
- [ ] **NEXT STEP :** Création du service "The Fixer" (Pillow + vtracer).
- [ ] **NEXT STEP :** Setup Frontend (`/frontend`) avec Redux Toolkit & RTK Query.