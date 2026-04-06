"""
Router admin API — endpoints JSON pour le panneau Next.js.
Tous les endpoints (sauf /login) requièrent un Bearer JWT admin valide.
"""
from __future__ import annotations

from typing import Annotated, Optional, List
from datetime import datetime, timedelta, timezone
import asyncio
import os
import uuid

from fastapi import APIRouter, Depends, Form, HTTPException, Query, UploadFile, File
from pydantic import BaseModel
from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import CatalogueItem, CatalogueStatus, Design, DesignStatus, Invoice, Order, OrderStatus, Product, PromoCode, User
from app.services.admin_api.auth import create_admin_token, verify_admin_token, verify_password
from app.middleware.analytics import get_top_pages, get_product_views

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
    # % variation vs 30 jours précédents (0.0 si non calculable)
    delta_users: float = 0.0
    delta_designs: float = 0.0
    delta_orders: float = 0.0
    delta_revenue: float = 0.0


def _pct_change(current: int | float, previous: int | float) -> float:
    """% de variation entre deux périodes. Retourne 0 si previous == 0 et current == 0."""
    if previous == 0:
        return 100.0 if current > 0 else 0.0
    return round((current - previous) / previous * 100, 1)


@router.get("/stats", response_model=StatsResponse, dependencies=[Depends(verify_admin_token)])
async def get_stats(db: DBDep):
    now = datetime.now(timezone.utc)
    thirty_days_ago = now - timedelta(days=30)
    sixty_days_ago = now - timedelta(days=60)

    total_users = (await db.execute(select(func.count(User.id)))).scalar_one()
    total_designs = (await db.execute(select(func.count(Design.id)))).scalar_one()
    total_orders = (await db.execute(select(func.count(Order.id)))).scalar_one()

    # Revenus : nombre de commandes payées × prix moyen des produits
    total_revenue = 0.0
    paid_count = (
        await db.execute(select(func.count(Order.id)).where(Order.status == OrderStatus.paid))
    ).scalar_one()
    avg_price = 0.0
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

    # ─── Deltas (30j courant vs 30j précédents) ────────────────────────────
    designs_curr = (await db.execute(
        select(func.count(Design.id)).where(Design.created_at >= thirty_days_ago)
    )).scalar_one()
    designs_prev = (await db.execute(
        select(func.count(Design.id)).where(
            Design.created_at >= sixty_days_ago, Design.created_at < thirty_days_ago
        )
    )).scalar_one()

    orders_curr = (await db.execute(
        select(func.count(Order.id)).where(Order.created_at >= thirty_days_ago)
    )).scalar_one()
    orders_prev = (await db.execute(
        select(func.count(Order.id)).where(
            Order.created_at >= sixty_days_ago, Order.created_at < thirty_days_ago
        )
    )).scalar_one()

    paid_curr = (await db.execute(
        select(func.count(Order.id)).where(
            Order.status == OrderStatus.paid, Order.created_at >= thirty_days_ago
        )
    )).scalar_one()
    paid_prev = (await db.execute(
        select(func.count(Order.id)).where(
            Order.status == OrderStatus.paid,
            Order.created_at >= sixty_days_ago,
            Order.created_at < thirty_days_ago,
        )
    )).scalar_one()
    rev_curr = round(paid_curr * avg_price, 2)
    rev_prev = round(paid_prev * avg_price, 2)

    return StatsResponse(
        total_users=total_users,
        total_designs=total_designs,
        total_orders=total_orders,
        total_revenue=total_revenue,
        orders_by_status=orders_by_status,
        designs_by_status=designs_by_status,
        delta_designs=_pct_change(designs_curr, designs_prev),
        delta_orders=_pct_change(orders_curr, orders_prev),
        delta_revenue=_pct_change(rev_curr, rev_prev),
    )


# ─── Stats avancées ────────────────────────────────────────────────────────

class DayPoint(BaseModel):
    date: str       # "YYYY-MM-DD"
    value: float


class PageViewItem(BaseModel):
    url: str
    views: int


class TrafficStats(BaseModel):
    orders_per_day: list[DayPoint]
    designs_per_day: list[DayPoint]
    period_days: int
    top_pages: list[PageViewItem] = []


class ProductStatItem(BaseModel):
    id: int
    name: str
    category: str | None
    sales_count: int
    revenue: float
    views_count: int = 0


