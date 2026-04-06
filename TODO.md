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

- [ ] **`app/services/soul_o_meter/`** — créer le dossier service
- [ ] **Algorithme d'entropie** — `scikit-image` ou `opencv-python` pour détecter le chaos organique
- [ ] **Score Human vs AI** — retourner `{ human: 0.0-1.0, ai: 0.0-1.0 }`
- [ ] **Endpoint `POST /soul/score`** — accepte image bytes, retourne le score
- [ ] **Tests** — images synthétiques (IA vs photo réelle)

---

## 🛒 Service : Commerce

- [ ] **`app/services/commerce/`** — créer le dossier service
- [ ] **Modèles SQLAlchemy** — `Design`, `Order`, `Product`
- [ ] **Intégration Stripe** — checkout session, webhook `payment_intent.succeeded`
- [ ] **Intégration Printful** — créer une commande POD après paiement confirmé
- [ ] **Endpoint `POST /commerce/checkout`** — crée une Stripe session
- [ ] **Endpoint `POST /commerce/webhook`** — reçoit les événements Stripe
- [ ] **Tests** — mock Stripe + Printful

---

## 🗄️ Modèles de données

- [x] `User`
- [ ] `Design` — `id`, `user_id`, `original_url`, `svg_url`, `dpi`, `status`, `created_at`
- [ ] `Order` — `id`, `user_id`, `design_id`, `stripe_session_id`, `printful_order_id`, `status`
- [ ] `Product` — `id`, `name`, `printful_variant_id`, `price`, `category`

---

## 📦 Dépendances à ajouter

- [x] `celery==5.6.3` + `redis==7.4.0` — async workers
- [x] `python-dotenv==1.2.2` — chargement du `.env`
- [ ] `rembg` — background removal (ONNX runtime requis)
- [ ] `vtracer` — vectorisation SVG (C++ build tools requis)
- [ ] `scikit-image` — Soul-O-Meter
- [ ] `opencv-python` — Soul-O-Meter
- [ ] `openai` — Roast Engine
- [ ] `stripe` — Commerce
