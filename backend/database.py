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
# Database connection: reads DATABASE_URL from env or defaults to local SQLite
# ---------------------------------------------------------------------------
import os

DB_DIR = Path(__file__).parent
DB_PATH = DB_DIR / "tickettriage.db"
DEFAULT_DB_URL = f"sqlite+aiosqlite:///{DB_PATH}"

DATABASE_URL = os.getenv("DATABASE_URL", DEFAULT_DB_URL)

# Standardize PostgreSQL URLs for asyncpg driver
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+asyncpg://", 1)
elif DATABASE_URL.startswith("postgresql://") and not DATABASE_URL.startswith("postgresql+asyncpg://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://", 1)

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
    """Create all tables defined on Base.metadata. Called once at startup."""
    async with engine.begin() as conn:
        # Import models here to ensure they are registered on Base.metadata
        from backend import models  # noqa: F401
        await conn.run_sync(Base.metadata.create_all)
    logger.info("Database initialised at %s", DB_PATH)


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
