"""FastAPI REST and WebSocket API routes."""

import asyncio
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models import EntityModel, SimulationStateModel, WorldEventModel, get_session
from backend.simulation import advance_tick, get_or_create_state, seed_population, set_broadcast_callback

router = APIRouter()

# --- WebSocket connection manager ---

class ConnectionManager:
    def __init__(self):
        self.active: list[WebSocket] = []

    async def connect(self, ws: WebSocket):
        await ws.accept()
        self.active.append(ws)

    def disconnect(self, ws: WebSocket):
        if ws in self.active:
            self.active.remove(ws)

    async def broadcast(self, message: dict):
        dead = []
        for ws in self.active:
            try:
                await ws.send_json(message)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(ws)


manager = ConnectionManager()
set_broadcast_callback(manager.broadcast)


# --- WebSocket endpoint ---

@router.websocket("/stream")
async def stream_ws(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            # Keep alive: wait for messages (client can ping)
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)


# --- REST endpoints ---

@router.post("/world/tick")
async def world_tick(session: AsyncSession = Depends(get_session)) -> dict[str, Any]:
    """Advance the world by one tick."""
    result = await advance_tick(session)
    return result


@router.get("/world/state")
async def world_state(session: AsyncSession = Depends(get_session)) -> dict[str, Any]:
    """Get current simulation state."""
    state = await get_or_create_state(session)
    result = await session.execute(select(EntityModel).where(EntityModel.status != "dead"))
    alive = result.scalars().all()
    return {
        "current_tick": state.current_tick,
        "total_born": state.total_born,
        "total_dead": state.total_dead,
        "alive_count": len(alive),
        "population_history": state.population_history[-50:],
    }


@router.get("/world/events")
async def world_events(limit: int = 20, session: AsyncSession = Depends(get_session)) -> list[dict]:
    """Get recent world events."""
    result = await session.execute(
        select(WorldEventModel).order_by(WorldEventModel.tick.desc()).limit(limit)
    )
    events = result.scalars().all()
    return [e.to_dict() for e in events]


@router.get("/entities")
async def list_entities(session: AsyncSession = Depends(get_session)) -> list[dict]:
    """List all living entities."""
    result = await session.execute(select(EntityModel).where(EntityModel.status != "dead"))
    entities = result.scalars().all()
    return [e.to_dict() for e in entities]


@router.get("/entities/{entity_id}")
async def get_entity(entity_id: str, session: AsyncSession = Depends(get_session)) -> dict:
    """Get full entity state."""
    result = await session.execute(select(EntityModel).where(EntityModel.id == entity_id))
    entity = result.scalar_one_or_none()
    if not entity:
        raise HTTPException(status_code=404, detail="Entity not found")
    return entity.to_dict()


@router.get("/entities/{entity_id}/log")
async def entity_log(entity_id: str, session: AsyncSession = Depends(get_session)) -> dict:
    """Get entity consciousness stream."""
    result = await session.execute(select(EntityModel).where(EntityModel.id == entity_id))
    entity = result.scalar_one_or_none()
    if not entity:
        raise HTTPException(status_code=404, detail="Entity not found")
    return {"id": entity.id, "name": entity.name, "consciousness_log": entity.consciousness_log}


@router.post("/entities/{entity_id}/feed")
async def feed_entity(entity_id: str, session: AsyncSession = Depends(get_session)) -> dict:
    """Give energy to an entity."""
    result = await session.execute(select(EntityModel).where(EntityModel.id == entity_id))
    entity = result.scalar_one_or_none()
    if not entity:
        raise HTTPException(status_code=404, detail="Entity not found")
    if entity.status == "dead":
        raise HTTPException(status_code=400, detail="Cannot feed a dead entity")
    entity.energy = min(100.0, entity.energy + 20.0)
    if entity.status == "dying":
        entity.status = "alive"
    await session.commit()
    return {"id": entity.id, "name": entity.name, "energy": entity.energy}


@router.get("/lineage/{entity_id}")
async def entity_lineage(entity_id: str, session: AsyncSession = Depends(get_session)) -> dict:
    """Get ancestor/descendant tree for an entity."""
    result = await session.execute(select(EntityModel).where(EntityModel.id == entity_id))
    entity = result.scalar_one_or_none()
    if not entity:
        raise HTTPException(status_code=404, detail="Entity not found")

    # Get ancestors recursively (up to 3 generations)
    from collections import deque
    ancestors = []
    queue: deque[str] = deque(entity.parent_ids)
    seen = set()
    while queue:
        pid = queue.popleft()
        if pid in seen:
            continue
        seen.add(pid)
        r = await session.execute(select(EntityModel).where(EntityModel.id == pid))
        parent = r.scalar_one_or_none()
        if parent:
            ancestors.append({"id": parent.id, "name": parent.name, "generation": parent.generation})
            queue.extend([p for p in parent.parent_ids if p not in seen])

    # Get descendants
    result = await session.execute(select(EntityModel))
    all_entities = result.scalars().all()
    descendants = [
        {"id": e.id, "name": e.name, "generation": e.generation, "status": e.status}
        for e in all_entities
        if entity.id in e.parent_ids
    ]

    return {
        "id": entity.id,
        "name": entity.name,
        "generation": entity.generation,
        "parent_ids": entity.parent_ids,
        "ancestors": ancestors,
        "descendants": descendants,
    }


@router.post("/world/seed")
async def seed_world(session: AsyncSession = Depends(get_session)) -> dict:
    """Seed the world with initial entities if empty."""
    entities = await seed_population(session)
    return {"seeded": len(entities), "entities": [{"id": e.id, "name": e.name} for e in entities]}
