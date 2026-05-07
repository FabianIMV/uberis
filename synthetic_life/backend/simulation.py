"""
Simulation engine — the tick loop that drives the world.

One tick = one heartbeat of the simulation.
"""
import asyncio
import logging
import random
from datetime import datetime
from typing import Any, Dict, List, Optional, Set

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from entity_brain import (
    consolidate_memories,
    generate_dying_message,
    generate_encounter_dialogue,
    think,
)
from evolution import (
    calculate_energy_drain,
    create_offspring_genome,
    get_random_name,
    should_reproduce,
)
from models import (
    ConsciousnessLog,
    Entity,
    Interaction,
    WorldEvent,
    WorldState,
    async_session,
)
from world import ZONES, get_weighted_event, should_fire_world_event

logger = logging.getLogger(__name__)

# ─── Global state ──────────────────────────────────────────────────────────

ws_connections: Set[Any] = set()
_sim_task: Optional[asyncio.Task] = None
_running: bool = False

TICK_INTERVAL: int = 8
MAX_POPULATION: int = 20
THINK_EVERY_N_TICKS: int = 3
MEMORY_CONSOLIDATION_THRESHOLD: int = 18   # compress when memory exceeds this
MEMORY_CONSOLIDATION_EVERY: int = 15        # check every N ticks per entity

SEED_GENOMES = [
    {"curiosity": 0.90, "aggression": 0.10, "empathy": 0.80, "creativity": 0.70, "survival_drive": 0.60},
    {"curiosity": 0.30, "aggression": 0.80, "empathy": 0.20, "creativity": 0.40, "survival_drive": 0.90},
    {"curiosity": 0.70, "aggression": 0.40, "empathy": 0.65, "creativity": 0.90, "survival_drive": 0.50},
    {"curiosity": 0.55, "aggression": 0.50, "empathy": 0.75, "creativity": 0.60, "survival_drive": 0.70},
    {"curiosity": 0.85, "aggression": 0.25, "empathy": 0.45, "creativity": 0.55, "survival_drive": 0.40},
]
SEED_NAMES = ["Aether", "Vex", "Lumis", "Nora", "Cyan"]


# ─── Broadcast ─────────────────────────────────────────────────────────────

async def broadcast(event_type: str, data: Any) -> None:
    message = {
        "type": event_type,
        "data": data,
        "timestamp": datetime.utcnow().isoformat(),
    }
    dead: Set[Any] = set()
    for ws in ws_connections:
        try:
            await ws.send_json(message)
        except Exception:
            dead.add(ws)
    ws_connections.difference_update(dead)


# ─── World state helpers ───────────────────────────────────────────────────

async def _get_or_create_world_state(session: AsyncSession) -> WorldState:
    result = await session.execute(select(WorldState).where(WorldState.id == 1))
    state = result.scalar_one_or_none()
    if not state:
        state = WorldState(
            id=1, current_tick=0, total_births=0,
            total_deaths=0, cultural_beliefs={},
        )
        session.add(state)
        await session.flush()
    return state


async def seed_entities(session: AsyncSession) -> None:
    result = await session.execute(select(func.count(Entity.id)))
    count = result.scalar() or 0
    if count > 0:
        return

    zones = list(ZONES.keys())
    for i, genome in enumerate(SEED_GENOMES):
        entity = Entity(
            name=SEED_NAMES[i],
            generation=0,
            genome=genome,
            memory=[],
            memory_archive=[],
            beliefs={"existence": "I am. That is the first and most certain thing."},
            emotional_state={"emotion": "wonder", "intensity": 0.8},
            relationships={},
            energy=100.0,
            current_zone=zones[i % len(zones)],
            is_alive=True,
        )
        session.add(entity)

    await session.flush()
    logger.info("Seeded 5 initial entities.")


# ─── Relationship helpers ──────────────────────────────────────────────────

