---
applyTo: "backend/app/services/fixer/**"
---

# Fixer Service — Image Pipeline Rules

## Pattern PIL verify obligatoire
Toujours rouvrir l'image après `.verify()` — cette méthode ferme le stream et rend l'objet inutilisable :

```python
from PIL import Image
import io

def validate_and_open_image(file_bytes: bytes) -> Image.Image:
    img = Image.open(io.BytesIO(file_bytes))
    img.verify()  # ferme le stream ici
    img = Image.open(io.BytesIO(file_bytes))  # reouvrir obligatoire
    return img
```

## Validation DPI avant Printful
Toute image envoyée à Printful doit être ≥ 300 DPI ou au format SVG :

```python
def check_print_ready(img: Image.Image) -> bool:
    dpi = img.info.get("dpi", (0, 0))
    return dpi[0] >= 300 and dpi[1] >= 300
```

## Ordre des opérations pipeline
1. Valider format + DPI (`validate_and_open_image`)
2. Supprimer le fond si nécessaire (`rembg` — à ajouter aux requirements)
3. Upscaler si DPI insuffisant
4. Vectoriser vers SVG (`vtracer` — à ajouter aux requirements + Dockerfile C++ libs)
5. Retourner path du fichier généré (jamais les bytes bruts dans la réponse HTTP)

## Tâches lourdes → Celery
Ne jamais appeler rembg, vtracer ou upscaling directement dans un endpoint HTTP.
Dispatcher vers une tâche Celery et retourner un `task_id` :

```python
@router.post("/vectorize")
async def vectorize(file: UploadFile) -> dict:
    task = vectorize_task.delay(await file.read())
    return {"task_id": task.id, "status": "pending"}
```

## Signature des fonctions utilitaires
- Toujours accepter `bytes` en entrée, jamais `UploadFile` directement dans les utils
- Retourner `Image.Image` ou `str` (chemin SVG), jamais de types opaques
- Lever `ValueError` pour les formats invalides (pas `HTTPException` — ça appartient à la couche router)
