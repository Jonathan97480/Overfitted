# 🤖 Copilot Instructions for Overfitted.io

> Référence canonique : [PROJECT_CONTEXT.md](../PROJECT_CONTEXT.md) — lire avant toute tâche technique.

## État du projet (2026)
- **Backend :** ✅ FastAPI initialisé — endpoints `/` et `/fixer/upload`, SQLAdmin, modèle `User`
- **Frontend :** ⚠️ Pas encore créé — initialiser avec `npx create-next-app@latest frontend --typescript --tailwind`
- **Worker Celery :** ⚠️ Déclaré dans `docker-compose.yml` mais `app/worker.py` manquant

## Build & Test

| Tâche | Commande |
|-------|----------|
| Backend dev | `cd backend && uvicorn app.main:app --reload` |
| Backend Docker | `cd backend && docker compose build` |
| Backend test | `cd backend && pytest` |
| Frontend dev | `cd frontend && npm run dev` |
| Frontend build | `cd frontend && npm run build` |
| Frontend test | `cd frontend && npm run test` |

**Workflow CI/CD :** Installe → Teste → Commit. Ne jamais commiter sur des tests rouges.

## Architecture
- `/backend` — FastAPI + SQLAlchemy (aiosqlite) + Celery + Redis + SQLAdmin
- `/frontend` — Next.js 15 + Redux Toolkit + Tailwind + Shadcn/ui *(à créer)*
- **Pipeline services :** `fixer/` (image) | `roast_engine/` (LLM) | `soul_o_meter/` (scoring) | `commerce/` (Stripe/Printful)
- **Tâches longues** (vectorisation, upscaling, analyse IA) → Celery workers via Redis

→ Voir [PROJECT_CONTEXT.md](../PROJECT_CONTEXT.md) pour le stack complet, design guidelines et coding standards.

## Conventions clés
- **Tone :** Arrogant, expert, cynique, technique. Style glitch/cyberpunk dans tous les textes.
- **TypeScript :** Interdit `any`. Typage fort partout.
- **API-First :** Chaque endpoint doit être testable via Swagger (`/docs`) avant intégration frontend.
- **Async by default :** Ne jamais bloquer une requête sur du traitement image ou LLM.
- **Imprimabilité :** Valider ≥ 300 DPI ou SVG avant tout envoi à Printful.
- **Link, don't embed :** Si la règle existe dans PROJECT_CONTEXT.md, référence-la, ne la duplique pas.

## Variables d'environnement
Fichier `.env` requis (non tracké). Variables minimales :
```
DATABASE_URL=postgresql+asyncpg://user:pass@host/db
REDIS_URL=redis://localhost:6379/0
OPENAI_API_KEY=...
STRIPE_SECRET_KEY=...
PRINTFUL_API_KEY=...
```
Fallback SQLite si `DATABASE_URL` absent (dev local uniquement).

## Migrations Alembic
```bash
# Générer une migration après un changement de modèle
cd backend && alembic revision --autogenerate -m "description"
# Appliquer les migrations
cd backend && alembic upgrade head
```

## Gotchas critiques
- **CORS manquant** — Ajouter le middleware FastAPI CORS (`allow_origins=["http://localhost:3000"]`) avant toute intégration frontend.
- **PIL `.verify()` ferme le stream** — `validate_and_open_image()` rouvre l'image après verify. Toujours suivre ce pattern dans `services/fixer/image_utils.py`.
- **SQLAdmin dummy auth** — `SimpleAuth` retourne toujours `True`. NE PAS déployer en prod sans remplacer.
- **Worker sans worker.py** — Créer `backend/app/worker.py` (Celery app + tâches) avant de lancer la stack Docker complète.
- **vtracer / rembg absents des requirements** — Ajouter + mettre à jour le Dockerfile (C++ build tools, ONNX runtime) avant d'implémenter vectorisation ou background removal.
- **Sessions SQLAlchemy** — Utiliser `Depends(get_db)` + `async with` pour injecter la session dans les endpoints.

## Anti-patterns
- Ne jamais mélanger logique frontend/backend.
- Ne jamais exposer de clé API côté frontend.
- Ne jamais bloquer l'UI sur une tâche longue.
- Pas de `any` en TypeScript.

---

## Exemples de prompts
- "Crée un endpoint FastAPI pour vectoriser une image, asynchrone, avec retour de statut Celery."
- "Génère un composant React pour l'éditeur de blueprint avec grille CAO."
- "Ajoute une validation DPI côté backend avant envoi à Printful."
- "Implémente le CORS middleware pour permettre les requêtes depuis localhost:3000."
- "Crée `backend/app/worker.py` avec une tâche Celery pour la vectorisation d'image."
- "Propose une animation glitch pour le scan IA dans le frontend."

---

## Customisations agent suggérées
- **/create-instruction** : Règles spécifiques à un dossier (ex : `/backend/services/fixer`, `/frontend/components`).
- **/create-skill** : Documenter un pipeline technique (ex : vectorisation SVG, async Celery, DPI validation).
- **/create-prompt** : Enrichir la base de prompts adaptés au style Overfitted.io.
