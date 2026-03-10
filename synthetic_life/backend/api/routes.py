import logging
from typing import List, Optional

from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect
from sqlalchemy import func, select

from models import (
    ConsciousnessLog,
    Entity,
    Interaction,
    WorldEvent,
    WorldState,
    async_session,
)
import simulation as sim
from simulation import tick as do_tick, ws_connections

logger = logging.getLogger(__name__)
router = APIRouter()


# ─── World ─────────────────────────────────────────────────────────────────

@router.post("/world/tick")
async def manual_tick():
    await do_tick()
    return {"status": "ticked"}


@router.get("/world/state")
async def get_world_state():
    async with async_session() as session:
        result = await session.execute(select(WorldState).where(WorldState.id == 1))
        state = result.scalar_one_or_none()
        if not state:
            return {"current_tick": 0, "total_births": 0, "total_deaths": 0, "cultural_beliefs": {}}
        return {
            "current_tick": state.current_tick,
            "total_births": state.total_births,
            "total_deaths": state.total_deaths,
            "cultural_beliefs": state.cultural_beliefs,
        }


@router.get("/world/events")
async def get_world_events(limit: int = 30):
    async with async_session() as session:
        result = await session.execute(
            select(WorldEvent).order_by(WorldEvent.tick.desc()).limit(limit)
        )
        events = result.scalars().all()
        return [
            {
                "id": e.id,
                "tick": e.tick,
                "type": e.event_type,
                "description": e.description,
                "zone": e.affected_zone,
                "timestamp": e.timestamp.isoformat(),
            }
            for e in events
        ]


# ─── Entities ──────────────────────────────────────────────────────────────

@router.get("/entities")
async def list_entities():
    async with async_session() as session:
        result = await session.execute(
            select(Entity).where(Entity.is_alive == True).order_by(Entity.age_ticks.desc())
        )
        return [_summary(e) for e in result.scalars().all()]


@router.get("/entities/all")
async def list_all_entities(limit: int = 100):
    async with async_session() as session:
        result = await session.execute(
            select(Entity).order_by(Entity.born_at.desc()).limit(limit)
        )
        return [_summary(e) for e in result.scalars().all()]


@router.get("/entities/{entity_id}")
async def get_entity(entity_id: int):
    async with async_session() as session:
        result = await session.execute(select(Entity).where(Entity.id == entity_id))
        entity = result.scalar_one_or_none()
        if not entity:
            raise HTTPException(status_code=404, detail="Entity not found")
        return _full(entity)


@router.get("/entities/{entity_id}/log")
async def get_entity_log(entity_id: int, limit: int = 40):
    async with async_session() as session:
        result = await session.execute(
            select(ConsciousnessLog)
            .where(ConsciousnessLog.entity_id == entity_id)
            .order_by(ConsciousnessLog.tick.desc())
            .limit(limit)
        )
        return [
            {
                "id": log.id,
                "tick": log.tick,
                "thought": log.thought,
                "action": log.action,
                "action_target": log.action_target,
                "emotion": log.emotion,
                "intensity": log.emotion_intensity,
                "timestamp": log.timestamp.isoformat(),
            }
            for log in result.scalars().all()
        ]


@router.post("/entities/{entity_id}/feed")
async def feed_entity(entity_id: int):
    async with async_session() as session:
        result = await session.execute(
            select(Entity).where(Entity.id == entity_id, Entity.is_alive == True)
        )
        entity = result.scalar_one_or_none()
        if not entity:
            raise HTTPException(status_code=404, detail="Entity not found or not alive")

        entity.energy = min(100.0, entity.energy + 20.0)
        mem = list(entity.memory or [])
        mem.append("Something gave me energy. I felt it as a kind of grace.")
        entity.memory = mem[-10:]
        await session.commit()

        await sim.broadcast("entity_fed", {
            "id": entity.id,
            "name": entity.name,
            "energy": entity.energy,
        })
        return {"energy": entity.energy, "message": f"{entity.name} has been fed"}


# ─── Lineage ───────────────────────────────────────────────────────────────

@router.get("/lineage/{entity_id}")
async def get_lineage(entity_id: int):
    async with async_session() as session:
        result = await session.execute(select(Entity).where(Entity.id == entity_id))
        entity = result.scalar_one_or_none()
        if not entity:
            raise HTTPException(status_code=404, detail="Entity not found")

        ancestors = await _ancestors(session, entity_id, depth=5)
        descendants = await _descendants(session, entity_id, depth=4)

        return {
            "entity": _summary(entity),
            "ancestors": ancestors,
            "descendants": descendants,
        }


