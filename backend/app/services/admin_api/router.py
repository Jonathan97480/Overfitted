"""
Router admin API — endpoints JSON pour le panneau Next.js.
Tous les endpoints (sauf /login) requièrent un Bearer JWT admin valide.
"""
from __future__ import annotations

from typing import Annotated, Optional, List
from datetime import datetime
import os
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import CatalogueItem, CatalogueStatus, Design, DesignStatus, Order, OrderStatus, Product, User
from app.services.admin_api.auth import create_admin_token, verify_admin_token, verify_password

_UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))), "static", "catalogue")
os.makedirs(_UPLOAD_DIR, exist_ok=True)

router = APIRouter(prefix="/api/admin", tags=["admin"])

AdminDep = Annotated[str, Depends(verify_admin_token)]
DBDep = Annotated[AsyncSession, Depends(get_db)]

# ─── Auth ──────────────────────────────────────────────────────────────────

class LoginRequest(BaseModel):
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


@router.post("/login", response_model=LoginResponse)
async def admin_login(body: LoginRequest):
    if not verify_password(body.password):
        raise HTTPException(status_code=401, detail="Mot de passe incorrect.")
    return LoginResponse(access_token=create_admin_token())


# ─── Stats ─────────────────────────────────────────────────────────────────

class StatsResponse(BaseModel):
    total_users: int
    total_designs: int
    total_orders: int
    total_revenue: float
    orders_by_status: dict[str, int]
    designs_by_status: dict[str, int]


@router.get("/stats", response_model=StatsResponse, dependencies=[Depends(verify_admin_token)])
async def get_stats(db: DBDep):
    total_users = (await db.execute(select(func.count(User.id)))).scalar_one()
    total_designs = (await db.execute(select(func.count(Design.id)))).scalar_one()
    total_orders = (await db.execute(select(func.count(Order.id)))).scalar_one()

    # Revenus : nombre de commandes payées × prix moyen des produits
    # Order n'a pas de champ amount — on somme les prix des produits référencés
    total_revenue = 0.0
    paid_count = (
        await db.execute(select(func.count(Order.id)).where(Order.status == OrderStatus.paid))
    ).scalar_one()
    if paid_count > 0:
        avg_price_row = await db.execute(select(func.avg(Product.price)))
        avg_price = avg_price_row.scalar_one_or_none() or 0.0
        total_revenue = round(paid_count * avg_price, 2)

    orders_by_status: dict[str, int] = {}
    for status in OrderStatus:
        count = (
            await db.execute(select(func.count(Order.id)).where(Order.status == status))
        ).scalar_one()
        orders_by_status[status.value] = count

    designs_by_status: dict[str, int] = {}
    for status in DesignStatus:
        count = (
            await db.execute(select(func.count(Design.id)).where(Design.status == status))
        ).scalar_one()
        designs_by_status[status.value] = count

    return StatsResponse(
        total_users=total_users,
        total_designs=total_designs,
        total_orders=total_orders,
        total_revenue=total_revenue,
        orders_by_status=orders_by_status,
        designs_by_status=designs_by_status,
    )


# ─── Users ─────────────────────────────────────────────────────────────────

class UserOut(BaseModel):
    id: int
    username: str
    email: str
    model_config = {"from_attributes": True}


@router.get("/users", response_model=list[UserOut], dependencies=[Depends(verify_admin_token)])
async def list_users(db: DBDep, skip: int = 0, limit: int = Query(50, le=200)):
    result = await db.execute(select(User).offset(skip).limit(limit))
    return result.scalars().all()


@router.delete("/users/{user_id}", dependencies=[Depends(verify_admin_token)])
async def delete_user(user_id: int, db: DBDep):
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable.")
    await db.delete(user)
    await db.commit()
    return {"deleted": user_id}


# ─── Designs ───────────────────────────────────────────────────────────────

class DesignOut(BaseModel):
    id: int
    user_id: Optional[int]
    original_url: str
    svg_url: Optional[str]
    dpi: Optional[float]
    status: DesignStatus
    created_at: datetime
    model_config = {"from_attributes": True}


class DesignStatusUpdate(BaseModel):
    status: DesignStatus


@router.get("/designs", response_model=list[DesignOut], dependencies=[Depends(verify_admin_token)])
async def list_designs(db: DBDep, skip: int = 0, limit: int = Query(50, le=200)):
    result = await db.execute(select(Design).order_by(Design.created_at.desc()).offset(skip).limit(limit))
    return result.scalars().all()


@router.patch("/designs/{design_id}", response_model=DesignOut, dependencies=[Depends(verify_admin_token)])
async def update_design_status(design_id: int, body: DesignStatusUpdate, db: DBDep):
    design = await db.get(Design, design_id)
    if not design:
        raise HTTPException(status_code=404, detail="Design introuvable.")
    design.status = body.status
    await db.commit()
    await db.refresh(design)
    return design


@router.delete("/designs/{design_id}", dependencies=[Depends(verify_admin_token)])
async def delete_design(design_id: int, db: DBDep):
    design = await db.get(Design, design_id)
    if not design:
        raise HTTPException(status_code=404, detail="Design introuvable.")
    await db.delete(design)
    await db.commit()
    return {"deleted": design_id}


# ─── Orders ────────────────────────────────────────────────────────────────

class OrderOut(BaseModel):
    id: int
    user_id: Optional[int]
    design_id: int
    stripe_session_id: Optional[str]
    printful_order_id: Optional[str]
    status: OrderStatus
    created_at: datetime
    model_config = {"from_attributes": True}


