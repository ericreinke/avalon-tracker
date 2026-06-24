import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from .database import SessionLocal
from .models import Player, Game, GamePlayer  # noqa: F401
from .seed import seed_main_player
from .routers import players, games


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: seed main player (schema managed by Alembic)
    db = SessionLocal()
    try:
        seed_main_player(db)
    finally:
        db.close()
    yield


app = FastAPI(title="Avalon Tracker", lifespan=lifespan)

# Routers
app.include_router(players.router)
app.include_router(games.router)

# Serve frontend as static files (mount AFTER API routes so /api/* takes priority)
frontend_dir = os.path.join(os.path.dirname(__file__), "..", "..", "frontend")
app.mount("/", StaticFiles(directory=frontend_dir, html=True), name="frontend")
