from fastapi import FastAPI, UploadFile, File, HTTPException, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from starlette.middleware.sessions import SessionMiddleware
from sqladmin import Admin
from sqlalchemy.ext.asyncio import AsyncSession
import os
import asyncio
from dotenv import load_dotenv
from app.database import engine, Base, get_db
from app.services.fixer.image_utils import validate_and_open_image
from app.services.fixer.router import router as fixer_router
from app.services.roast_engine.router import router as roast_router
from app.services.soul_o_meter.router import router as soul_router
from app.services.commerce.router import router as commerce_router
from app.services.admin_api.router import router as admin_router
from app.services.auth.router import router as auth_router
from app.middleware.analytics import AnalyticsMiddleware

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./db.sqlite3")


app = FastAPI(title="Overfitted.io API", description="Backend satirique Print-on-Demand", version="0.1.0")

# --- CORS ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv("FRONTEND_URL", "http://localhost:3000")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Session (requis pour SQLAdmin auth) ---
app.add_middleware(
    SessionMiddleware,
    secret_key=os.getenv("SECRET_KEY", "overfitted-dev-secret"),
    max_age=8 * 3600,
    https_only=False,  # passer à True en prod derrière HTTPS
    same_site="lax",
)

# --- Analytics (Redis, transparent si absent) ---
app.add_middleware(AnalyticsMiddleware)


# --- DB Dependency ---
# get_db est défini dans app.database — importé ci-dessus


# --- ENDPOINT FIXER ---
@app.post("/fixer/upload")
async def upload_image(file: UploadFile = File(...), db: AsyncSession = Depends(get_db)):
    try:
        file_bytes = await file.read()
        img = await asyncio.to_thread(validate_and_open_image, file_bytes)
        return {"filename": file.filename, "format": img.format, "size": img.size}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# Import et enregistrement des vues admin
from app.admin import UserAdmin, DesignAdmin, OrderAdmin, ProductAdmin, CatalogueItemAdmin
from app.auth import AdminAuth
admin = Admin(app, engine, authentication_backend=AdminAuth(secret_key=os.getenv("SECRET_KEY", "overfitted-dev-secret")))
admin.add_view(UserAdmin)
admin.add_view(DesignAdmin)
admin.add_view(OrderAdmin)
admin.add_view(ProductAdmin)
admin.add_view(CatalogueItemAdmin)


app.include_router(fixer_router)
app.include_router(roast_router)
app.include_router(soul_router)
app.include_router(commerce_router)
app.include_router(admin_router)
app.include_router(auth_router)

# --- Fichiers statiques (images catalogue, etc.) ---
_static_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "static")
os.makedirs(_static_dir, exist_ok=True)
app.mount("/static", StaticFiles(directory=_static_dir), name="static")


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    """Garantit que les 500 non gérés renvoient bien une JSON response
    (le CORSMiddleware de Starlette ne couvre pas les exceptions qui ne
    produisent pas de réponse ASGI, ce qui bloque les headers CORS)."""
    return JSONResponse(
        status_code=500,
        content={"detail": "Erreur interne du serveur."},
    )


@app.get("/")
def root():
    return {"message": "Bienvenue sur l'API Overfitted.io. Lis la doc, humain."}
