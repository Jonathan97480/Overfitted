
from fastapi import FastAPI, UploadFile, File, HTTPException
from sqladmin import Admin
from sqladmin.authentication import AuthenticationBackend
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, declarative_base
import os
import asyncio
from app.services.fixer.image_utils import validate_and_open_image


DATABASE_URL = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./db.sqlite3")

engine = create_async_engine(DATABASE_URL, echo=True)
SessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
Base = declarative_base()


app = FastAPI(title="Overfitted.io API", description="Backend satirique Print-on-Demand", version="0.1.0")

# --- ENDPOINT FIXER ---
@app.post("/fixer/upload")
async def upload_image(file: UploadFile = File(...)):
    try:
        file_bytes = await file.read()
        # Validation image (Pillow)
        img = await asyncio.to_thread(validate_and_open_image, file_bytes)
        return {"filename": file.filename, "format": img.format, "size": img.size}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# --- SQLAdmin Setup ---
class SimpleAuth(AuthenticationBackend):
    async def login(self, request):
        return True  # TODO: Replace with real auth
    async def logout(self, request):
        pass
    async def authenticate(self, request):
        return True


# Import et enregistrement des vues admin
from app.admin import UserAdmin
admin = Admin(app, engine, authentication_backend=SimpleAuth(secret_key="overfitted-secret"))
admin.add_view(UserAdmin)

@app.get("/")
def root():
    return {"message": "Bienvenue sur l’API Overfitted.io. Lis la doc, humain."}
