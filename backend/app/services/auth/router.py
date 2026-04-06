"""
Router auth utilisateurs publics — /auth/*
- POST /auth/register      → inscription (JWT HttpOnly cookie)
- POST /auth/login         → connexion (JWT HttpOnly cookie)
- POST /auth/logout        → supprime le cookie
- GET  /auth/me            → profil courant
- PATCH /auth/me           → modifier email / display_name / password
- GET  /auth/me/export     → export RGPD Art. 15 (JSON)
- DELETE /auth/me          → anonymisation RGPD Art. 17
"""
from __future__ import annotations

import json
from datetime import timezone
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException, Response, status
from pydantic import BaseModel, EmailStr
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import Design, Invoice, Order, OrderStatus, User
from app.services.auth.security import (
    create_user_token,
    get_current_user_id,
    hash_password,
    verify_password,
)

router = APIRouter(prefix="/auth", tags=["auth"])

DBDep = Annotated[AsyncSession, Depends(get_db)]
UserIdDep = Annotated[int, Depends(get_current_user_id)]

_COOKIE_NAME = "user_token"
_COOKIE_MAX_AGE = 60 * 60 * 24 * 7  # 7 jours


def _set_auth_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key=_COOKIE_NAME,
        value=token,
        httponly=True,
        samesite="lax",
        secure=False,   # True en prod (HTTPS)
        max_age=_COOKIE_MAX_AGE,
        path="/",
    )


# ─── Schémas ───────────────────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    display_name: Optional[str] = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: int
    email: str
    display_name: Optional[str]
    created_at: str
    model_config = {"from_attributes": True}


class PatchMeRequest(BaseModel):
    display_name: Optional[str] = None
    email: Optional[EmailStr] = None
    current_password: Optional[str] = None
    new_password: Optional[str] = None


# ─── Endpoints ─────────────────────────────────────────────────────────────