class ProductsStats(BaseModel):
    top_products: list[ProductStatItem]
    top_designs_by_orders: list[dict]


class FinanceDayPoint(BaseModel):
    date: str
    revenue: float
    costs: float
    margin: float


class FinanceStats(BaseModel):
    days: list[FinanceDayPoint]
    total_revenue: float
    total_costs: float
    total_margin: float
    avg_order_value: float


@router.get("/stats/traffic", response_model=TrafficStats, dependencies=[Depends(verify_admin_token)])
async def get_stats_traffic(db: DBDep, days: int = Query(30, ge=7, le=90)):
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)

    # Orders par jour (SQLite strftime)
    orders_rows = (await db.execute(
        select(
            func.strftime("%Y-%m-%d", Order.created_at).label("day"),
            func.count(Order.id).label("cnt"),
        )
        .where(Order.created_at >= cutoff)
        .group_by(text("day"))
        .order_by(text("day"))
    )).all()

    # Designs par jour
    designs_rows = (await db.execute(
        select(
            func.strftime("%Y-%m-%d", Design.created_at).label("day"),
            func.count(Design.id).label("cnt"),
        )
        .where(Design.created_at >= cutoff)
        .group_by(text("day"))
        .order_by(text("day"))
    )).all()

    return TrafficStats(
        orders_per_day=[DayPoint(date=r.day, value=r.cnt) for r in orders_rows],
        designs_per_day=[DayPoint(date=r.day, value=r.cnt) for r in designs_rows],
        period_days=days,
        top_pages=[PageViewItem(**p) for p in await get_top_pages(10)],
    )


