# 📋 TODO — Overfitted.io Backend

> Mise à jour manuelle au fil du développement. État au 06/04/2026.
> Convention : `- [x]` fait · `- [ ]` à faire · `- [~]` en cours

---

## ✅ Fait

- [x] FastAPI initialisé (`app/main.py`)
- [x] Modèle `User` SQLAlchemy + SQLAdmin
- [x] Endpoint `GET /` — message de bienvenue
- [x] Endpoint `POST /fixer/upload` — validation image Pillow
- [x] `validate_and_open_image()` avec pattern PIL verify correct
- [x] Suite de tests pytest (`test_main.py`, `test_fixer.py`) — 2/2 passent
- [x] Environnement Python installé (`backend/.venv`)
- [x] `Pillow` ajouté aux `requirements.txt`

---

## 🏗️ Infrastructure

- [x] **CORS middleware** — `allow_origins` depuis `FRONTEND_URL` env var
- [x] **`app/worker.py`** — Celery app init + Redis broker
- [x] **`.env.example`** — toutes les variables documentées
- [x] **Première migration Alembic** — table `users` créée (`alembic/versions/`)
- [x] **`get_db()` dependency** — injecté via `Depends(get_db)` dans les endpoints
- [x] **GitHub Actions CI** — `.github/workflows/ci.yml` : pytest sur push `main`
- [ ] **Remplacer `SimpleAuth`** — implémenter une vraie auth admin (JWT ou session)

---

## 🔧 Service : The Fixer (Pipeline Image)

- [x] **Validation DPI** — `check_print_ready()` dans `image_utils.py` (arrondi DPI PNG intégré)
- [x] **Upscaling** — `upscale_to_print()` avec PIL LANCZOS
- [x] **Endpoint `POST /fixer/vectorize`** — dispatch Celery, retourne `task_id`
- [x] **Endpoint `GET /fixer/status/{task_id}`** — polling statut Celery
- [x] **Tests** `test_fixer.py` — 17 tests (unit + endpoints + mocks Celery)

---

## 🤖 Service : Roast Engine (LLM)

- [x] **`app/services/roast_engine/`** — dossier créé
- [x] **Schéma Pydantic `RoastResponse`** — `verdict`, `score`, `issues`, `roast`
- [x] **Client Ollama** — `llm.py` via `httpx`, modèle configurable (`OLLAMA_MODEL`, défaut `phi3.5:mini`)
- [x] **Endpoint `POST /roast/analyze`** — dispatch Celery, retourne `task_id`
- [x] **Endpoint `GET /roast/status/{task_id}`** — polling statut
- [x] **Tâche Celery `roast_task`** — appel Ollama asynchrone
- [x] **Tests** — 14 tests (schemas, prompt, mock httpx, endpoints, mocks Celery)

---

## 📊 Service : Soul-O-Meter

- [x] **`app/services/soul_o_meter/`** — dossier créé
- [x] **Algorithme d'entropie** — `scikit-image` : entropie Shannon, FFT, contours Sobel, variance RGB
- [x] **Score Human vs AI** — retourne `{ human: 0.0-1.0, ai: 0.0-1.0, score, signals }`
- [x] **Endpoint `POST /soul/score`** — accepte image, dispatche Celery, retourne `task_id`
- [x] **Endpoint `GET /soul/status/{task_id}`** — polling statut Celery
- [x] **Tâche Celery `soul_score_task`** — scoring asynchrone
- [x] **Tests** — 23 tests (métriques unit, score global, endpoints, mocks Celery)

---

## 🛒 Service : Commerce

- [x] **`app/services/commerce/`** — dossier créé
- [x] **Modèles SQLAlchemy** — `Design`, `Order`, `Product`
- [x] **Intégration Stripe** — checkout session + webhook `checkout.session.completed`
- [x] **Intégration Printful** — `create_printful_order()` + `get_printful_order()`
- [x] **Endpoint `POST /commerce/checkout`** — crée une Stripe session
- [x] **Endpoint `POST /commerce/webhook`** — reçoit les événements Stripe (signature vérifiée)
- [x] **Endpoint `POST /commerce/printful/order`** — soumet une commande POD
- [x] **Tests** — 19 tests (Stripe mock, Printful mock, endpoints)

---

## 🗄️ Modèles de données

- [x] `User`
- [x] `Design` — `id`, `user_id`, `original_url`, `svg_url`, `dpi`, `status`, `created_at`
- [x] `Order` — `id`, `user_id`, `design_id`, `stripe_session_id`, `printful_order_id`, `status`
- [x] `Product` — `id`, `name`, `printful_variant_id`, `price`, `category`
- [x] **Migration Alembic** `add_design_order_product`

---

## 📦 Dépendances à ajouter

- [x] `celery==5.6.3` + `redis==7.4.0` — async workers
- [x] `python-dotenv==1.2.2` — chargement du `.env`
- [ ] `rembg` — background removal (ONNX runtime requis)
- [ ] `vtracer` — vectorisation SVG (C++ build tools requis)
- [x] `scikit-image==0.25.2` + `numpy==2.2.6` + `scipy==1.15.3` — Soul-O-Meter
- [x] `stripe==15.0.1` + `requests==2.33.1` — Commerce
- [ ] `openai` — optionnel (Roast Engine cloud)
