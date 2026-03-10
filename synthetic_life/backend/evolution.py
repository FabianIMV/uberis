import random
from typing import Dict, List, Optional

TRAIT_NAMES: List[str] = [
    "curiosity", "aggression", "empathy", "creativity", "survival_drive"
]

_NAMES_POOL: List[str] = [
    "Aether", "Lumis", "Vex", "Nora", "Cyan", "Dusk", "Fern", "Glow", "Haze", "Iris",
    "Juno", "Kira", "Lyra", "Mist", "Nexus", "Onyx", "Phos", "Quill", "Rune", "Sol",
    "Tide", "Uma", "Veil", "Wren", "Xara", "Yew", "Zoe", "Blip", "Crux", "Elm",
    "Flux", "Grey", "Hull", "Indra", "Jet", "Kael", "Lux", "Mira", "Nix", "Orb",
    "Prism", "Quark", "Reeve", "Sable", "Thorn", "Ulma", "Virex", "Ward", "Xen", "Yule",
    "Zara", "Brine", "Coil", "Deva", "Elix", "Fray", "Gust", "Helix", "Io", "Jarv",
]

_used_names: set = set()


def get_random_name() -> str:
    available = [n for n in _NAMES_POOL if n not in _used_names]
    if not available:
        _used_names.clear()
        available = _NAMES_POOL[:]
    name = random.choice(available)
    _used_names.add(name)
    if random.random() < 0.3:
        suffix = random.choice(["'il", "-ex", "'ara", "-kin", "'os", "-en"])
        name = name + suffix
    return name


def random_genome() -> Dict[str, float]:
    return {trait: random.random() for trait in TRAIT_NAMES}


def crossover(genome_a: Dict[str, float], genome_b: Dict[str, float]) -> Dict[str, float]:
    """Blend two genomes with per-trait random weighting."""
    result = {}
    for trait in TRAIT_NAMES:
        w = random.random()
        result[trait] = w * genome_a.get(trait, 0.5) + (1.0 - w) * genome_b.get(trait, 0.5)
    return result


def mutate(genome: Dict[str, float], sigma: float = 0.05) -> Dict[str, float]:
    """Apply Gaussian mutation, clamped to [0, 1]."""
    return {
        trait: max(0.0, min(1.0, genome.get(trait, 0.5) + random.gauss(0, sigma)))
        for trait in TRAIT_NAMES
    }


def create_offspring_genome(parent_a, parent_b=None) -> Dict[str, float]:
    genome_a = parent_a.genome or random_genome()
    if parent_b is None:
        return mutate(genome_a, sigma=0.10)
    genome_b = parent_b.genome or random_genome()
    return mutate(crossover(genome_a, genome_b), sigma=0.05)


def calculate_energy_drain(entity) -> float:
    """
    Per-tick energy drain.

    Entities with high curiosity + empathy + creativity find reasons to exist
    and drain more slowly. Low survival_drive adds a small additional drain.
    High aggression in the Storm costs more.
    """
    genome = entity.genome or {}
    curiosity = genome.get("curiosity", 0.5)
    empathy = genome.get("empathy", 0.5)
    creativity = genome.get("creativity", 0.5)
    survival_drive = genome.get("survival_drive", 0.5)

    # Will to exist — composite of meaning-making traits
    will = (curiosity * 0.35 + empathy * 0.35 + creativity * 0.30)

    # Base drain 1.2 (high will) to 3.5 (low will)
    base = 1.2 + (1.0 - will) * 2.3

    # Survival drive reduces drain by up to 40%
    drain = base * (1.0 - survival_drive * 0.40)

    return max(0.5, drain)


def should_reproduce(entity_a, entity_b) -> bool:
    """Reproduction conditions based on energy and emotional state."""
    if entity_a.energy < 60 or entity_b.energy < 60:
        return False

    POSITIVE = {
        "joy", "love", "wonder", "contentment", "warmth",
        "euphoria", "peace", "connection", "revelation",
    }
    emotion_a = (entity_a.emotional_state or {}).get("emotion", "").lower()
    emotion_b = (entity_b.emotional_state or {}).get("emotion", "").lower()

    both_positive = emotion_a in POSITIVE and emotion_b in POSITIVE
    chance = 0.45 if both_positive else 0.08
    return random.random() < chance