@router.get("/stats/products", response_model=ProductsStats, dependencies=[Depends(verify_admin_token)])
async def get_stats_products(db: DBDep):
    # Top 5 produits par nombre de commandes
    # Product n'est pas FK orders — on utilise Product.price comme proxy de revenus
    all_products = (await db.execute(select(Product).limit(50))).scalars().all()

    # Distribuer les commandes payées sur les produits (simplifié : ordre round-robin)
    paid_orders_count = (
        await db.execute(select(func.count(Order.id)).where(Order.status == OrderStatus.paid))
    ).scalar_one()

    items: list[ProductStatItem] = []
    if all_products:
        per_product = max(1, paid_orders_count // len(all_products))
        for i, p in enumerate(all_products[:5]):
            cnt = per_product + (1 if i < paid_orders_count % max(len(all_products), 1) else 0)
            items.append(ProductStatItem(
                id=p.id,
                name=p.name,
                category=p.category,
                sales_count=cnt,
                revenue=round(cnt * p.price, 2),
            ))
        items.sort(key=lambda x: x.sales_count, reverse=True)

        # Enrichir avec les vues Redis
        product_ids = [item.id for item in items]
        views_map = await get_product_views(product_ids)
        for item in items:
            item.views_count = views_map.get(item.id, 0)

    # Top 5 designs par nombre de commandes
    design_rows = (await db.execute(
        select(Design.id, func.count(Order.id).label("cnt"))
        .join(Order, Order.design_id == Design.id)
        .group_by(Design.id)
        .order_by(text("cnt DESC"))
        .limit(5)
    )).all()

    top_designs = [{"design_id": r.id, "orders_count": r.cnt} for r in design_rows]

    return ProductsStats(top_products=items, top_designs_by_orders=top_designs)


@router.get("/stats/finance", response_model=FinanceStats, dependencies=[Depends(verify_admin_token)])
async def get_stats_finance(db: DBDep, days: int = Query(30, ge=7, le=90)):
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)

    avg_price = (await db.execute(select(func.avg(Product.price)))).scalar_one_or_none() or 0.0
    # Coût Printful estimé = 60% du prix de vente
    cost_ratio = 0.60

    rows = (await db.execute(
        select(
            func.strftime("%Y-%m-%d", Order.created_at).label("day"),
            func.count(Order.id).label("cnt"),
        )
        .where(Order.created_at >= cutoff, Order.status == OrderStatus.paid)
        .group_by(text("day"))
        .order_by(text("day"))
    )).all()

    finance_days: list[FinanceDayPoint] = []
    total_rev = 0.0
    total_cost = 0.0
    for r in rows:
        rev = round(r.cnt * avg_price, 2)
        cost = round(rev * cost_ratio, 2)
        margin = round(rev - cost, 2)
        total_rev += rev
        total_cost += cost
        finance_days.append(FinanceDayPoint(date=r.day, revenue=rev, costs=cost, margin=margin))

    total_rev = round(total_rev, 2)
    total_cost = round(total_cost, 2)
    paid_total = (
        await db.execute(select(func.count(Order.id)).where(Order.status == OrderStatus.paid))
    ).scalar_one()
    avg_order = round(total_rev / paid_total, 2) if paid_total > 0 else 0.0

    return FinanceStats(
        days=finance_days,
        total_revenue=total_rev,
        total_costs=round(total_cost, 2),
        total_margin=round(total_rev - total_cost, 2),
        avg_order_value=avg_order,
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


class UserStatsOut(BaseModel):
    user_id: int
    username: str
    email: str
    designs_count: int
    orders_count: int
    orders_paid_count: int
    designs: list[dict]
    orders: list[dict]


@router.get("/users/{user_id}/stats", response_model=UserStatsOut, dependencies=[Depends(verify_admin_token)])
async def get_user_stats(user_id: int, db: DBDep):
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable.")

    designs_rows = (await db.execute(
        select(Design.id, Design.status, Design.dpi, Design.created_at)
        .where(Design.user_id == user_id)
        .order_by(Design.created_at.desc())
        .limit(10)
    )).all()

    orders_rows = (await db.execute(
        select(Order.id, Order.status, Order.design_id, Order.created_at, Order.stripe_session_id)
        .where(Order.user_id == user_id)
        .order_by(Order.created_at.desc())
        .limit(10)
    )).all()

    paid_count = (
        await db.execute(
            select(func.count(Order.id))
            .where(Order.user_id == user_id, Order.status == OrderStatus.paid)
        )
    ).scalar_one()

    return UserStatsOut(
        user_id=user.id,
        username=user.username,
        email=user.email,
        designs_count=len(designs_rows),
        orders_count=len(orders_rows),
        orders_paid_count=paid_count,
        designs=[
            {"id": r.id, "status": r.status.value, "dpi": r.dpi,
             "created_at": r.created_at.isoformat()}
            for r in designs_rows
        ],
        orders=[
            {"id": r.id, "status": r.status.value, "design_id": r.design_id,
             "stripe_session_id": r.stripe_session_id,
             "created_at": r.created_at.isoformat()}
            for r in orders_rows
        ],
    )


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


@router.get("/designs/{design_id}", response_model=DesignOut, dependencies=[Depends(verify_admin_token)])
async def get_design(design_id: int, db: DBDep):
    design = await db.get(Design, design_id)
    if not design:
        raise HTTPException(status_code=404, detail="Design introuvable.")
    return design


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
    image_url: Optional[str] = None
    model_config = {"from_attributes": True}


class ProductCreate(BaseModel):
    name: str
    printful_variant_id: str
    price: float
    category: Optional[str] = None
    image_url: Optional[str] = None


class ProductUpdate(BaseModel):
    name: Optional[str] = None
    price: Optional[float] = None
    category: Optional[str] = None
    image_url: Optional[str] = None


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
    """Upload brut d'une image catalogue sans traitement. Retourne {url, width, height}"""
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

    from app.services.fixer.image_utils import validate_and_open_image
    try:
        img = await asyncio.to_thread(validate_and_open_image, content)
        dpi = img.info.get("dpi", (72, 72))
        width, height = img.size
    except Exception:
        dpi = (72, 72)
        width = height = 0

    return {
        "url": f"/static/catalogue/{filename}",
        "width": width,
        "height": height,
        "dpi": round(float(dpi[0])),
        "print_ready": round(float(dpi[0])) >= 300,
    }


@router.post("/catalogue/process-image", dependencies=[Depends(verify_admin_token)])
async def process_catalogue_image(
    file: UploadFile = File(...),
    remove_bg: bool = Form(False),
    upscale: bool = Form(True),
    vectorize: bool = Form(False),
):
    """Pipeline de correction d'image pour le catalogue admin.

    - Supprime le fond via rembg (optionnel)
    - Upscale si DPI < 300 (optionnel, activé par défaut)
    - Vectorise en SVG via vtracer (optionnel — désactive l'upscale raster)
    - Sauvegarde dans /static/catalogue/
    - Retourne {url, width, height, dpi, print_ready, bg_removed, upscaled, vectorized}
    """
    import asyncio as _asyncio
    from app.services.fixer.image_utils import (
        validate_and_open_image,
        check_print_ready,
        upscale_to_print,
        remove_background,
        vectorize_to_svg,
        REMBG_AVAILABLE,
        VTRACER_AVAILABLE,
    )
    import io as _io

    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=422, detail="Fichier image requis.")

    content = await file.read()
    if len(content) > 20 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Image trop lourde (max 20 Mo).")

    # 1 — Suppression du fond (avant tout traitement, meilleurs résultats)
    bg_removed = False
    if remove_bg:
        if not REMBG_AVAILABLE:
            raise HTTPException(
                status_code=503,
                detail="Suppression de fond non disponible (rembg manquant)."
            )
        content = await _asyncio.to_thread(remove_background, content)
        bg_removed = True

    # 2 — Validation image
    try:
        img = await _asyncio.to_thread(validate_and_open_image, content)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    was_upscaled = False
    was_vectorized = False

    # 3 — Vectorisation SVG (prend précédence sur l'upscale raster)
    if vectorize:
        if not VTRACER_AVAILABLE:
            raise HTTPException(
                status_code=503,
                detail="Vectorisation non disponible (vtracer manquant)."
            )
        # Upscale avant vectorisation pour de meilleurs contours si image petite
        if not check_print_ready(img):
            img = await _asyncio.to_thread(upscale_to_print, img)
            was_upscaled = True
        # Pré-traitement pour vtracer : résolution optimale + netteté + contraste
        def _prepare_for_vtracer(src) -> bytes:
            from PIL import Image as _Image, ImageEnhance, ImageFilter
            # Taille optimale vtracer : 1200-1800px côté long (ni trop petit, ni trop grand)
            max_side = 1600
            w, h = src.size
            if max(w, h) > max_side:
                scale = max_side / max(w, h)
                src = src.resize((int(w * scale), int(h * scale)), _Image.LANCZOS)
            elif max(w, h) < 400:
                scale = 400 / max(w, h)
                src = src.resize((int(w * scale), int(h * scale)), _Image.LANCZOS)
            # Netteté
            src = src.filter(ImageFilter.SHARPEN)
            src = src.filter(ImageFilter.SHARPEN)
            # Légère augmentation du contraste
            src = ImageEnhance.Contrast(src).enhance(1.15)
            buf = _io.BytesIO()
            src.save(buf, format="PNG")
            return buf.getvalue()

        prepared = await _asyncio.to_thread(_prepare_for_vtracer, img)
        svg_str = await _asyncio.to_thread(vectorize_to_svg, prepared)
        was_vectorized = True

        filename = f"{uuid.uuid4().hex}.svg"
        dest = os.path.join(_UPLOAD_DIR, filename)
        with open(dest, "w", encoding="utf-8") as fh:
            fh.write(svg_str)

        dpi_out = img.info.get("dpi", (300, 300)) if was_upscaled else img.info.get("dpi", (72, 72))
        return {
            "url": f"/static/catalogue/{filename}",
            "width": img.width,
            "height": img.height,
            "dpi": 300 if was_upscaled else round(float(dpi_out[0])),
            "print_ready": True,
            "bg_removed": bg_removed,
            "upscaled": was_upscaled,
            "vectorized": True,
        }

    # 4 — Upscale raster (sans vectorisation)
    if upscale and not check_print_ready(img):
        img = await _asyncio.to_thread(upscale_to_print, img)
        was_upscaled = True

    # 5 — Sérialisation PNG (préserve canal alpha si fond supprimé)
    buf = _io.BytesIO()
    save_fmt = "PNG" if bg_removed else (img.format or "PNG")
    img.save(buf, format=save_fmt, dpi=(300, 300) if was_upscaled else img.info.get("dpi", (72, 72)))
    processed = buf.getvalue()

    # 6 — Sauvegarde
    ext = ".png" if (bg_removed or save_fmt == "PNG") else f".{save_fmt.lower()}"
    filename = f"{uuid.uuid4().hex}{ext}"
    dest = os.path.join(_UPLOAD_DIR, filename)
    with open(dest, "wb") as fh:
        fh.write(processed)

    dpi_out = img.info.get("dpi", (300, 300)) if was_upscaled else img.info.get("dpi", (72, 72))

    return {
        "url": f"/static/catalogue/{filename}",
        "width": img.width,
        "height": img.height,
        "dpi": 300 if was_upscaled else round(float(dpi_out[0])),
        "print_ready": True if was_upscaled else check_print_ready(img),
        "bg_removed": bg_removed,
        "upscaled": was_upscaled,
        "vectorized": False,
    }


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


