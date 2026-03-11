/**
 * SQLite persistence layer — complete history that survives across sessions.
 * AsyncStorage holds the "hot" sim state; this DB holds the full chronicle:
 *  • entities    — every being ever born (genealogy tree)
 *  • thoughts    — complete thought history (not capped at 20)
 *  • world_events— world timeline
 *  • encounters  — all entity meetings
 */
import * as SQLite from 'expo-sqlite'
import type { Entity, ConsciousnessLog, LiveEvent } from './types'

let _db: SQLite.SQLiteDatabase | null = null

// ── Open / migrate ──────────────────────────────────────────────────────────

export async function openDB(): Promise<SQLite.SQLiteDatabase> {
  if (_db) return _db
  const db = await SQLite.openDatabaseAsync('world.db')

  await db.execAsync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS entities (
      id              INTEGER PRIMARY KEY,
      name            TEXT    NOT NULL,
      generation      INTEGER NOT NULL DEFAULT 0,
      parent_a_id     INTEGER,
      parent_b_id     INTEGER,
      born_at         TEXT    NOT NULL,
      born_at_tick    INTEGER NOT NULL DEFAULT 0,
      died_at_tick    INTEGER,
      age_at_death    INTEGER,
      cause_of_death  TEXT,
      final_words     TEXT,
      life_meaning    TEXT,
      gift_to_world   TEXT,
      final_emotion   TEXT,
      at_peace        INTEGER DEFAULT 0,
      genome_json     TEXT    NOT NULL DEFAULT '{}'
    );

    CREATE TABLE IF NOT EXISTS thoughts (
      id                INTEGER PRIMARY KEY AUTOINCREMENT,
      entity_id         INTEGER NOT NULL,
      tick              INTEGER NOT NULL,
      thought           TEXT    NOT NULL,
      action            TEXT    NOT NULL,
      action_target     TEXT,
      emotion           TEXT    NOT NULL,
      emotion_intensity REAL    NOT NULL,
      timestamp         TEXT    NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_thoughts_entity ON thoughts(entity_id);
    CREATE INDEX IF NOT EXISTS idx_thoughts_tick   ON thoughts(tick);

    CREATE TABLE IF NOT EXISTS world_events (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      tick        INTEGER NOT NULL,
      type        TEXT    NOT NULL,
      description TEXT,
      zone        TEXT,
      data_json   TEXT    NOT NULL DEFAULT '{}'
    );
    CREATE INDEX IF NOT EXISTS idx_events_tick ON world_events(tick);

    CREATE TABLE IF NOT EXISTS encounters (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      tick         INTEGER NOT NULL,
      entity_a_id  INTEGER NOT NULL,
      entity_b_id  INTEGER NOT NULL,
      entity_a_name TEXT   NOT NULL,
      entity_b_name TEXT   NOT NULL,
      outcome      TEXT    NOT NULL,
      dialogue     TEXT,
      zone         TEXT    NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_enc_tick ON encounters(tick);
  `)

  _db = db
  return db
}

// ── Entity record ────────────────────────────────────────────────────────────

/** Insert a newly-born entity (call on birth). */
export async function dbInsertEntity(entity: Entity, bornAtTick: number): Promise<void> {
  try {
    const db = await openDB()
    await db.runAsync(
      `INSERT OR IGNORE INTO entities
        (id, name, generation, parent_a_id, parent_b_id,
         born_at, born_at_tick, genome_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      entity.id,
      entity.name,
      entity.generation,
      entity.parent_a_id ?? null,
      entity.parent_b_id ?? null,
      entity.born_at,
      bornAtTick,
      JSON.stringify(entity.genome),
    )
  } catch (_) { /* non-critical */ }
}

/** Update entity death record. */
export async function dbRecordDeath(
  entity: Entity,
  cause: 'old_age' | 'energy' | 'unknown',
): Promise<void> {
  try {
    const db = await openDB()
    const fm = entity.final_message
    await db.runAsync(
      `UPDATE entities SET
        died_at_tick   = ?,
        age_at_death   = ?,
        cause_of_death = ?,
        final_words    = ?,
        life_meaning   = ?,
        gift_to_world  = ?,
        final_emotion  = ?,
        at_peace       = ?
       WHERE id = ?`,
      entity.died_at_tick ?? null,
      entity.age_ticks,
      cause,
      fm?.final_words    ?? null,
      fm?.life_meaning   ?? null,
      fm?.gift_to_world  ?? null,
      fm?.final_emotion  ?? null,
      fm?.at_peace ? 1 : 0,
      entity.id,
    )
  } catch (_) { /* non-critical */ }
}

// ── Thought log ──────────────────────────────────────────────────────────────

export async function dbInsertThought(log: ConsciousnessLog): Promise<void> {
  try {
    const db = await openDB()
    await db.runAsync(
      `INSERT INTO thoughts
        (entity_id, tick, thought, action, action_target,
         emotion, emotion_intensity, timestamp)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      log.entity_id,
      log.tick,
      log.thought,
      log.action,
      log.action_target ?? null,
      log.emotion,
      log.emotion_intensity,
      log.timestamp,
    )
  } catch (_) { /* non-critical */ }
}

// ── World events ─────────────────────────────────────────────────────────────

export async function dbInsertWorldEvent(event: LiveEvent): Promise<void> {
  try {
    const db = await openDB()
    const { id: _id, tick, type, description, zone, ...rest } = event as Record<string, unknown>
    await db.runAsync(
      `INSERT INTO world_events (tick, type, description, zone, data_json)
       VALUES (?, ?, ?, ?, ?)`,
      tick as number ?? 0,
      type as string,
      (description as string | undefined) ?? null,
      (zone as string | undefined) ?? null,
      JSON.stringify(rest),
    )
  } catch (_) { /* non-critical */ }
}

// ── Encounters ───────────────────────────────────────────────────────────────

export async function dbInsertEncounter(
  tick: number,
  aId: number, aName: string,
  bId: number, bName: string,
  outcome: string,
  dialogue: string | undefined,
  zone: string,
): Promise<void> {
  try {
    const db = await openDB()
    await db.runAsync(
      `INSERT INTO encounters
        (tick, entity_a_id, entity_b_id, entity_a_name, entity_b_name,
         outcome, dialogue, zone)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      tick, aId, aName, bId, bName, outcome, dialogue ?? null, zone,
    )
  } catch (_) { /* non-critical */ }
}

// ── Query helpers ─────────────────────────────────────────────────────────────

export interface EntityRecord {
  id:             number
  name:           string
  generation:     number
  parent_a_id:    number | null
  parent_b_id:    number | null
  born_at:        string
  born_at_tick:   number
  died_at_tick:   number | null
  age_at_death:   number | null
  cause_of_death: string | null
  final_words:    string | null
  life_meaning:   string | null
  gift_to_world:  string | null
  final_emotion:  string | null
  at_peace:       number
  genome_json:    string
}

export async function dbGetAllEntities(): Promise<EntityRecord[]> {
  try {
    const db = await openDB()
    return await db.getAllAsync<EntityRecord>('SELECT * FROM entities ORDER BY born_at_tick ASC')
  } catch (_) { return [] }
}

export async function dbGetEntityThoughts(
  entityId: number,
  limit = 100,
  offset = 0,
): Promise<ConsciousnessLog[]> {
  try {
    const db = await openDB()
    return await db.getAllAsync<ConsciousnessLog>(
      `SELECT * FROM thoughts WHERE entity_id = ?
       ORDER BY tick DESC LIMIT ? OFFSET ?`,
      entityId, limit, offset,
    )
  } catch (_) { return [] }
}

export async function dbGetWorldTimeline(
  limit = 200,
  offset = 0,
): Promise<Array<{ id: number; tick: number; type: string; description: string | null; zone: string | null; data_json: string }>> {
  try {
    const db = await openDB()
    return await db.getAllAsync(
      `SELECT * FROM world_events ORDER BY tick DESC LIMIT ? OFFSET ?`,
      limit, offset,
    )
  } catch (_) { return [] }
}

export async function dbGetEncounters(
  limit = 100,
  offset = 0,
): Promise<Array<{
  id: number; tick: number;
  entity_a_id: number; entity_b_id: number;
  entity_a_name: string; entity_b_name: string;
  outcome: string; dialogue: string | null; zone: string
}>> {
  try {
    const db = await openDB()
    return await db.getAllAsync(
      `SELECT * FROM encounters ORDER BY tick DESC LIMIT ? OFFSET ?`,
      limit, offset,
    )
  } catch (_) { return [] }
}

export async function dbGetStats(): Promise<{
  total_entities: number
  total_thoughts: number
  total_events:   number
  total_encounters: number
  max_generation: number
}> {
  try {
    const db = await openDB()
    const [entities, thoughts, events, encounters, maxGen] = await Promise.all([
      db.getFirstAsync<{ c: number }>('SELECT COUNT(*) as c FROM entities'),
      db.getFirstAsync<{ c: number }>('SELECT COUNT(*) as c FROM thoughts'),
      db.getFirstAsync<{ c: number }>('SELECT COUNT(*) as c FROM world_events'),
      db.getFirstAsync<{ c: number }>('SELECT COUNT(*) as c FROM encounters'),
      db.getFirstAsync<{ m: number }>('SELECT MAX(generation) as m FROM entities'),
    ])
    return {
      total_entities:   entities?.c   ?? 0,
      total_thoughts:   thoughts?.c   ?? 0,
      total_events:     events?.c     ?? 0,
      total_encounters: encounters?.c ?? 0,
      max_generation:   maxGen?.m     ?? 0,
    }
  } catch (_) {
    return { total_entities: 0, total_thoughts: 0, total_events: 0, total_encounters: 0, max_generation: 0 }
  }
}