def _update_relationship(
    entity_a: Entity,
    entity_b: Entity,
    result: Dict,
    tick_n: int,
) -> None:
    """Update both entities' relationship records after an encounter."""
    intensity_change = result.get("relationship_intensity_change", 0.0)

    for entity, other, valence_key, memory_key in [
        (entity_a, entity_b, "relationship_a_to_b", "a_memory"),
        (entity_b, entity_a, "relationship_b_to_a", "b_memory"),
    ]:
        rels = dict(entity.relationships or {})
        key = str(other.id)
        existing = rels.get(key, {"encounters": 0, "intensity": 0.2})

        new_intensity = min(1.0, max(0.0, existing.get("intensity", 0.2) + intensity_change))
        rels[key] = {
            "name": other.name,
            "valence": result.get(valence_key, existing.get("valence", "neutral")),
            "intensity": round(new_intensity, 3),
            "encounters": existing.get("encounters", 0) + 1,
            "last_tick": tick_n,
            "key_memory": (result.get(memory_key, "") or "")[:120],
        }
        entity.relationships = rels


# ─── Main tick ─────────────────────────────────────────────────────────────

async def tick() -> None:
    async with async_session() as session:
        world_state = await _get_or_create_world_state(session)
        current_tick = world_state.current_tick + 1
        world_state.current_tick = current_tick

        result = await session.execute(select(Entity).where(Entity.is_alive == True))
        entities: List[Entity] = list(result.scalars().all())

        if not entities:
            await seed_entities(session)
            await session.commit()
            return

        # ── World event ────────────────────────────────────────────────────
        active_event: Optional[WorldEvent] = None
        if should_fire_world_event():
            template = get_weighted_event()
            active_event = WorldEvent(
                tick=current_tick,
                event_type=template["type"],
                description=template["description"],
                affected_zone=template.get("zone"),
            )
            session.add(active_event)
            await session.flush()
            await broadcast("world_event", {
                "type": template["type"],
                "description": template["description"],
                "zone": template.get("zone"),
                "tick": current_tick,
            })

        # ── Process each entity ────────────────────────────────────────────
        for entity in entities:
            await _process_entity(entity, session, current_tick, world_state, active_event)

        await session.flush()

        # ── Encounters ────────────────────────────────────────────────────
        result2 = await session.execute(select(Entity).where(Entity.is_alive == True))
        living: List[Entity] = list(result2.scalars().all())

        await _handle_encounters(living, session, current_tick, world_state)

        # ── Cultural beliefs ───────────────────────────────────────────────
        _update_cultural_beliefs(living, world_state)

        # ── Reproduction ──────────────────────────────────────────────────
        if len(living) < MAX_POPULATION:
            await _handle_asexual_reproduction(living, session, current_tick, world_state)

        # ── Auto-reseed if population crashes ─────────────────────────────
        if len(living) < 2:
            await seed_entities(session)

        await session.commit()

        await broadcast("tick", {
            "tick": current_tick,
            "population": len(living),
            "total_births": world_state.total_births,
            "total_deaths": world_state.total_deaths,
        })


# ─── Entity processing ─────────────────────────────────────────────────────