@router.post("/register", status_code=201)
async def register(body: RegisterRequest, response: Response, db: DBDep):
    """Inscription — crée un compte et pose le cookie JWT."""
    if len(body.password) < 8:
        raise HTTPException(status_code=422, detail="Le mot de passe doit contenir au moins 8 caractères.")

    # Email déjà utilisé ?
    existing = (await db.execute(select(User).where(User.email == body.email))).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=409, detail="Cet email est déjà utilisé.")

    # username = partie locale de l'email (unique)
    base_username = body.email.split("@")[0]
    username = base_username
    counter = 1
    while (await db.execute(select(User).where(User.username == username))).scalar_one_or_none():
        username = f"{base_username}{counter}"
        counter += 1

    user = User(
        email=body.email,
        username=username,
        hashed_password=hash_password(body.password),
        display_name=body.display_name,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    token = create_user_token(user.id, user.email)
    _set_auth_cookie(response, token)
    return {"message": "Compte créé.", "user_id": user.id}


@router.post("/login")
async def login(body: LoginRequest, response: Response, db: DBDep):
    """Connexion — vérifie les credentials et pose le cookie JWT."""
    user = (await db.execute(select(User).where(User.email == body.email))).scalar_one_or_none()

    # Message générique pour éviter l'énumération d'emails (OWASP)
    _auth_error = HTTPException(status_code=401, detail="Email ou mot de passe incorrect.")

    if not user:
        raise _auth_error

    if not user.hashed_password:
        raise _auth_error

    if not user.is_active:
        raise HTTPException(status_code=403, detail="Compte désactivé.")

    if not verify_password(body.password, user.hashed_password):
        raise _auth_error

    token = create_user_token(user.id, user.email)
    _set_auth_cookie(response, token)
    return {"message": "Connecté.", "user_id": user.id}


@router.post("/logout")
async def logout(response: Response):
    """Supprime le cookie JWT."""
    response.delete_cookie(key=_COOKIE_NAME, path="/")
    return {"message": "Déconnecté."}


@router.get("/me", response_model=UserOut)
async def get_me(user_id: UserIdDep, db: DBDep):
    """Retourne le profil de l'utilisateur connecté."""
    user = await db.get(User, user_id)
    if not user or not user.is_active:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable.")
    return UserOut(
        id=user.id,
        email=user.email,
        display_name=user.display_name,
        created_at=user.created_at.isoformat(),
    )


@router.patch("/me", response_model=UserOut)
async def patch_me(body: PatchMeRequest, user_id: UserIdDep, db: DBDep):
    """Modifier email, display_name ou mot de passe."""
    user = await db.get(User, user_id)
    if not user or not user.is_active:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable.")

    if body.display_name is not None:
        user.display_name = body.display_name

    if body.email is not None and body.email != user.email:
        conflict = (await db.execute(select(User).where(User.email == body.email))).scalar_one_or_none()
        if conflict:
            raise HTTPException(status_code=409, detail="Cet email est déjà utilisé.")
        user.email = body.email

    if body.new_password is not None:
        if len(body.new_password) < 8:
            raise HTTPException(status_code=422, detail="Le mot de passe doit contenir au moins 8 caractères.")
        if not body.current_password:
            raise HTTPException(status_code=422, detail="Le mot de passe actuel est requis.")
        if not user.hashed_password or not verify_password(body.current_password, user.hashed_password):
            raise HTTPException(status_code=401, detail="Mot de passe actuel incorrect.")
        user.hashed_password = hash_password(body.new_password)

    await db.commit()
    await db.refresh(user)
    return UserOut(
        id=user.id,
        email=user.email,
        display_name=user.display_name,
        created_at=user.created_at.isoformat(),
    )


@router.get("/me/export")
async def export_me(user_id: UserIdDep, db: DBDep):
    """RGPD Art. 15 — export JSON de toutes les données de l'utilisateur."""
    user = await db.get(User, user_id)
    if not user or not user.is_active:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable.")

    designs = (await db.execute(
        select(Design).where(Design.user_id == user_id).order_by(Design.created_at)
    )).scalars().all()

    orders = (await db.execute(
        select(Order).where(Order.user_id == user_id).order_by(Order.created_at)
    )).scalars().all()

    invoices = (await db.execute(
        select(Invoice).where(Invoice.user_email == user.email)
    )).scalars().all()

    return {
        "user": {
            "id": user.id,
            "email": user.email,
            "display_name": user.display_name,
            "created_at": user.created_at.isoformat(),
        },
        "designs": [
            {
                "id": d.id,
                "original_url": d.original_url,
                "svg_url": d.svg_url,
                "dpi": d.dpi,
                "status": d.status.value,
                "created_at": d.created_at.isoformat(),
            }
            for d in designs
        ],
        "orders": [
            {
                "id": o.id,
                "design_id": o.design_id,
                "stripe_session_id": o.stripe_session_id,
                "printful_order_id": o.printful_order_id,
                "status": o.status.value,
                "created_at": o.created_at.isoformat(),
            }
            for o in orders
        ],
        "invoices": [
            {
                "invoice_number": inv.invoice_number,
                "issued_at": inv.issued_at.isoformat(),
                "amount_ttc": inv.amount_ttc,
                "promo_code": inv.promo_code,
            }
            for inv in invoices
        ],
    }


@router.delete("/me", status_code=200)
async def delete_me(user_id: UserIdDep, response: Response, db: DBDep):
    """RGPD Art. 17 — anonymise le compte.

    Bloqué si une commande est en cours (pending / paid / submitted).
    Les factures sont conservées pour obligations comptables (Art. 17 §3).
    """
    user = await db.get(User, user_id)
    if not user or not user.is_active:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable.")

    # Vérifier commandes actives
    active_orders = (await db.execute(
        select(func.count(Order.id)).where(
            Order.user_id == user_id,
            Order.status.in_([OrderStatus.pending, OrderStatus.paid, OrderStatus.submitted]),
        )
    )).scalar_one()
    if active_orders > 0:
        raise HTTPException(
            status_code=409,
            detail="Impossible de supprimer le compte : une commande est en cours.",
        )

    # Anonymisation — pas de suppression physique
    user.email = f"deleted_{user.id}@overfitted.io"
    user.username = f"deleted_{user.id}"
    user.display_name = None
    user.hashed_password = None
    user.is_active = 0

    await db.commit()
    response.delete_cookie(key=_COOKIE_NAME, path="/")
    return {"message": "Compte anonymisé."}
