"""
database.py — Async SQLAlchemy engine, session factory, and DB initialisation.

Uses aiosqlite as the async driver for SQLite. All sessions are managed via
dependency injection in FastAPI routes, ensuring they are properly closed
even on exception paths.
"""

import logging
from pathlib import Path
from typing import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Database connection: reads DATABASE_URL from env or defaults to local SQLite (v1.0.2)
# ---------------------------------------------------------------------------
import os

DB_DIR = Path(__file__).parent
DB_PATH = DB_DIR / "tickettriage.db"
DEFAULT_DB_URL = f"sqlite+aiosqlite:///{DB_PATH}"

DATABASE_URL = (
    os.getenv("DATABASE_URL")
    or os.getenv("databased_url")
    or os.getenv("DATABASE_URI")
    or DEFAULT_DB_URL
)

# Standardize PostgreSQL URLs for asyncpg driver
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+asyncpg://", 1)
elif DATABASE_URL.startswith("postgresql://") and not DATABASE_URL.startswith("postgresql+asyncpg://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://", 1)

# asyncpg uses ssl=... instead of sslmode=...
if "asyncpg" in DATABASE_URL and "sslmode=" in DATABASE_URL:
    DATABASE_URL = DATABASE_URL.replace("sslmode=", "ssl=")

connect_args = {}
if "sqlite" in DATABASE_URL:
    connect_args["check_same_thread"] = False

engine = create_async_engine(
    DATABASE_URL,
    echo=False,
    future=True,
    connect_args=connect_args,
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


class Base(DeclarativeBase):
    """Declarative base shared by all ORM models."""
    pass


async def init_db() -> None:
    """Create all tables and seed the PromptConfig singleton. Called once at startup."""
    async with engine.begin() as conn:
        # Import models here to ensure they are registered on Base.metadata
        from backend import models  # noqa: F401
        await conn.run_sync(Base.metadata.create_all)
    logger.info("Database initialised at %s", DB_PATH)

    # Seed the PromptConfig singleton (id=1) if it doesn't already exist.
    # Importing here avoids circular imports — models import Base from this module.
    from backend.models import PromptConfig
    from backend.llm import SYSTEM_PROMPT, PROMPT_VERSION
    from sqlalchemy import select

    async with AsyncSessionLocal() as session:
        result = await session.execute(select(PromptConfig).where(PromptConfig.id == 1))
        existing = result.scalar_one_or_none()
        if existing is None:
            session.add(PromptConfig(id=1, version=PROMPT_VERSION, system_prompt=SYSTEM_PROMPT))
            await session.commit()
            logger.info("PromptConfig seeded with default prompt — version=%s", PROMPT_VERSION)
        else:
            logger.info("PromptConfig already exists — version=%s", existing.version)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency that yields a database session and guarantees cleanup."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
