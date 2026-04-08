from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Enum, Text, Table
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.database import Base

# ─── Table d'association Product ↔ Tag ────────────────────────────────────
product_tags = Table(
    "product_tags",
    Base.metadata,
    Column("product_id", Integer, ForeignKey("products.id", ondelete="CASCADE"), primary_key=True),
    Column("tag_id", Integer, ForeignKey("tags.id", ondelete="CASCADE"), primary_key=True),
)


class ProductType(Base):
    """Catégorie de produit physique (ex: T-SHIRTS PREMIUM, HOODIES OVERSIZE)."""
    __tablename__ = "product_types"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)          # ex: "T-SHIRTS PREMIUM"
    slug = Column(String, unique=True, nullable=False, index=True)  # ex: "t-shirts-premium"
    description = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    catalogue_items = relationship("CatalogueItem", back_populates="product_type", lazy="select")


class Tag(Base):
    """Tag normalisé, utilisé pour définir les collections sur le front public."""
    __tablename__ = "tags"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)
    slug = Column(String, unique=True, nullable=False, index=True)
    color = Column(String, nullable=False, default="#6B7280")
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    products = relationship("Product", secondary=product_tags, back_populates="tags", lazy="select")


class AdminUser(Base):
    """Compte administrateur — mot de passe hashé bcrypt, jamais en clair."""
    __tablename__ = "admin_users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, nullable=False, index=True)
    hashed_password = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=True)   # None pour les comptes legacy sans MDP
    display_name = Column(String, nullable=True)
    is_active = Column(Integer, default=1, nullable=False)   # 1=actif, 0=anonymisé
    email_verified = Column(Integer, default=0, nullable=False)  # 0=non vérifié, 1=vérifié
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    designs = relationship("Design", back_populates="user", lazy="select")
    orders = relationship("Order", back_populates="user", lazy="select")


class DesignStatus(str, enum.Enum):
    pending = "pending"
    processing = "processing"
    ready = "ready"
    failed = "failed"


