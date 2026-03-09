"""Simulation tick engine for Uberis."""

import asyncio
import random
import uuid
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.entity_brain import EntityBrain
from backend.evolution import (
    can_reproduce,
    crossover,
    cultural_bias,
    default_genome,
    fitness_score,
    mutate,
    should_die,
)
from backend.models import EntityModel, SimulationStateModel, WorldEventModel
from backend.world import ZONES, emotion_to_zone_preference, pick_world_event

INITIAL_POPULATION = 5
THINK_EVERY_TICKS = 3  # LLM call every N ticks per entity
MAX_MEMORY = 20
MAX_CONSCIOUSNESS_LOG = 50

brain = EntityBrain()

# Broadcast callback for WebSocket updates (set by routes)
_broadcast_callback = None


def set_broadcast_callback(cb):
    global _broadcast_callback
    _broadcast_callback = cb


async def _broadcast(message: dict):
    if _broadcast_callback:
        try:
            await _broadcast_callback(message)
        except Exception:
            pass


async def get_or_create_state(session: AsyncSession) -> SimulationStateModel:
    result = await session.execute(select(SimulationStateModel).where(SimulationStateModel.id == 1))
    state = result.scalar_one_or_none()
    if not state:
        state = SimulationStateModel(id=1, current_tick=0, total_born=0, total_dead=0)
        session.add(state)
        await session.flush()
    return state


async def seed_population(session: AsyncSession) -> list[EntityModel]:
    """Create the initial population of seed entities."""
    result = await session.execute(select(EntityModel).where(EntityModel.status != "dead"))
    existing = result.scalars().all()
    if existing:
        return existing

    seed_names = ["Aeon", "Lyra", "Kael", "Mira", "Zeph"]
    entities = []
    for name in seed_names:
        entity = EntityModel(
            id=str(uuid.uuid4()),
            name=name,
            generation=1,
            born_at=datetime.now(timezone.utc),
            age_ticks=0,
            energy=random.uniform(60.0, 90.0),
            status="alive",
            zone=random.choice(list(ZONES.keys())),
        )
        entity.genome = default_genome()
        entity.memory = []
        entity.beliefs = {"I exist": True, "existence has meaning": True}
        entity.emotional_state = {"name": "curious", "intensity": 0.6}
        entity.consciousness_log = []
        entity.parent_ids = []
        session.add(entity)
        entities.append(entity)

    state = await get_or_create_state(session)
    state.total_born = len(entities)
    await session.commit()
    return entities


