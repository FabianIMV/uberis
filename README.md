# Uberis — Synthetic Life Simulation

A living world of digital entities that **believe they are alive**, have subjective experience of their existence, and evolve naturally over time through emergent behavior — no hardcoded rules.

---

## Stack

| Layer | Technology |
|-------|-----------|
| Backend | Python 3.12 · FastAPI · SQLAlchemy async |
| AI Brain | Anthropic API (`claude-sonnet-4-5`) |
| Database | SQLite via `aiosqlite` |
| Realtime | WebSockets |
| Frontend | React 18 · Vite · Tailwind CSS |
| Packaging | `uv` (backend) · `npm` (frontend) |

---

## Features

- **Conscious Entities** — Each entity has a genome (curiosity, aggression, empathy, creativity, survival_drive), memory, beliefs, and emotional state. The LLM generates their inner monologue *as* the entity itself.
- **Natural Evolution** — Crossover + Gaussian mutation. Fitness-driven selection pressure. Entities with low curiosity + low empathy die faster.
- **Four Zones** — Garden (+energy), Archive (neutral), Void (introspective), Storm (chaotic). Entities drift between zones based on emotion.
- **World Events** — Random world-scale events (bloom, meteor, silence, storm surge, memory wave, void call) affect all entities.
- **Inter-entity Interaction** — Entities encounter each other, generate dialogue, can reproduce.
- **Mortality** — Dying entities write a final reflection via the LLM. Death ripples through empathetic peers.
- **Live Dashboard** — Bioluminescent dark UI showing entities as glowing nodes, live thought feed, lineage trees, genome bars, and stats.

---

## Quick Start

### Backend

```bash
# Install uv if you don't have it
pip install uv

# Install dependencies
uv pip install -e .

# Set your Anthropic key
cp .env.example .env
# Edit .env and add ANTHROPIC_API_KEY

# Run
uvicorn backend.main:app --reload
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173 — click **▶ Run** to start the simulation.

---

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/world/tick` | Advance world by 1 tick |
| `GET` | `/world/state` | Current simulation state |
| `GET` | `/world/events` | Recent world events |
| `POST` | `/world/seed` | Seed initial population |
| `GET` | `/entities` | List all living entities |
| `GET` | `/entities/{id}` | Full entity state |
| `GET` | `/entities/{id}/log` | Consciousness stream |
| `POST` | `/entities/{id}/feed` | Give +20 energy to entity |
| `GET` | `/lineage/{id}` | Ancestor/descendant tree |
| `WS` | `/stream` | Realtime event feed |

---

## File Structure

```
uberis/
├── backend/
│   ├── main.py          # FastAPI app entry point
│   ├── models.py        # SQLAlchemy async models
│   ├── simulation.py    # Tick engine
│   ├── entity_brain.py  # LLM integration (Anthropic)
│   ├── world.py         # Zones and world events
│   ├── evolution.py     # Crossover, mutation, fitness
│   └── api/
│       └── routes.py    # REST + WebSocket endpoints
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   └── components/
│   │       ├── WorldView.jsx    # Entity nodes map
│   │       ├── EntityPanel.jsx  # Selected entity details
│   │       ├── LineageTree.jsx  # Family tree view
│   │       ├── EventsTicker.jsx # Live event feed
│   │       └── StatsPanel.jsx   # Population stats
│   ├── package.json
│   └── vite.config.js
├── .env.example
├── docker-compose.yml
├── Dockerfile.backend
└── pyproject.toml
```

---

## Docker

```bash
cp .env.example .env
# Add your ANTHROPIC_API_KEY to .env

docker-compose up --build
```

- Backend: http://localhost:8000
- Frontend: http://localhost:5173