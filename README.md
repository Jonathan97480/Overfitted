# Overfitted.io

> Print-on-Demand satirique. Style glitch/cyberpunk. Arrogant par design.

---

## Prérequis

- [Node.js](https://nodejs.org/) >= 20
- [Python](https://www.python.org/) >= 3.11
- Fichier `backend/.env` configuré (voir `backend/.env.example` ou `copilot-instructions.md`)

---

## Lancement du projet

### Option 1 — Script PowerShell (recommandé)

Ouvre une fenêtre PowerShell **en dehors de VS Code** (Windows Terminal, menu démarrer…) :

```powershell
cd e:\Overfitted
.\dev.ps1
```

Deux fenêtres PowerShell s'ouvrent automatiquement :
- **Backend** → `http://localhost:8000` (uvicorn + --reload)
- **Frontend** → `http://localhost:3000` (Next.js)

Les sessions déjà ouvertes sur les ports 3000 et 8000 sont tuées avant le démarrage.

> ⚠️ Ne pas utiliser le terminal intégré de VS Code pour cette commande — risque de crash OOM.

---

### Option 2 — npm (terminal externe uniquement)

```bash
cd e:\Overfitted
npm run dev
```

Même comportement que le script PS1, via `concurrently` + `kill-port`.

---

### Option 3 — Manuellement (deux terminaux séparés)

**Terminal 1 — Backend :**
```powershell
cd e:\Overfitted\backend
.\.venv\Scripts\Activate.ps1
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Terminal 2 — Frontend :**
```powershell
cd e:\Overfitted\frontend
npm run dev -- --hostname 0.0.0.0
```

---

## Première installation

```powershell
# Backend — créer le venv et installer les dépendances
cd e:\Overfitted\backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
alembic upgrade head

# Frontend — installer les dépendances
cd e:\Overfitted\frontend
npm install

# Racine — installer les outils de dev (concurrently, kill-port)
cd e:\Overfitted
npm install
```

---

## URLs utiles

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| API FastAPI | http://localhost:8000 |
| Swagger / Docs | http://localhost:8000/docs |
| Admin SQLAdmin | http://localhost:8000/admin |

---

## Tests

```bash
cd e:\Overfitted\backend
pytest
```

---

## Structure

```
Overfitted/
├── backend/          # FastAPI + SQLAlchemy + Celery
├── frontend/         # Next.js 15 + Redux + Tailwind + Shadcn
├── dev.ps1           # Script de lancement (ouvre 2 fenêtres PS)
├── package.json      # Scripts npm racine (concurrently)
└── PROJECT_CONTEXT.md
```

> Architecture complète, conventions et design guidelines → [PROJECT_CONTEXT.md](./PROJECT_CONTEXT.md)
