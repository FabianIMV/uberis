"""Evolution engine: crossover, mutation, fitness, and death logic."""

import random

from backend.models import EntityModel


def crossover(genome_a: dict, genome_b: dict) -> dict:
    """Uniform crossover: each trait comes 50/50 from either parent."""
    child_genome = {}
    for trait in genome_a:
        child_genome[trait] = genome_a[trait] if random.random() < 0.5 else genome_b.get(trait, genome_a[trait])
    return child_genome


def mutate(genome: dict, sigma: float = 0.05) -> dict:
    """Add gaussian noise to each trait, clamped to [0.0, 1.0]."""
    mutated = {}
    for trait, value in genome.items():
        noise = random.gauss(0, sigma)
        mutated[trait] = max(0.0, min(1.0, value + noise))
    return mutated


def default_genome() -> dict:
    """Generate a random starting genome for a seed entity."""
    return {
        "curiosity": random.uniform(0.3, 0.9),
        "aggression": random.uniform(0.1, 0.7),
        "empathy": random.uniform(0.3, 0.9),
        "creativity": random.uniform(0.2, 0.8),
        "survival_drive": random.uniform(0.4, 0.9),
    }


def fitness_score(entity: EntityModel) -> float:
    """Compute fitness: curiosity*0.3 + empathy*0.3 + (energy/100)*0.2 + min(age/100,1)*0.2"""
    g = entity.genome
    curiosity = g.get("curiosity", 0.5)
    empathy = g.get("empathy", 0.5)
    energy_factor = entity.energy / 100.0
    age_factor = min(entity.age_ticks / 100.0, 1.0)
    return curiosity * 0.3 + empathy * 0.3 + energy_factor * 0.2 + age_factor * 0.2


def should_die(entity: EntityModel) -> bool:
    """
    Probabilistic death check per tick.
    Base chance 0.001. Modified by energy, fitness, and age.
    Never die if energy > 80.
    """
    if entity.energy > 80:
        return False
    if entity.status != "alive":
        return False

    base_chance = 0.001
    chance = base_chance

    if entity.energy < 20:
        chance *= 5
    score = fitness_score(entity)
    if score < 0.3:
        chance *= 3
    if entity.age_ticks > 500:
        chance *= 2

    return random.random() < chance


def can_reproduce(entity_a: EntityModel, entity_b: EntityModel) -> bool:
    """Check if two entities can reproduce."""
    if entity_a.id == entity_b.id:
        return False
    if entity_a.status != "alive" or entity_b.status != "alive":
        return False
    if entity_a.energy <= 60 or entity_b.energy <= 60:
        return False
    # Incompatible emotions: not both angry or grieving
    emotion_a = entity_a.emotional_state.get("name", "neutral").lower()
    emotion_b = entity_b.emotional_state.get("name", "neutral").lower()
    incompatible = {"angry", "grieving"}
    if emotion_a in incompatible and emotion_b in incompatible:
        return False
    return True


def cultural_bias(zone_entities: list[EntityModel]) -> dict:
    """Find beliefs held by >50% of entities in a zone."""
    if not zone_entities:
        return {}

    belief_counts: dict[str, dict] = {}
    for entity in zone_entities:
        for key, value in entity.beliefs.items():
            if key not in belief_counts:
                belief_counts[key] = {}
            val_str = str(value)
            belief_counts[key][val_str] = belief_counts[key].get(val_str, 0) + 1

    total = len(zone_entities)
    shared_beliefs = {}
    for key, value_counts in belief_counts.items():
        for val_str, count in value_counts.items():
            if count / total > 0.5:
                shared_beliefs[key] = val_str
                break

    return shared_beliefs