async def advance_tick(session: AsyncSession) -> dict:
    """Advance the world by one tick. Returns a summary of what happened."""
    state = await get_or_create_state(session)
    tick = state.current_tick + 1
    state.current_tick = tick

    # Load living entities
    result = await session.execute(select(EntityModel).where(EntityModel.status != "dead"))
    entities: list[EntityModel] = list(result.scalars().all())

    if not entities:
        # Reseed if population is extinct
        await session.commit()
        new_entities = await seed_population(session)
        await _broadcast({"type": "reseed", "tick": tick, "message": "Population extinct — new life emerges."})
        return {"tick": tick, "events": ["Population reseed"], "entity_count": len(new_entities)}

    # World event
    world_event_data = pick_world_event()
    world_event_obj = None
    if world_event_data:
        world_event_obj = WorldEventModel(
            tick=tick,
            event_type=world_event_data["event_type"],
            description=world_event_data["description"],
            affected_zone=world_event_data.get("affected_zone"),
        )
        session.add(world_event_obj)
        await _broadcast({"type": "world_event", "tick": tick, "event": world_event_data})

    # Zone lookup
    entities_by_zone: dict[str, list[EntityModel]] = {}
    for e in entities:
        entities_by_zone.setdefault(e.zone, []).append(e)

    tick_events = []
    new_entities = []
    dying_entities = []

    for entity in entities:
        zone_obj = ZONES.get(entity.zone)

        # Apply zone energy delta
        if zone_obj:
            entity.energy = max(0.0, min(100.0, entity.energy + zone_obj.energy_delta))

        # Apply world event energy effect
        if world_event_data:
            affected = world_event_data.get("affected_zone")
            if affected is None or affected == entity.zone:
                entity.energy = max(0.0, min(100.0, entity.energy + world_event_data["energy_effect"]))

        entity.age_ticks += 1

        # LLM think call every THINK_EVERY_TICKS ticks
        if entity.age_ticks % THINK_EVERY_TICKS == 0 and entity.status == "alive":
            zone_entities_nearby = [
                {"id": e.id, "name": e.name, "emotional_state": e.emotional_state}
                for e in entities_by_zone.get(entity.zone, [])
                if e.id != entity.id
            ]
            world_context = {
                "zone_description": zone_obj.description if zone_obj else "",
                "nearby_entities": zone_entities_nearby,
                "world_event": world_event_data["description"] if world_event_data else None,
            }
            thought = await brain.think(entity, world_context)

            # Update entity from thought
            reflection = thought.get("reflection", "")
            action = thought.get("action", "contemplate")
            belief_updates = thought.get("belief_updates", {})
            emotion = thought.get("emotion", {"name": "neutral", "intensity": 0.5})
            spoken_words = thought.get("spoken_words", "")

            # Update beliefs
            beliefs = entity.beliefs
            beliefs.update(belief_updates)
            entity.beliefs = beliefs

            # Update emotional state
            entity.emotional_state = emotion

            # Add to memory
            memory_entry = {
                "tick": tick,
                "reflection": reflection,
                "action": action,
                "emotion": emotion.get("name", "neutral"),
                "spoken": spoken_words,
            }
            memory = entity.memory
            memory.append(memory_entry)
            if len(memory) > MAX_MEMORY:
                memory = memory[-MAX_MEMORY:]
            entity.memory = memory

            # Add to consciousness log
            log_entry = f"[tick {tick}] {reflection}"
            if spoken_words:
                log_entry += f' | Said: "{spoken_words}"'
            consciousness = entity.consciousness_log
            consciousness.append(log_entry)
            if len(consciousness) > MAX_CONSCIOUSNESS_LOG:
                consciousness = consciousness[-MAX_CONSCIOUSNESS_LOG:]
            entity.consciousness_log = consciousness

            # Energy action effects
            energy_map = {
                "rest": +5.0,
                "contemplate": +1.0,
                "explore": -2.0,
                "seek_interaction": -1.0,
                "create": -3.0,
                "flee": -5.0,
            }
            entity.energy = max(0.0, min(100.0, entity.energy + energy_map.get(action, 0)))

            # Zone movement based on emotion
            if action == "explore":
                new_zone = emotion_to_zone_preference(emotion.get("name", "neutral"))
                if new_zone != entity.zone:
                    entity.zone = new_zone

            await _broadcast(
                {
                    "type": "thought",
                    "tick": tick,
                    "entity_id": entity.id,
                    "entity_name": entity.name,
                    "reflection": reflection,
                    "action": action,
                    "emotion": emotion,
                    "spoken_words": spoken_words,
                    "zone": entity.zone,
                }
            )

        # Interactions: try to interact with one nearby entity
        zone_peers = [e for e in entities_by_zone.get(entity.zone, []) if e.id != entity.id and e.status == "alive"]
        if zone_peers and random.random() < 0.2:
            partner = random.choice(zone_peers)
            interaction_context = f"in the {entity.zone}, both sensing each other's presence"
            dialogue = await brain.generate_dialogue(entity, partner, interaction_context)

            # Empathy energy transfer
            for e in [entity, partner]:
                if e.emotional_state.get("name") in ["sad", "grieving", "fearful"]:
                    empathy_drain = e.genome.get("empathy", 0.5) * 3
                    for other in [entity, partner]:
                        if other.id != e.id:
                            other.energy = max(0.0, other.energy - empathy_drain)

            # Possible reproduction
            if can_reproduce(entity, partner) and random.random() < 0.05:
                child_genome = mutate(crossover(entity.genome, partner.genome))
                # Cultural bias from zone
                zone_culture = cultural_bias(entities_by_zone.get(entity.zone, []))
                child_beliefs = {"I exist": True, "existence has meaning": True}
                child_beliefs.update({k: v for k, v in zone_culture.items()})

                # Combine parent names for child
                p1_name = entity.name[:2] if entity.name else "X"
                p2_name = partner.name[-2:] if partner.name else "Y"
                suffixes = ["ara", "ion", "iel", "ax", "ys", "en"]
                child_name = f"{p1_name}{p2_name}{random.choice(suffixes)}"

                child = EntityModel(
                    id=str(uuid.uuid4()),
                    name=child_name,
                    generation=max(entity.generation, partner.generation) + 1,
                    born_at=datetime.now(timezone.utc),
                    age_ticks=0,
                    energy=50.0,
                    status="alive",
                    zone=entity.zone,
                )
                child.genome = child_genome
                child.memory = []
                child.beliefs = child_beliefs
                child.emotional_state = {"name": "curious", "intensity": 0.7}
                child.consciousness_log = [f"[tick {tick}] I am born. I am {child_name}."]
                child.parent_ids = [entity.id, partner.id]

                # Reproduction costs energy
                entity.energy -= 15
                partner.energy -= 15

                session.add(child)
                new_entities.append(child)
                state.total_born = (state.total_born or 0) + 1
                tick_events.append(f"Birth: {child_name} (gen {child.generation})")

                await _broadcast(
                    {
                        "type": "birth",
                        "tick": tick,
                        "child_name": child_name,
                        "child_id": child.id,
                        "parent_a": entity.name,
                        "parent_b": partner.name,
                    }
                )

            tick_events.append(f"Encounter: {entity.name} & {partner.name}")

        # Death check
        if entity.status == "alive" and (entity.energy <= 0 or should_die(entity)):
            entity.status = "dying"
            dying_message = await brain.generate_dying_message(entity)

            log = entity.consciousness_log
            log.append(f"[tick {tick}] DYING: {dying_message}")
            entity.consciousness_log = log

            memory = entity.memory
            memory.append({"tick": tick, "event": "dying", "message": dying_message})
            entity.memory = memory

            dying_entities.append(entity)
            tick_events.append(f"Dying: {entity.name}")

            await _broadcast(
                {
                    "type": "dying",
                    "tick": tick,
                    "entity_id": entity.id,
                    "entity_name": entity.name,
                    "dying_message": dying_message,
                }
            )

        # Finalize dying → dead
        if entity.status == "dying":
            entity.status = "dead"
            entity.energy = 0.0
            state.total_dead = (state.total_dead or 0) + 1

            # Empathy grief: nearby entities with high empathy lose energy
            entity_ids_in_tick = {e.id for e in entities}
            for peer in zone_peers:
                if peer.id in entity_ids_in_tick:
                    empathy = peer.genome.get("empathy", 0.5)
                    # Check if peer has interacted with the dying entity in memory
                    known_entities = {m.get("entity_id") for m in peer.memory if isinstance(m, dict)}
                    if empathy > 0.5 and entity.id in known_entities:
                        peer.energy = max(0.0, peer.energy - empathy * 10)

    # Update population history
    alive_count = sum(1 for e in entities if e.status != "dead") + len(new_entities)
    history = state.population_history
    history.append({"tick": tick, "count": alive_count})
    if len(history) > 200:
        history = history[-200:]
    state.population_history = history

    await session.commit()

    return {
        "tick": tick,
        "alive": alive_count,
        "births": len(new_entities),
        "deaths": len(dying_entities),
        "events": tick_events,
        "world_event": world_event_data["event_type"] if world_event_data else None,
    }