async def _process_entity(
    entity: Entity,
    session: AsyncSession,
    tick_n: int,
    world_state: WorldState,
    active_event: Optional[WorldEvent],
) -> None:
    zone_data = ZONES.get(entity.current_zone, ZONES["Garden"])

    entity.energy += zone_data["energy_effect"]

    if active_event:
        event_zone = active_event.affected_zone
        if event_zone is None or event_zone == entity.current_zone:
            from world import WORLD_EVENTS as WE
            tmpl = next((e for e in WE if e["type"] == active_event.event_type), None)
            if tmpl:
                entity.energy += tmpl["effect"].get("energy", 0)
                entity.emotional_state = {
                    "emotion": tmpl["effect"].get("emotion", "awe"),
                    "intensity": 0.75,
                }
            mem = list(entity.memory or [])
            mem.append(f"A {active_event.event_type} came — {active_event.description[:90]}")
            entity.memory = mem

    drain = calculate_energy_drain(entity)
    entity.energy = max(0.0, min(100.0, entity.energy - drain))
    entity.age_ticks = (entity.age_ticks or 0) + 1

    # ── Memory consolidation ───────────────────────────────────────────────
    if tick_n % MEMORY_CONSOLIDATION_EVERY == entity.id % MEMORY_CONSOLIDATION_EVERY:
        memories = list(entity.memory or [])
        if len(memories) >= MEMORY_CONSOLIDATION_THRESHOLD:
            to_compress = memories[:10]
            remaining = memories[10:]
            compressed = await consolidate_memories(entity, to_compress)
            archive = list(entity.memory_archive or [])
            archive.extend(compressed)
            entity.memory_archive = archive[-20:]
            entity.memory = remaining

    # ── Death check ───────────────────────────────────────────────────────
    if entity.energy <= 5.0 and not entity.is_dying:
        entity.is_dying = True
        dying_msg = await generate_dying_message(entity)
        entity.final_message = dying_msg
        entity.is_alive = False
        entity.is_dying = False
        entity.died_at_tick = tick_n
        world_state.total_deaths += 1

        log = ConsciousnessLog(
            entity_id=entity.id,
            tick=tick_n,
            thought=(dying_msg or {}).get("final_words", "I am ending."),
            action="die",
            emotion=(dying_msg or {}).get("final_emotion", "acceptance"),
            emotion_intensity=1.0,
        )
        session.add(log)
        await session.flush()

        await broadcast("entity_died", {
            "id": entity.id,
            "name": entity.name,
            "age_ticks": entity.age_ticks,
            "final_words": (dying_msg or {}).get("final_words", ""),
            "life_meaning": (dying_msg or {}).get("life_meaning", ""),
            "at_peace": (dying_msg or {}).get("at_peace", True),
            "tick": tick_n,
        })

        await _trigger_grief(entity, session, tick_n)
        return

    # ── LLM consciousness ─────────────────────────────────────────────────
    if tick_n % THINK_EVERY_N_TICKS == (entity.id % THINK_EVERY_N_TICKS):
        thought = await think(
            entity, tick_n, cultural_beliefs=world_state.cultural_beliefs
        )
        if thought:
            entity.last_thought = thought.get("inner_monologue", "")
            entity.emotional_state = {
                "emotion": thought.get("emotion", "neutral"),
                "intensity": float(thought.get("emotion_intensity", 0.5)),
            }
            entity.current_desire = thought.get("desire")
            entity.existential_statement = thought.get("existential_statement")

            # Update goal
            goal_update = thought.get("goal_update")
            goal_status = thought.get("goal_status", "active")
            if goal_update:
                entity.current_goal = goal_update
            elif goal_status in ("achieved", "abandoned"):
                entity.current_goal = None

            # Update beliefs
            new_belief = thought.get("new_belief", {})
            if new_belief and isinstance(new_belief, dict) and "key" in new_belief:
                beliefs = dict(entity.beliefs or {})
                beliefs[new_belief["key"]] = new_belief.get("value", "")
                if len(beliefs) > 15:
                    beliefs.pop(next(iter(beliefs)))
                entity.beliefs = beliefs

            # Act
            action = thought.get("action", "contemplate")
            target = thought.get("action_target")

            if action == "explore" and target in ZONES:
                entity.current_zone = target
            elif action == "rest":
                entity.energy = min(100.0, entity.energy + 5.0)
            elif action == "seek_food":
                entity.energy = min(100.0, entity.energy + 8.0)

            # Persist memory of this thought
            mem = list(entity.memory or [])
            if entity.last_thought:
                mem.append(f"Thought: {entity.last_thought[:110]}")
            entity.memory = mem

            log = ConsciousnessLog(
                entity_id=entity.id,
                tick=tick_n,
                thought=entity.last_thought or "",
                action=action,
                action_target=str(target) if target else None,
                emotion=entity.emotional_state.get("emotion", "neutral"),
                emotion_intensity=entity.emotional_state.get("intensity", 0.5),
            )
            session.add(log)

            await broadcast("entity_thought", {
                "id": entity.id,
                "name": entity.name,
                "thought": entity.last_thought,
                "emotion": entity.emotional_state,
                "action": action,
                "action_target": target,
                "energy": entity.energy,
                "zone": entity.current_zone,
                "tick": tick_n,
                "existential_statement": entity.existential_statement,
                "current_goal": entity.current_goal,
                "relationships": entity.relationships,
            })


# ─── Encounters ────────────────────────────────────────────────────────────

