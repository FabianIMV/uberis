"""FastAPI application entry point for Uberis."""

import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.api.routes import router
from backend.models import init_db
from backend.simulation import seed_population
from backend.models import get_session


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize database and seed population on startup."""
    await init_db()
    async for session in get_session():
        await seed_population(session)
        break
    yield


app = FastAPI(
    title="Uberis — Synthetic Life Simulation",
    description="A living world of digital entities that believe they are alive.",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)