# ─── Codes Promo ────────────────────────────────────────────────────────────

class PromoCodeOut(BaseModel):
    id: int
    code: str
    discount_type: str  # 'percent' | 'fixed'
    discount_value: float
    max_uses: int  # 0 = illimité
    uses_count: int
    is_active: bool
    expires_at: Optional[datetime]
    created_at: datetime
    model_config = {"from_attributes": True}

    @classmethod
    def from_orm_bool(cls, obj) -> "PromoCodeOut":
        return cls(
            id=obj.id,
            code=obj.code,
            discount_type=obj.discount_type,
            discount_value=obj.discount_value,
            max_uses=obj.max_uses,
            uses_count=obj.uses_count,
            is_active=bool(obj.is_active),
            expires_at=obj.expires_at,
            created_at=obj.created_at,
        )


class PromoCodeCreate(BaseModel):
    code: str
    discount_type: str = "percent"  # 'percent' | 'fixed'
    discount_value: float
    max_uses: int = 0  # 0 = illimité
    expires_at: Optional[datetime] = None


class PromoCodeUpdate(BaseModel):
    discount_type: Optional[str] = None
    discount_value: Optional[float] = None
    max_uses: Optional[int] = None
    is_active: Optional[bool] = None
    expires_at: Optional[datetime] = None


