---
mode: agent
description: "Add a FastAPI async endpoint with pytest test. Use when adding a new route to the Overfitted.io backend."
---

Crée un endpoint FastAPI async pour le service `${input:service:fixer|roast_engine|soul_o_meter|commerce}`.

**Route :** `${input:method:GET|POST|DELETE} ${input:route}`  
**Description fonctionnelle :** `${input:description}`

## Contraintes obligatoires

1. **Router** — ajouter dans `backend/app/services/${input:service}/router.py` (créer si absent), puis inclure dans `backend/app/main.py` avec `app.include_router(...)`
2. **Async** — la fonction doit être `async def`. Si elle appelle du traitement lourd (image, LLM), dispatcher vers Celery et retourner `{"task_id": ..., "status": "pending"}`
3. **Typage Pydantic** — définir un schéma `Response` dans `backend/app/services/${input:service}/schemas.py` pour le type de retour. Pas de `dict` nu.
4. **Pas de logique métier dans le router** — déléguer à une fonction dans `backend/app/services/${input:service}/` 
5. **Test pytest** — créer ou compléter `backend/tests/test_${input:service}.py` avec un test happy-path + au moins un test erreur (400 ou 422)
6. **Swagger** — vérifier que l'endpoint apparaît dans `/docs` avant d'intégrer côté frontend

## Format de réponse attendu

Génère dans cet ordre :
1. Le schéma Pydantic (`schemas.py`)
2. La logique métier (fichier service)
3. Le router (`router.py`)
4. La modification de `main.py` pour inclure le router
5. Les tests (`test_${input:service}.py`)
