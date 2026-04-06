from fastapi import APIRouter, UploadFile, File, HTTPException
from celery.result import AsyncResult

from app.worker import soul_score_task

router = APIRouter(prefix="/soul", tags=["soul-o-meter"])


@router.post("/score")
async def score(file: UploadFile = File(...)) -> dict:
    """Dispatche le calcul Soul-O-Meter en tâche Celery.

    Retourne task_id + status 'pending'. Poller /soul/status/{task_id}.
    """
    content_type = file.content_type or ""
    if not content_type.startswith("image/"):
        raise HTTPException(status_code=422, detail="Fichier image requis")

    image_bytes = await file.read()
    task = soul_score_task.delay(image_bytes.hex())
    return {"task_id": task.id, "status": "pending"}


@router.get("/status/{task_id}")
async def status(task_id: str) -> dict:
    """Retourne le statut et le résultat d'une tâche Soul-O-Meter."""
    result = AsyncResult(task_id)
    payload: dict = {"task_id": task_id, "status": result.status}
    if result.ready():
        payload["result"] = result.result
    return payload