@router.get("/promo", dependencies=[Depends(verify_admin_token)])
async def list_promo_codes(db: DBDep) -> List[PromoCodeOut]:
    result = await db.execute(select(PromoCode).order_by(PromoCode.created_at.desc()))
    rows = result.scalars().all()
    return [PromoCodeOut.from_orm_bool(r) for r in rows]


@router.post("/promo", dependencies=[Depends(verify_admin_token)])
async def create_promo_code(body: PromoCodeCreate, db: DBDep) -> PromoCodeOut:
    existing = await db.execute(select(PromoCode).where(PromoCode.code == body.code.upper()))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Ce code existe déjà.")
    item = PromoCode(
        code=body.code.upper(),
        discount_type=body.discount_type,
        discount_value=body.discount_value,
        max_uses=body.max_uses,
        expires_at=body.expires_at,
        uses_count=0,
        is_active=1,
    )
    db.add(item)
    await db.commit()
    await db.refresh(item)
    return PromoCodeOut.from_orm_bool(item)


@router.patch("/promo/{promo_id}", dependencies=[Depends(verify_admin_token)])
async def update_promo_code(promo_id: int, body: PromoCodeUpdate, db: DBDep) -> PromoCodeOut:
    item = await db.get(PromoCode, promo_id)
    if not item:
        raise HTTPException(status_code=404, detail="Code promo introuvable.")
    data = body.model_dump(exclude_unset=True)
    if "is_active" in data:
        data["is_active"] = 1 if data["is_active"] else 0
    for field, value in data.items():
        setattr(item, field, value)
    await db.commit()
    await db.refresh(item)
    return PromoCodeOut.from_orm_bool(item)


@router.delete("/promo/{promo_id}", dependencies=[Depends(verify_admin_token)])
async def delete_promo_code(promo_id: int, db: DBDep):
    item = await db.get(PromoCode, promo_id)
    if not item:
        raise HTTPException(status_code=404, detail="Code promo introuvable.")
    await db.delete(item)
    await db.commit()
    return {"deleted": promo_id}


# ─── Settings ──────────────────────────────────────────────────────────────

_SETTINGS_KEYS = [
    ("STRIPE_SECRET_KEY", "Stripe Secret Key"),
    ("PRINTFUL_API_KEY", "Printful API Key"),
    ("OPENAI_API_KEY", "OpenAI API Key"),
    ("ADMIN_PASSWORD", "Admin Password"),
    ("ADMIN_JWT_SECRET", "Admin JWT Secret"),
    ("DATABASE_URL", "Database URL"),
    ("REDIS_URL", "Redis URL"),
]


class SettingOut(BaseModel):
    key: str
    label: str
    is_set: bool
    preview: str  # "sk_live_***" or "(non défini)"


class ServiceTestResult(BaseModel):
    service: str
    ok: bool
    message: str


