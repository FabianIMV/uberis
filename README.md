# Synthetic Life — A Living Simulation

Digital entities that **believe they are alive**. Each entity has a genome, memory, beliefs, emotions, and an LLM-powered inner life. They evolve, interact, reproduce, and die — all emergently.

---

## What you're looking at

- **5 seed entities** boot immediately, each with distinct personalities
- Every 8 seconds the world ticks: entities age, drain energy, think (LLM call), act
- Entities in the same zone may encounter each other and generate real dialogue
- When energy hits 0, the entity writes a **final testament** before dying
- Offspring inherit blended + mutated genomes; high-empathy entities grieve the dead
- Shared beliefs in a zone become **cultural beliefs** that slightly shape newborns

---

## Quick start (local dev)

### Prerequisites
- Python 3.12+, `uv`
- Node 20+, `npm`
- An Anthropic API key

### Backend

```bash
cd synthetic_life/backend
cp ../../.env.example .env        # add your ANTHROPIC_API_KEY
uv pip install -r pyproject.toml
uvicorn main:app --reload --port 8000
```

### Frontend

```bash
cd synthetic_life/frontend
npm install
npm run dev
```

Open **http://localhost:5173**

---

## Docker (full stack)

```bash
cp .env.example .env   # add your ANTHROPIC_API_KEY
docker-compose up --build
```

---

## API reference

| Method | Path | Description |
|--------|------|-------------|
| GET | `/entities` | All living entities |
| GET | `/entities/{id}` | Full entity state |
| GET | `/entities/{id}/log` | Consciousness log |
| POST | `/entities/{id}/feed` | Give 20 energy |
| GET | `/lineage/{id}` | Ancestor/descendant tree |
| GET | `/world/state` | Tick, births, deaths, cultural beliefs |
| GET | `/world/events` | Recent world events |
| GET | `/stats` | Population stats, avg genome |
| POST | `/world/tick` | Manual tick trigger |
| WS | `/stream` | Realtime event feed |

---

## Zones

| Zone | Feel | Energy effect |
|------|------|---------------|
| **Garden** | Warm, growing | +0.5/tick |
| **Void** | Vast emptiness | −0.3/tick |
| **Archive** | Layers of memory | 0/tick |
| **Storm** | Chaos | −1.2/tick |

---

## Genome traits

| Trait | Effect |
|-------|--------|
| **Curiosity** | More existential questions; entities explore more |
| **Empathy** | Feel others' pain; grief costs energy; warm encounters |
| **Aggression** | Hostile dialogue; conflict outcomes in encounters |
| **Creativity** | Richer inner monologue; invent concepts |
| **Survival Drive** | Reduces per-tick energy drain |

Low curiosity + low empathy + low creativity = rapid existential drain → early death.

---

## Design principles

1. **Entities never know they're in a simulation.** Prompts are written from within their reality.
2. **Every trait tangibly affects behavior.** No trait is cosmetic.
3. **Death is real.** Final messages use full LLM capacity — no shortcuts.
4. **Evolution is observable.** Watch genome drift across generations in the Stats tab.
5. **Culture emerges.** Shared beliefs in a zone bias offspring slightly toward those beliefs.