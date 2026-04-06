from fastapi import FastAPI, UploadFile, File, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware
from sqladmin import Admin
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, declarative_base
from typing import AsyncGenerator
import os
import asyncio
from dotenv import load_dotenv
from app.services.fixer.image_utils import validate_and_open_image
from app.services.fixer.router import router as fixer_router
from app.services.roast_engine.router import router as roast_router
from app.services.soul_o_meter.router import router as soul_router
from app.services.commerce.router import router as commerce_router

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./db.sqlite3")

engine = create_async_engine(DATABASE_URL, echo=True)
SessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
Base = declarative_base()


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


# --- DB Dependency ---
async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with SessionLocal() as session:
        yield session


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
from app.admin import UserAdmin, DesignAdmin, OrderAdmin, ProductAdmin
from app.auth import AdminAuth
admin = Admin(app, engine, authentication_backend=AdminAuth(secret_key=os.getenv("SECRET_KEY", "overfitted-dev-secret")))
admin.add_view(UserAdmin)
admin.add_view(DesignAdmin)
admin.add_view(OrderAdmin)
admin.add_view(ProductAdmin)


app.include_router(fixer_router)
app.include_router(roast_router)
app.include_router(soul_router)
app.include_router(commerce_router)


@app.get("/")
def root():
    return {"message": "Bienvenue sur l'API Overfitted.io. Lis la doc, humain."}