def _mask(value: str | None) -> tuple[bool, str]:
    if not value:
        return False, "(non défini)"
    visible = value[:6] if len(value) > 6 else value[:2]
    return True, f"{visible}{'*' * min(8, len(value) - len(visible))}"


@router.get("/settings", response_model=list[SettingOut], dependencies=[Depends(verify_admin_token)])
async def get_settings():
    result = []
    for key, label in _SETTINGS_KEYS:
        val = os.environ.get(key)
        is_set, preview = _mask(val)
        result.append(SettingOut(key=key, label=label, is_set=is_set, preview=preview))
    return result


@router.post("/settings/test/{service}", response_model=ServiceTestResult, dependencies=[Depends(verify_admin_token)])
async def test_service(service: str):
    import httpx  # noqa: PLC0415
    service = service.lower()

    async with httpx.AsyncClient(timeout=8.0) as client:
        try:
            if service == "stripe":
                key = os.environ.get("STRIPE_SECRET_KEY", "")
                if not key:
                    return ServiceTestResult(service="stripe", ok=False, message="STRIPE_SECRET_KEY non définie.")
                resp = await client.get(
                    "https://api.stripe.com/v1/balance",
                    headers={"Authorization": f"Bearer {key}"},
                )
                ok = resp.status_code == 200
                msg = "Connecté ✓" if ok else f"Erreur {resp.status_code}"

            elif service == "openai":
                key = os.environ.get("OPENAI_API_KEY", "")
                if not key:
                    return ServiceTestResult(service="openai", ok=False, message="OPENAI_API_KEY non définie.")
                resp = await client.get(
                    "https://api.openai.com/v1/models",
                    headers={"Authorization": f"Bearer {key}"},
                )
                ok = resp.status_code == 200
                msg = "Connecté ✓" if ok else f"Erreur {resp.status_code}"

            elif service == "printful":
                key = os.environ.get("PRINTFUL_API_KEY", "")
                if not key:
                    return ServiceTestResult(service="printful", ok=False, message="PRINTFUL_API_KEY non définie.")
                resp = await client.get(
                    "https://api.printful.com/store",
                    headers={"Authorization": f"Bearer {key}"},
                )
                ok = resp.status_code == 200
                msg = "Connecté ✓" if ok else f"Erreur {resp.status_code}"

            else:
                return ServiceTestResult(service=service, ok=False, message="Service inconnu.")

        except httpx.ConnectError:
            return ServiceTestResult(service=service, ok=False, message="Impossible de joindre le service.")
        except httpx.TimeoutException:
            return ServiceTestResult(service=service, ok=False, message="Timeout — service inaccessible.")

    return ServiceTestResult(service=service, ok=ok, message=msg)


@router.post("/settings/purge-failed-designs", dependencies=[Depends(verify_admin_token)])
async def purge_failed_designs(db: DBDep):
    result = await db.execute(select(Design).where(Design.status == DesignStatus.failed))
    designs = result.scalars().all()
    count = len(designs)
    for d in designs:
        await db.delete(d)
    await db.commit()
    return {"deleted": count}


# ─── Invoices ──────────────────────────────────────────────────────────────────────────

class InvoiceItemSchema(BaseModel):
    description: str
    quantity: int
    unit_price_ht: float


class AddressSchema(BaseModel):
    line1: str
    line2: str | None = None
    city: str
    postal_code: str
    country: str = "France"


class InvoiceOut(BaseModel):
    id: int
    order_id: int
    invoice_number: str
    issued_at: datetime
    user_email: str
    user_name: str
    billing_address: str | None
    shipping_address: str | None
    items_json: str
    amount_ht: float
    tva_rate: float
    amount_tva: float
    amount_ttc: float
    promo_code: str | None
    discount_amount: float
    model_config = {"from_attributes": True}


class InvoiceCreate(BaseModel):
    order_id: int
    user_email: str
    user_name: str
    billing_address: AddressSchema | None = None
    shipping_address: AddressSchema | None = None
    items: list[InvoiceItemSchema]
    tva_rate: float = 0.20
    promo_code: str | None = None
    discount_amount: float = 0.0


def _next_invoice_number(year: int, seq: int) -> str:
    return f"OVF-{year}-{seq:04d}"


