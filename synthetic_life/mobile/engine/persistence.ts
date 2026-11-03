/**
 * UBERIS v2.0 — State & Settings Persistence
 *
 * Saves and loads full simulation state and player preferences
 * using AsyncStorage when available in React Native, with transparent
 * fallback to an in-memory dictionary for Node CLI testing and SSR.
 */

// Safe import of AsyncStorage with dynamic try/catch so Node CLI environments
// without React Native or when running from /tmp fall back seamlessly to memory
let AsyncStorage: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const mod = require('@react-native-async-storage/async-storage');
  AsyncStorage = mod && mod.default ? mod.default : mod;
} catch {
  AsyncStorage = null;
}
import { SimSettings, SimState } from './types';

const KEY_STATE = '@uberis/sim_state_v2';
const KEY_SETTINGS = '@uberis/sim_settings_v2';
const KEY_SAVED_AT = '@uberis/saved_at_v2';

export const DEFAULT_SETTINGS: SimSettings = {
  soundEnabled: true,
  hapticsEnabled: true,
  showSenseCones: false,
  showNames: true,
  showTrails: true,
  anthropicApiKey: '',
};

// In-memory fallback dictionary for Node CLI verification environments
const memoryStorage = new Map<string, string>();

async function safeGetItem(key: string): Promise<string | null> {
  try {
    if (AsyncStorage && typeof AsyncStorage.getItem === 'function') {
      const val = await AsyncStorage.getItem(key);
      if (val !== null) return val;
    }
  } catch {
    // Fall back to memoryStorage
  }
  return memoryStorage.get(key) || null;
}

async function safeSetItem(key: string, value: string): Promise<void> {
  try {
    if (AsyncStorage && typeof AsyncStorage.setItem === 'function') {
      await AsyncStorage.setItem(key, value);
    }
  } catch {
    // Fall back to memoryStorage
  }
  memoryStorage.set(key, value);
}

/**
 * Persists the entire simulation state to storage.
 */
export async function persistSimState(state: SimState): Promise<void> {
  try {
    const serialized = JSON.stringify(state);
    const nowStr = Date.now().toString();
    await safeSetItem(KEY_STATE, serialized);
    await safeSetItem(KEY_SAVED_AT, nowStr);
  } catch (err) {
    // Non-critical persistence failure
  }
}

/**
 * Loads the saved simulation state if available, alongside the timestamp of saving.
 */
export async function loadPersistedSimState(): Promise<{
  state: SimState;
  savedAt: number;
} | null> {
  try {
    const stateStr = await safeGetItem(KEY_STATE);
    const savedAtStr = await safeGetItem(KEY_SAVED_AT);

    if (!stateStr || !savedAtStr) return null;

    const state = JSON.parse(stateStr) as SimState;
    const savedAt = parseInt(savedAtStr, 10);
    return { state, savedAt };
  } catch (err) {
    return null;
  }
}

/**
 * Persists user simulation settings (audio, haptics, UI overlays, API keys).
 */
export async function persistSimSettings(settings: SimSettings): Promise<void> {
  try {
    await safeSetItem(KEY_SETTINGS, JSON.stringify(settings));
  } catch (err) {
    // Non-critical
  }
}

/**
 * Loads persisted settings or returns defaults.
 */
export async function loadPersistedSimSettings(): Promise<SimSettings> {
  try {
    const raw = await safeGetItem(KEY_SETTINGS);
    if (!raw) return { ...DEFAULT_SETTINGS };
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch (err) {
    return { ...DEFAULT_SETTINGS };
  }
}

// Backward-compatible alias exports
export const persistState = persistSimState;
export const loadPersistedState = loadPersistedSimState;
