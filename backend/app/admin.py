from sqladmin import ModelView
from app.models import User, Design, Order, Product, CatalogueItem


class UserAdmin(ModelView, model=User):
    column_list = [User.id, User.username, User.email]


class DesignAdmin(ModelView, model=Design):
    column_list = [Design.id, Design.user_id, Design.status, Design.dpi, Design.created_at]


class OrderAdmin(ModelView, model=Order):
    column_list = [Order.id, Order.user_id, Order.design_id, Order.status, Order.stripe_session_id]


class ProductAdmin(ModelView, model=Product):
    column_list = [Product.id, Product.name, Product.price, Product.category, Product.printful_variant_id]


class CatalogueItemAdmin(ModelView, model=CatalogueItem):
    column_list = [CatalogueItem.id, CatalogueItem.title, CatalogueItem.price, CatalogueItem.status, CatalogueItem.category, CatalogueItem.created_at]