@router.get("/invoices", response_model=list[InvoiceOut], dependencies=[Depends(verify_admin_token)])
async def list_invoices(
    db: DBDep,
    skip: int = 0,
    limit: int = Query(100, le=500),
    search: str | None = Query(None),
    date_from: str | None = Query(None),
    date_to: str | None = Query(None),
):
    from sqlalchemy import or_, cast, String as SAString
    stmt = select(Invoice).order_by(Invoice.issued_at.desc())
    if search:
        stmt = stmt.where(
            or_(
                Invoice.invoice_number.ilike(f"%{search}%"),
                Invoice.user_email.ilike(f"%{search}%"),
                Invoice.user_name.ilike(f"%{search}%"),
            )
        )
    if date_from:
        from datetime import date
        stmt = stmt.where(Invoice.issued_at >= datetime.fromisoformat(date_from))
    if date_to:
        stmt = stmt.where(Invoice.issued_at <= datetime.fromisoformat(date_to + "T23:59:59"))
    result = await db.execute(stmt.offset(skip).limit(limit))
    return result.scalars().all()


@router.post("/invoices", response_model=InvoiceOut, dependencies=[Depends(verify_admin_token)])
async def create_invoice(body: InvoiceCreate, db: DBDep):
    import json
    from datetime import date
    # Vérifier doublon
    existing = (await db.execute(
        select(Invoice).where(Invoice.order_id == body.order_id)
    )).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=409, detail="Une facture existe déjà pour cette commande.")

    # Numéro séquentiel
    year = datetime.now().year
    count = (await db.execute(
        select(func.count(Invoice.id)).where(
            Invoice.invoice_number.like(f"OVF-{year}-%")
        )
    )).scalar_one()
    invoice_number = _next_invoice_number(year, count + 1)

    # Calculs montants
    amount_ht = sum(item.quantity * item.unit_price_ht for item in body.items)
    amount_ht = round(amount_ht - body.discount_amount, 2)
    amount_tva = round(amount_ht * body.tva_rate, 2)
    amount_ttc = round(amount_ht + amount_tva, 2)

    inv = Invoice(
        order_id=body.order_id,
        invoice_number=invoice_number,
        user_email=body.user_email,
        user_name=body.user_name,
        billing_address=json.dumps(body.billing_address.model_dump(), ensure_ascii=False) if body.billing_address else None,
        shipping_address=json.dumps(body.shipping_address.model_dump(), ensure_ascii=False) if body.shipping_address else None,
        items_json=json.dumps([i.model_dump() for i in body.items], ensure_ascii=False),
        amount_ht=amount_ht,
        tva_rate=body.tva_rate,
        amount_tva=amount_tva,
        amount_ttc=amount_ttc,
        promo_code=body.promo_code,
        discount_amount=body.discount_amount,
    )
    db.add(inv)
    await db.commit()
    await db.refresh(inv)
    return inv


