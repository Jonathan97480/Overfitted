"""
Router public catalogue — endpoints sans authentification.
Expose uniquement les items avec status=active de la table `catalogue`.
"""
from __future__ import annotations

from typing import Any
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Annotated

from app.database import get_db
from app.models import CatalogueItem, CatalogueStatus, ProductType, Tag
from sqlalchemy.orm import selectinload

router = APIRouter(tags=["catalogue"])

DBDep = Annotated[AsyncSession, Depends(get_db)]


@router.get("/api/catalogue/public")
async def list_public_catalogue(
    db: DBDep,
    skip: int = 0,
    limit: int = 100,
) -> dict[str, Any]:
    """Liste les articles actifs du catalogue (public, sans authentification).

    Retourne une structure compatible avec le shop frontend :
    { paging: { total, offset, limit }, result: [ CataloguePublicItem ] }
    """
    limit = min(limit, 200)

    count_result = await db.execute(
        select(CatalogueItem).where(CatalogueItem.status == CatalogueStatus.active)
    )
    items = count_result.scalars().all()
    total = len(items)

    result = await db.execute(
        select(CatalogueItem)
        .options(selectinload(CatalogueItem.product_type))
        .where(CatalogueItem.status == CatalogueStatus.active)
        .order_by(CatalogueItem.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    rows = result.scalars().all()

    return {
        "paging": {"total": total, "offset": skip, "limit": limit},
        "result": [_serialize(r) for r in rows],
    }


@router.get("/api/catalogue/public/product-types")
async def list_public_product_types(db: DBDep) -> dict:
    """Liste tous les types de produits disponibles (public, sans authentification)."""
    result = await db.execute(select(ProductType).order_by(ProductType.name))
    rows = result.scalars().all()
    return {
        "result": [
            {
                "id": pt.id,
                "name": pt.name,
                "slug": pt.slug,
                "description": pt.description,
            }
            for pt in rows
        ]
    }


@router.get("/api/catalogue/public/tags")
async def list_public_tags(db: DBDep) -> dict:
    """Liste tous les tags disponibles (public) — utilisés comme Collections dans le shop."""
    result = await db.execute(select(Tag).order_by(Tag.name))
    rows = result.scalars().all()
    return {
        "result": [
            {"id": t.id, "name": t.name, "slug": t.slug, "color": t.color}
            for t in rows
        ]
    }


@router.get("/api/catalogue/public/{item_id}")
async def get_public_catalogue_item(item_id: int, db: DBDep) -> dict[str, Any]:
    """Détail d'un article actif du catalogue (public, sans authentification)."""
    result = await db.execute(
        select(CatalogueItem).where(
            CatalogueItem.id == item_id,
            CatalogueItem.status == CatalogueStatus.active,
        )
    )
    item = result.scalar_one_or_none()
    if item is None:
        raise HTTPException(status_code=404, detail="Article introuvable.")
    return {"result": _serialize(item)}


def _serialize(item: CatalogueItem) -> dict[str, Any]:
    """Sérialise un CatalogueItem au format attendu par le frontend shop."""
    return {
        "id": item.id,
        "title": item.title,
        "description": item.description,
        "image_url": item.image_url,
        "price": item.price,
        "category": item.category,
        "tags": item.tags,
        "printful_variant_id": item.printful_variant_id,
        "created_at": item.created_at.isoformat() if item.created_at else None,
        "product_type_id": item.product_type_id,
        "product_type_name": item.product_type.name if item.product_type else None,
        "product_type_slug": item.product_type.slug if item.product_type else None,
    }
