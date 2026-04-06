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
3. `uvicorn app.main:app --reload --host 0.0.0.0 --port 8000`

---

## Catalogue Printful

| Endpoint | API utilisée | Produits |
|----------|-------------|----------|
| Listing catalogue (`GET /api/admin/catalog`) | **v2** `/v2/catalog-products` | 469+ (EU + US) |
| Détail produit + variants + prix (`GET /api/admin/catalog/{id}`) | **v1** `/products/{id}` | idem |

La recherche catalogue (ex: Stanley/Stella STSU178) utilise l'API **v2** qui couvre l'ensemble du catalogue global (vs 98 produits US-only en v1). La pagination s'appuie sur `paging.total` retourné par v2. La recherche est effectuée côté serveur après fetch complet des pages.

---

> Pour conventions, voir .github/copilot-instructions.md et PROJECT_CONTEXT.md