@router.get("/invoices/{invoice_id}/pdf", dependencies=[Depends(verify_admin_token)])
async def download_invoice_pdf(invoice_id: int, db: DBDep):
    import json
    import io
    from fastapi.responses import StreamingResponse
    from reportlab.lib.pagesizes import A4
    from reportlab.lib import colors
    from reportlab.lib.units import cm
    from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.enums import TA_RIGHT, TA_CENTER

    inv = await db.get(Invoice, invoice_id)
    if not inv:
        raise HTTPException(status_code=404, detail="Facture introuvable.")

    items = json.loads(inv.items_json)

    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf, pagesize=A4,
        leftMargin=2*cm, rightMargin=2*cm, topMargin=2*cm, bottomMargin=2*cm
    )

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle("title", parent=styles["Heading1"], fontSize=20, spaceAfter=4)
    body_style = styles["Normal"]
    right_style = ParagraphStyle("right", parent=styles["Normal"], alignment=TA_RIGHT)
    small_style = ParagraphStyle("small", parent=styles["Normal"], fontSize=8, textColor=colors.grey)

    story = []

    # En-tête
    story.append(Paragraph("OVERFITTED.IO", title_style))
    story.append(Paragraph("Design lab — produits uniques print-on-demand", small_style))
    story.append(Spacer(1, 0.3*cm))

    # Adresses
    def _fmt_addr(raw):
        if not raw:
            return ""
        try:
            import json as _j
            d = _j.loads(raw)
            parts = [d.get("line1", "")]
            if d.get("line2"):
                parts.append(d["line2"])
            parts.append((d.get("postal_code", "") + " " + d.get("city", "")).strip())
            parts.append(d.get("country", ""))
            return "\n".join(p for p in parts if p)
        except Exception:
            return raw

    billing_str = _fmt_addr(inv.billing_address)
    shipping_str = _fmt_addr(inv.shipping_address)
    same_address = not shipping_str or billing_str == shipping_str

    if billing_str or shipping_str:
        addr_style = ParagraphStyle("addr", parent=styles["Normal"], fontSize=9, leading=14)
        addr_grey_style = ParagraphStyle("addr_grey", parent=styles["Normal"], fontSize=9, leading=14, textColor=colors.grey)
        billing_lines = "<br/>".join(billing_str.split("\n")) if billing_str else "&#8212;"
        addr_left = Paragraph(
            "<b>Adresse de facturation</b><br/>" + billing_lines,
            addr_style
        )
        if same_address:
            addr_right = Paragraph(
                "<b>Adresse de livraison</b><br/><i>Identique a l'adresse de facturation</i>",
                addr_grey_style
            )
        else:
            shipping_lines = "<br/>".join(shipping_str.split("\n"))
            addr_right = Paragraph(
                "<b>Adresse de livraison</b><br/>" + shipping_lines,
                addr_style
            )
        addr_table = Table([[addr_left, addr_right]], colWidths=[8*cm, 8*cm])
        addr_table.setStyle(TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ]))
        story.append(addr_table)
        story.append(Spacer(1, 0.4*cm))

    # Infos facture
    issued = inv.issued_at.strftime("%d/%m/%Y") if inv.issued_at else ""
    info_data = [
        ["FACTURE", inv.invoice_number],
        ["Date d’émission", issued],
        ["Commande n°", str(inv.order_id)],
        ["Client", inv.user_name],
        ["Email", inv.user_email],
    ]
    if inv.promo_code:
        info_data.append(["Code promo", inv.promo_code])

    info_table = Table(info_data, colWidths=[5*cm, 10*cm])
    info_table.setStyle(TableStyle([
        ("FONTNAME", (0, 0), (-1, -1), "Helvetica"),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
        ("TEXTCOLOR", (0, 0), (0, -1), colors.HexColor("#555555")),
    ]))
    story.append(info_table)
    story.append(Spacer(1, 0.5*cm))

    # Tableau articles
    header = ["Description", "Qté", "P.U. HT", "Total HT"]
    rows = [header]
    for item in items:
        total = item["quantity"] * item["unit_price_ht"]
        rows.append([
            item["description"],
            str(item["quantity"]),
            f"{item['unit_price_ht']:.2f} €",
            f"{total:.2f} €",
        ])

    items_table = Table(rows, colWidths=[9*cm, 2*cm, 3*cm, 3*cm])
    items_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#222222")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("ALIGN", (1, 0), (-1, -1), "RIGHT"),
        ("GRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#DDDDDD")),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F9F9F9")]),
    ]))
    story.append(items_table)
    story.append(Spacer(1, 0.3*cm))

    # Totaux
    totals_data = []
    if inv.discount_amount > 0:
        totals_data.append(["Remise", f"-{inv.discount_amount:.2f} €"])
    totals_data += [
        ["Sous-total HT", f"{inv.amount_ht:.2f} €"],
        [f"TVA ({int(inv.tva_rate*100)}%)", f"{inv.amount_tva:.2f} €"],
        ["TOTAL TTC", f"{inv.amount_ttc:.2f} €"],
    ]
    totals_table = Table(totals_data, colWidths=[14*cm, 3*cm])
    totals_table.setStyle(TableStyle([
        ("FONTNAME", (0, 0), (-1, -1), "Helvetica"),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("FONTNAME", (0, -1), (-1, -1), "Helvetica-Bold"),
        ("FONTSIZE", (0, -1), (-1, -1), 11),
        ("ALIGN", (0, 0), (-1, -1), "RIGHT"),
        ("LINEABOVE", (0, -1), (-1, -1), 1, colors.black),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    story.append(totals_table)
    story.append(Spacer(1, 1*cm))

    # Mentions légales
    story.append(Paragraph(
        "Paiement effectué en ligne via Stripe. "
        "Conformément à la Directive 2011/83/UE, vous disposez d’un délai de rétractation de 14 jours "
        "à compter de la réception de votre commande.",
        small_style
    ))

    doc.build(story)
    buf.seek(0)

    filename = f"{inv.invoice_number}.pdf"
    return StreamingResponse(
        buf,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )

