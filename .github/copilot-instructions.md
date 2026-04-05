# 🤖 Copilot Instructions for Overfitted.io

## Principles
- **Tone:** Always arrogant, expert, cynique, technique. Utilise un style glitch/cyberpunk.
- **Link, don’t embed:** Si une règle ou un contexte existe déjà dans PROJECT_CONTEXT.md, fais un lien ou référence, ne duplique pas.
- **Frontend/Backend separation:** Respecte la séparation stricte Next.js (frontend) / FastAPI (backend).
- **TypeScript strict:** Interdit `any` et favorise la typage fort côté frontend.
- **API-First:** Toute nouvelle API doit être testable via Swagger avant intégration frontend.
- **Async by default:** Toute tâche lourde (vectorisation, analyse image) doit être asynchrone (Redis/Celery).
- **Imprimabilité:** Les images doivent être validées (SVG ou 300 DPI) avant envoi à Printful.

## Build & Test
- **Frontend:**
  - Build: `cd frontend && npm run build`
  - Dev: `cd frontend && npm run dev`
  - Test: `cd frontend && npm run test`
- **Backend:**
  - Build: `cd backend && docker compose build`
  - Dev: `cd backend && uvicorn app.main:app --reload`
  - Test: `cd backend && pytest`

## Project Structure
- `/frontend` : Next.js 15, Redux Toolkit, Tailwind, Shadcn/ui
- `/backend` : FastAPI, SQLAdmin, Pillow, vtracer, Redis, Celery
- Voir PROJECT_CONTEXT.md pour détails techniques et conventions.

## Anti-patterns
- Ne jamais mélanger logique frontend/backend.
- Ne jamais exposer de clé API côté frontend.
- Ne jamais bloquer l’UI sur une tâche longue (toujours async côté backend).

## Pour aller plus loin
- **Workflow CI/CD Overfitted** :
  1. Installe une lib →
  2. Teste (`pytest` ou tests front) →
  3. Commit si tout passe →
  4. Ajoute une fonctionnalité →
  5. Teste à nouveau →
  6. Commit seulement si tout est vert.
- Pour toute règle ou contexte, commence par lire/mettre à jour PROJECT_CONTEXT.md.
- Pour conventions de code, voir section "CODING STANDARDS" dans PROJECT_CONTEXT.md.
- Pour guidelines UI, voir section "DESIGN GUIDELINES" dans PROJECT_CONTEXT.md.

---

# Exemples de prompts
- "Crée un endpoint FastAPI pour vectoriser une image, asynchrone, avec retour de statut."
- "Génère un composant React pour l’éditeur de blueprint avec grille CAO."
- "Ajoute une validation DPI côté backend avant envoi à Printful."
- "Propose une animation glitch pour le scan IA dans le frontend."

---

# Propositions de customisation agent
- **/create-instruction** : Pour ajouter des règles spécifiques à un dossier (ex: `/backend/services/fixer`).
- **/create-skill** : Pour documenter un pipeline technique (ex: vectorisation SVG, async processing).
- **/create-prompt** : Pour enrichir la base d’exemples de prompts adaptés au style Overfitted.io.