async def _handle_encounters(
    living: List[Entity],
    session: AsyncSession,
    tick_n: int,
    world_state: WorldState,
) -> None:
    zone_groups: Dict[str, List[Entity]] = {}
    for e in living:
        z = e.current_zone or "Garden"
        zone_groups.setdefault(z, []).append(e)

    for zone, group in zone_groups.items():
        if len(group) < 2:
            continue
        if random.random() > 0.30:
            continue

        a, b = random.sample(group, 2)
        if not a.is_alive or not b.is_alive:
            continue

        # Determine prior relationship label for backwards compat
        rel_a_to_b = (a.relationships or {}).get(str(b.id), {})
        if rel_a_to_b.get("valence") == "family":
            prior = "family"
        elif rel_a_to_b.get("valence") == "friend":
            prior = "friends"
        elif rel_a_to_b.get("valence") == "rival":
            prior = "rivals"
        elif rel_a_to_b:
            prior = "acquaintances"
        else:
            prior = "strangers"

        result = await generate_encounter_dialogue(a, b, zone, prior)
        if not result:
            continue

        outcome = result.get("outcome", "indifference")
        a.energy = max(0.0, min(100.0, a.energy + result.get("energy_change_a", 0)))
        b.energy = max(0.0, min(100.0, b.energy + result.get("energy_change_b", 0)))

        if result.get("a_memory"):
            ma = list(a.memory or [])
            ma.append(f"Met {b.name}: {result['a_memory']}")
            a.memory = ma

        if result.get("b_memory"):
            mb = list(b.memory or [])
            mb.append(f"Met {a.name}: {result['b_memory']}")
            b.memory = mb

        # Update persistent relationships
        _update_relationship(a, b, result, tick_n)

        interaction = Interaction(
            entity_a_id=a.id,
            entity_b_id=b.id,
            tick=tick_n,
            outcome=outcome,
            outcome_reason=result.get("outcome_reason", ""),
            dialogue=result.get("dialogue", []),
            zone=zone,
        )
        session.add(interaction)

        await broadcast("encounter", {
            "entity_a": {"id": a.id, "name": a.name},
            "entity_b": {"id": b.id, "name": b.name},
            "outcome": outcome,
            "dialogue": result.get("dialogue", []),
            "zone": zone,
            "tick": tick_n,
            "relationship_a_to_b": result.get("relationship_a_to_b"),
            "relationship_b_to_a": result.get("relationship_b_to_a"),
        })

        if outcome == "reproduction" and len(living) < MAX_POPULATION:
            if should_reproduce(a, b):
                await _create_offspring(a, b, session, tick_n, world_state)


async def _handle_asexual_reproduction(
    living: List[Entity],
    session: AsyncSession,
    tick_n: int,
    world_state: WorldState,
) -> None:
    for entity in living:
        if entity.energy > 80 and tick_n % 20 == entity.id % 20:
            if random.random() < 0.08:
                await _create_offspring(entity, None, session, tick_n, world_state)
                break


async def _create_offspring(
    parent_a: Entity,
    parent_b: Optional[Entity],
    session: AsyncSession,
    tick_n: int,
    world_state: WorldState,
) -> None:
    genome = create_offspring_genome(parent_a, parent_b)
    name = get_random_name()
    generation = max(
        parent_a.generation or 0,
        (parent_b.generation if parent_b else 0) or 0,
    ) + 1

    birth_memory = (
        f"I was born of {parent_a.name} and {parent_b.name}"
        if parent_b
        else f"I emerged from {parent_a.name} alone"
    )

    # Seed family relationships
    initial_rels = {
        str(parent_a.id): {
            "name": parent_a.name,
            "valence": "family",
            "intensity": 0.8,
            "encounters": 0,
            "last_tick": tick_n,
            "key_memory": birth_memory,
        }
    }
    if parent_b:
        initial_rels[str(parent_b.id)] = {
            "name": parent_b.name,
            "valence": "family",
            "intensity": 0.8,
            "encounters": 0,
            "last_tick": tick_n,
            "key_memory": birth_memory,
        }

    offspring = Entity(
        name=name,
        generation=generation,
        genome=genome,
        memory=[birth_memory],
        memory_archive=[],
        beliefs={
            "origin": (
                f"I came from {parent_a.name} and {parent_b.name}"
                if parent_b
                else f"I came from {parent_a.name}"
            )
        },
        emotional_state={"emotion": "wonder", "intensity": 0.9},
        relationships=initial_rels,
        energy=70.0,
        current_zone=parent_a.current_zone,
        parent_a_id=parent_a.id,
        parent_b_id=parent_b.id if parent_b else None,
        is_alive=True,
    )
    session.add(offspring)
    world_state.total_births += 1
    await session.flush()

    # Update parents to know their offspring
    for parent in [parent_a, parent_b] if parent_b else [parent_a]:
        rels = dict(parent.relationships or {})
        rels[str(offspring.id)] = {
            "name": name,
            "valence": "family",
            "intensity": 0.9,
            "encounters": 0,
            "last_tick": tick_n,
            "key_memory": f"I brought {name} into the world",
        }
        parent.relationships = rels

    await broadcast("entity_born", {
        "name": name,
        "generation": generation,
        "parent_a": parent_a.name,
        "parent_b": parent_b.name if parent_b else None,
        "genome": genome,
        "zone": parent_a.current_zone,
        "tick": tick_n,
    })
    logger.info(f"New entity born: {name} (gen {generation})")