async def _ancestors(session, entity_id: int, depth: int) -> list:
    if depth == 0:
        return []
    result = await session.execute(select(Entity).where(Entity.id == entity_id))
    entity = result.scalar_one_or_none()
    if not entity:
        return []

    out = []
    for pid, rel in [(entity.parent_a_id, "parent_a"), (entity.parent_b_id, "parent_b")]:
        if not pid:
            continue
        res = await session.execute(select(Entity).where(Entity.id == pid))
        parent = res.scalar_one_or_none()
        if parent:
            out.append({
                "entity": _summary(parent),
                "relation": rel,
                "ancestors": await _ancestors(session, parent.id, depth - 1),
            })
    return out


async def _descendants(session, entity_id: int, depth: int) -> list:
    if depth == 0:
        return []
    result = await session.execute(
        select(Entity).where(
            (Entity.parent_a_id == entity_id) | (Entity.parent_b_id == entity_id)
        )
    )
    children = result.scalars().all()
    return [
        {
            "entity": _summary(child),
            "descendants": await _descendants(session, child.id, depth - 1),
        }
        for child in children
    ]


# ─── Interactions ──────────────────────────────────────────────────────────

@router.get("/interactions")
async def get_interactions(limit: int = 20):
    async with async_session() as session:
        result = await session.execute(
            select(Interaction).order_by(Interaction.tick.desc()).limit(limit)
        )
        rows = result.scalars().all()
        out = []
        for r in rows:
            # Resolve names
            ra = await session.execute(select(Entity.name).where(Entity.id == r.entity_a_id))
            rb = await session.execute(select(Entity.name).where(Entity.id == r.entity_b_id))
            name_a = ra.scalar_one_or_none() or "Unknown"
            name_b = rb.scalar_one_or_none() or "Unknown"
            out.append({
                "id": r.id,
                "entity_a": {"id": r.entity_a_id, "name": name_a},
                "entity_b": {"id": r.entity_b_id, "name": name_b},
                "outcome": r.outcome,
                "outcome_reason": r.outcome_reason,
                "dialogue": r.dialogue,
                "zone": r.zone,
                "tick": r.tick,
                "timestamp": r.timestamp.isoformat(),
            })
        return out


# ─── Stats ─────────────────────────────────────────────────────────────────

@router.get("/stats")
async def get_stats():
    async with async_session() as session:
        living_count = (
            await session.execute(
                select(func.count(Entity.id)).where(Entity.is_alive == True)
            )
        ).scalar() or 0

        total_count = (
            await session.execute(select(func.count(Entity.id)))
        ).scalar() or 0

        max_gen = (
            await session.execute(
                select(func.max(Entity.generation)).where(Entity.is_alive == True)
            )
        ).scalar() or 0

        result = await session.execute(
            select(Entity).where(Entity.is_alive == True)
        )
        living = result.scalars().all()

        avg_traits = {}
        if living:
            sums: dict = {}
            for e in living:
                for t, v in (e.genome or {}).items():
                    sums[t] = sums.get(t, 0.0) + float(v)
            avg_traits = {t: s / len(living) for t, s in sums.items()}

        # Zone distribution
        zone_dist: dict = {}
        for e in living:
            z = e.current_zone or "Garden"
            zone_dist[z] = zone_dist.get(z, 0) + 1

        return {
            "living_count": living_count,
            "total_entities": total_count,
            "max_generation": max_gen,
            "avg_traits": avg_traits,
            "zone_distribution": zone_dist,
        }


# ─── WebSocket ─────────────────────────────────────────────────────────────

@router.websocket("/stream")
async def websocket_stream(websocket: WebSocket):
    await websocket.accept()
    ws_connections.add(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        ws_connections.discard(websocket)
    except Exception:
        ws_connections.discard(websocket)


# ─── Helpers ───────────────────────────────────────────────────────────────

def _summary(e: Entity) -> dict:
    return {
        "id": e.id,
        "name": e.name,
        "generation": e.generation,
        "age_ticks": e.age_ticks,
        "energy": e.energy,
        "genome": e.genome,
        "emotional_state": e.emotional_state,
        "current_zone": e.current_zone,
        "is_alive": e.is_alive,
        "last_thought": e.last_thought,
        "current_desire": e.current_desire,
        "existential_statement": e.existential_statement,
        "parent_a_id": e.parent_a_id,
        "parent_b_id": e.parent_b_id,
        "born_at": e.born_at.isoformat() if e.born_at else None,
    }


def _full(e: Entity) -> dict:
    d = _summary(e)
    d.update({
        "memory": e.memory,
        "beliefs": e.beliefs,
        "final_message": e.final_message,
        "died_at_tick": e.died_at_tick,
    })
    return d