class Design(Base):
    __tablename__ = "designs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    original_url = Column(String, nullable=False)
    svg_url = Column(String, nullable=True)
    dpi = Column(Float, nullable=True)
    status = Column(Enum(DesignStatus), default=DesignStatus.pending, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    user = relationship("User", back_populates="designs")
    orders = relationship("Order", back_populates="design", lazy="select")


class OrderStatus(str, enum.Enum):
    pending = "pending"
    paid = "paid"
    submitted = "submitted"
    shipped = "shipped"
    cancelled = "cancelled"


class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    design_id = Column(Integer, ForeignKey("designs.id"), nullable=False, index=True)
    stripe_session_id = Column(String, nullable=True, unique=True)
    printful_order_id = Column(String, nullable=True)
    status = Column(Enum(OrderStatus), default=OrderStatus.pending, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    user = relationship("User", back_populates="orders")
    design = relationship("Design", back_populates="orders")


class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    category = Column(String, nullable=True)
    image_url = Column(String, nullable=True)

    # ── Prix communs à toutes les variantes ───────────────────────────────
    # design_price_ht  : prix HT fixé pour le design (travail créatif)
    # shop_margin_rate : marge boutique en décimal (ex: 0.30 = 30 %)
    # tva_rate         : taux TVA (default 0.20 = 20 %)
    # price            : prix TTC minimum parmi les variantes (mis à jour auto)
    design_price_ht = Column(Float, nullable=False, default=0.0)
    shop_margin_rate = Column(Float, nullable=False, default=0.30)
    tva_rate = Column(Float, nullable=False, default=0.20)
    price = Column(Float, nullable=False, default=0.0)  # prix min TTC

    # ── Design + mockup ────────────────────────────────────────────────────
    printful_catalog_product_id = Column(Integer, nullable=True)
    design_url = Column(String, nullable=True)
    mockup_url = Column(String, nullable=True)
    placement_json = Column(Text, nullable=True)

    # ── Relation variantes ─────────────────────────────────────────────────
    variants = relationship("ProductVariant", back_populates="product",
                            cascade="all, delete-orphan", lazy="selectin")

    # ── Relation tags ──────────────────────────────────────────────────────
    tags = relationship("Tag", secondary=product_tags, back_populates="products", lazy="selectin")


class ProductVariant(Base):
    """Une variante d'un Product (taille/couleur spécifique, avec son propre coût Printful)."""
    __tablename__ = "product_variants"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id", ondelete="CASCADE"),
                        nullable=False, index=True)
    printful_variant_id = Column(String, nullable=False, unique=True)
    color = Column(String, nullable=True)
    size = Column(String, nullable=True)
    printful_cost_ht = Column(Float, nullable=False, default=0.0)
    price = Column(Float, nullable=False, default=0.0)  # TTC calculé pour cette variante

    product = relationship("Product", back_populates="variants")


class CatalogueStatus(str, enum.Enum):
    draft = "draft"
    active = "active"
    archived = "archived"


class CatalogueItem(Base):
    __tablename__ = "catalogue"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(String, nullable=True)
    image_url = Column(String, nullable=True)
    price = Column(Float, nullable=False)
    category = Column(String, nullable=True)
    status = Column(Enum(CatalogueStatus), default=CatalogueStatus.draft, nullable=False)
    printful_variant_id = Column(String, nullable=True)  # conservé pour compatibilité
    variants_json = Column(Text, nullable=True)  # JSON: [{printful_variant_id, color, size, price}]
    design_url = Column(String, nullable=True)   # URL du design source (artwork)
    placement_json = Column(Text, nullable=True)  # JSON placement Printful
    tags = Column(String, nullable=True)  # JSON array sérialisé en String
    product_type_id = Column(Integer, ForeignKey("product_types.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    product_type = relationship("ProductType", back_populates="catalogue_items", lazy="selectin")


class ShopDesign(Base):
    """Asset graphique uploadé pour être appliqué sur des produits Printful."""
    __tablename__ = "shop_designs"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String, nullable=False)
    url = Column(String, nullable=False)  # /static/designs/...
    dpi = Column(Float, nullable=True)
    print_ready = Column(Integer, default=0, nullable=False)  # 0=non, 1=oui
    bg_removed = Column(Integer, default=0, nullable=False)
    upscaled = Column(Integer, default=0, nullable=False)
    vectorized = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class PromoCode(Base):
    __tablename__ = "promo_codes"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String, unique=True, index=True, nullable=False)
    discount_type = Column(String, nullable=False, default="percent")  # 'percent' | 'fixed'
    discount_value = Column(Float, nullable=False, default=0.0)
    max_uses = Column(Integer, nullable=False, default=0)  # 0 = illimité
    uses_count = Column(Integer, default=0, nullable=False)
    is_active = Column(Integer, default=1, nullable=False)  # 1=actif, 0=inactif (SQLite bool)
    expires_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class Invoice(Base):
    __tablename__ = "invoices"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"), unique=True, nullable=False, index=True)
    invoice_number = Column(String, unique=True, nullable=False, index=True)  # OVF-YYYY-XXXX
    issued_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    user_email = Column(String, nullable=False)
    user_name = Column(String, nullable=False)
    # Adresse de facturation (JSON sérialisé)
    billing_address = Column(String, nullable=True)
    # Adresse de livraison (JSON sérialisé) — None = identique à la facturation
    shipping_address = Column(String, nullable=True)
    items_json = Column(String, nullable=False)  # JSON array sérialisé
    amount_ht = Column(Float, nullable=False)
    tva_rate = Column(Float, default=0.20, nullable=False)
    amount_tva = Column(Float, nullable=False)
    amount_ttc = Column(Float, nullable=False)
    promo_code = Column(String, nullable=True)
    discount_amount = Column(Float, default=0.0, nullable=False)

    order = relationship("Order", foreign_keys=[order_id])


class Setting(Base):
    __tablename__ = "settings"

    id = Column(Integer, primary_key=True, index=True)
    key = Column(String, unique=True, nullable=False, index=True)
    value = Column(String, nullable=False)  # valeur chiffrée (Fernet)
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

