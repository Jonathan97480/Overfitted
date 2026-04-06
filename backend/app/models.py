from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)

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
    printful_variant_id = Column(String, nullable=False, unique=True)
    price = Column(Float, nullable=False)
    category = Column(String, nullable=True)

