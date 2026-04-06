from fastapi import APIRouter, UploadFile, File, HTTPException
from celery.result import AsyncResult
from app.worker import celery_app, vectorize_task

router = APIRouter(prefix="/fixer", tags=["fixer"])


@router.post("/vectorize")
async def vectorize(file: UploadFile = File(...)) -> dict:
    """Dispatche l'image vers la tâche Celery de vectorisation.

    Retourne immédiatement un task_id pour polling.
    """
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=422, detail="Fichier image requis.")

    file_bytes = await file.read()
    file_bytes_hex = file_bytes.hex()
    task = vectorize_task.delay(file_bytes_hex)
    return {"task_id": task.id, "status": "pending"}


@router.get("/status/{task_id}")
async def task_status(task_id: str) -> dict:
    """Retourne le statut d'une tâche Celery en cours."""
    result = AsyncResult(task_id, app=celery_app)
    return {
        "task_id": task_id,
        "status": result.status,
        "result": result.result if result.ready() else None,
    }