class OrderStatusUpdate(BaseModel):
    status: OrderStatus


@router.get("/orders", response_model=list[OrderOut], dependencies=[Depends(verify_admin_token)])
async def list_orders(db: DBDep, skip: int = 0, limit: int = Query(50, le=200)):
    result = await db.execute(select(Order).order_by(Order.created_at.desc()).offset(skip).limit(limit))
    return result.scalars().all()


@router.patch("/orders/{order_id}", response_model=OrderOut, dependencies=[Depends(verify_admin_token)])
async def update_order_status(order_id: int, body: OrderStatusUpdate, db: DBDep):
    order = await db.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Commande introuvable.")
    order.status = body.status
    await db.commit()
    await db.refresh(order)
    return order


# ─── Products ──────────────────────────────────────────────────────────────

class ProductOut(BaseModel):
    id: int
    name: str
    printful_variant_id: str
    price: float
    category: Optional[str]
    model_config = {"from_attributes": True}


class ProductCreate(BaseModel):
    name: str
    printful_variant_id: str
    price: float
    category: Optional[str] = None


class ProductUpdate(BaseModel):
    name: Optional[str] = None
    price: Optional[float] = None
    category: Optional[str] = None


@router.get("/products", response_model=list[ProductOut], dependencies=[Depends(verify_admin_token)])
async def list_products(db: DBDep):
    result = await db.execute(select(Product))
    return result.scalars().all()


@router.post("/products", response_model=ProductOut, status_code=201, dependencies=[Depends(verify_admin_token)])
async def create_product(body: ProductCreate, db: DBDep):
    product = Product(**body.model_dump())
    db.add(product)
    await db.commit()
    await db.refresh(product)
    return product


@router.patch("/products/{product_id}", response_model=ProductOut, dependencies=[Depends(verify_admin_token)])
async def update_product(product_id: int, body: ProductUpdate, db: DBDep):
    product = await db.get(Product, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Produit introuvable.")
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(product, field, value)
    await db.commit()
    await db.refresh(product)
    return product


@router.delete("/products/{product_id}", dependencies=[Depends(verify_admin_token)])
async def delete_product(product_id: int, db: DBDep):
    product = await db.get(Product, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Produit introuvable.")
    await db.delete(product)
    await db.commit()
    return {"deleted": product_id}


# ─── Catalogue (créations boutique admin) ──────────────────────────────────

class CatalogueItemOut(BaseModel):
    id: int
    title: str
    description: Optional[str]
    image_url: Optional[str]
    price: float
    category: Optional[str]
    status: CatalogueStatus
    printful_variant_id: Optional[str]
    tags: Optional[str]
    created_at: datetime
    model_config = {"from_attributes": True}


class CatalogueItemCreate(BaseModel):
    title: str
    description: Optional[str] = None
    image_url: Optional[str] = None
    price: float
    category: Optional[str] = None
    status: CatalogueStatus = CatalogueStatus.draft
    printful_variant_id: Optional[str] = None
    tags: Optional[str] = None


class CatalogueItemUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    image_url: Optional[str] = None
    price: Optional[float] = None
    category: Optional[str] = None
    status: Optional[CatalogueStatus] = None
    printful_variant_id: Optional[str] = None
    tags: Optional[str] = None


@router.get("/catalogue", response_model=list[CatalogueItemOut], dependencies=[Depends(verify_admin_token)])
async def list_catalogue(db: DBDep, skip: int = 0, limit: int = Query(100, le=500)):
    result = await db.execute(
        select(CatalogueItem).order_by(CatalogueItem.created_at.desc()).offset(skip).limit(limit)
    )
    return result.scalars().all()


@router.post("/catalogue", response_model=CatalogueItemOut, status_code=201, dependencies=[Depends(verify_admin_token)])
async def create_catalogue_item(body: CatalogueItemCreate, db: DBDep):
    item = CatalogueItem(**body.model_dump())
    db.add(item)
    await db.commit()
    await db.refresh(item)
    return item


@router.post("/catalogue/upload-image", dependencies=[Depends(verify_admin_token)])
async def upload_catalogue_image(file: UploadFile = File(...)):
    """Upload une image pour une création catalogue. Retourne {url: '...'}"""
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in (".jpg", ".jpeg", ".png", ".webp", ".gif"):
        raise HTTPException(status_code=400, detail="Format non supporté. Utilisez JPG, PNG, WEBP ou GIF.")
    filename = f"{uuid.uuid4().hex}{ext}"
    dest = os.path.join(_UPLOAD_DIR, filename)
    content = await file.read()
    if len(content) > 10 * 1024 * 1024:  # 10 MB max
        raise HTTPException(status_code=413, detail="Image trop lourde (max 10 Mo).")
    with open(dest, "wb") as f:
        f.write(content)
    return {"url": f"/static/catalogue/{filename}"}


@router.patch("/catalogue/{item_id}", response_model=CatalogueItemOut, dependencies=[Depends(verify_admin_token)])
async def update_catalogue_item(item_id: int, body: CatalogueItemUpdate, db: DBDep):
    item = await db.get(CatalogueItem, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Créaion introuvable.")
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(item, field, value)
    await db.commit()
    await db.refresh(item)
    return item


@router.delete("/catalogue/{item_id}", dependencies=[Depends(verify_admin_token)])
async def delete_catalogue_item(item_id: int, db: DBDep):
    item = await db.get(CatalogueItem, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Création introuvable.")
    await db.delete(item)
    await db.commit()
    return {"deleted": item_id}
