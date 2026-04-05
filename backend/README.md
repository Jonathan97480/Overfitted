# Backend Overfitted.io

Ce dossier contient l’API FastAPI, la logique métier, et les services asynchrones pour le Print-on-Demand satirique.

## Structure recommandée
- `app/` : Code source principal (FastAPI, services, modèles, routes)
- `tests/` : Tests unitaires et d’intégration
- `Dockerfile` & `docker-compose.yml` : Conteneurisation
- `requirements.txt` : Dépendances Python

## Initialisation rapide
1. `python -m venv .venv && source .venv/bin/activate`
2. `pip install -r requirements.txt`
3. `uvicorn app.main:app --reload`

---

> Pour conventions, voir .github/copilot-instructions.md et PROJECT_CONTEXT.md