# ─── Grief ─────────────────────────────────────────────────────────────────

async def _trigger_grief(
    dead: Entity,
    session: AsyncSession,
    tick_n: int,
) -> None:
    result = await session.execute(select(Entity).where(Entity.is_alive == True))
    living = result.scalars().all()

    for entity in living:
        mems = entity.memory or []
        rels = entity.relationships or {}
        knew_them = any(dead.name in m for m in mems) or str(dead.id) in rels
        if not knew_them:
            continue

        empathy = (entity.genome or {}).get("empathy", 0.5)
        rel = rels.get(str(dead.id), {})
        bond_intensity = rel.get("intensity", 0.3)
        grief_multiplier = 1.0 + bond_intensity  # deeper bonds = deeper grief

        entity.energy = max(0.0, entity.energy - empathy * 10.0 * grief_multiplier)
        entity.emotional_state = {"emotion": "grief", "intensity": min(1.0, empathy + 0.3)}

        mem = list(entity.memory or [])
        valence = rel.get("valence", "")
        if valence == "family":
            mem.append(f"{dead.name}, my kin, is gone. The absence is a wound.")
        elif valence == "friend":
            mem.append(f"{dead.name}, my friend, is gone. I feel the loss deeply.")
        elif valence == "rival":
            mem.append(f"{dead.name} is gone. My rival's absence leaves me unexpectedly hollow.")
        else:
            mem.append(f"{dead.name} is gone. I feel the absence.")
        entity.memory = mem

        await broadcast("entity_grief", {
            "griever": entity.name,
            "lost": dead.name,
            "relationship": valence or "known",
            "tick": tick_n,
        })


# ─── Cultural beliefs ──────────────────────────────────────────────────────

def _update_cultural_beliefs(living: List[Entity], world_state: WorldState) -> None:
    zone_belief_counts: Dict[str, Dict[str, int]] = {}
    zone_belief_values: Dict[str, Dict[str, str]] = {}
    zone_pop: Dict[str, int] = {}

    for entity in living:
        z = entity.current_zone or "Garden"
        zone_pop[z] = zone_pop.get(z, 0) + 1
        for k, v in (entity.beliefs or {}).items():
            zone_belief_counts.setdefault(z, {})
            zone_belief_values.setdefault(z, {})
            zone_belief_counts[z][k] = zone_belief_counts[z].get(k, 0) + 1
            zone_belief_values[z][k] = str(v)

    cultural: Dict[str, Dict[str, str]] = {}
    for z, counts in zone_belief_counts.items():
        pop = zone_pop.get(z, 1)
        cultural[z] = {}
        for k, cnt in counts.items():
            if cnt > pop / 2:
                cultural[z][k] = zone_belief_values[z].get(k, "")

    world_state.cultural_beliefs = cultural


# ─── Start / stop ──────────────────────────────────────────────────────────

async def run_simulation() -> None:
    global _running
    _running = True
    async with async_session() as session:
        await seed_entities(session)
        await session.commit()
    logger.info("Simulation loop started.")
    while _running:
        try:
            await tick()
        except Exception as e:
            logger.error(f"Tick error: {e}", exc_info=True)
        await asyncio.sleep(TICK_INTERVAL)


async def start_simulation() -> None:
    global _sim_task
    if _sim_task is None or _sim_task.done():
        _sim_task = asyncio.create_task(run_simulation())


async def stop_simulation() -> None:
    global _running, _sim_task
    _running = False
    if _sim_task:
        _sim_task.cancel()
        try:
            await _sim_task
        except asyncio.CancelledError:
            pass
