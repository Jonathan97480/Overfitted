"""CLI — Créer ou mettre à jour le mot de passe admin (hash bcrypt en BDD).

Usage :
    cd backend
    python -m app.set_admin_password

Le script demande le username et le mot de passe de façon interactive (getpass).
Le mot de passe N'EST JAMAIS affiché ni stocké en clair.
"""

import asyncio
import getpass
import sys

import bcrypt
from sqlalchemy import select

from app.database import SessionLocal
from app.models import AdminUser  # noqa: F401 — nécessaire pour Base.metadata


async def set_password() -> None:
    username = input("Username [admin]: ").strip() or "admin"
    password = getpass.getpass("Nouveau mot de passe : ")
    confirm = getpass.getpass("Confirmer le mot de passe : ")

    if password != confirm:
        print("❌ Les mots de passe ne correspondent pas.")
        sys.exit(1)

    if len(password) < 8:
        print("❌ Le mot de passe doit faire au moins 8 caractères.")
        sys.exit(1)

    hashed = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

    async with SessionLocal() as session:
        result = await session.execute(
            select(AdminUser).where(AdminUser.username == username)
        )
        admin = result.scalar_one_or_none()

        if admin is None:
            admin = AdminUser(username=username, hashed_password=hashed)
            session.add(admin)
            action = "créé"
        else:
            admin.hashed_password = hashed
            action = "mis à jour"

        await session.commit()

    print(f"✅ Compte admin '{username}' {action} avec succès.")
    print("   Le mot de passe est stocké hashé (bcrypt) en base de données.")


if __name__ == "__main__":
    asyncio.run(set_password())
