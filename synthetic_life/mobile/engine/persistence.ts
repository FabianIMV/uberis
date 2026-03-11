/**
 * Persistence — saves simulation state to AsyncStorage so the world
 * survives between app sessions. Time is tracked so catch-up ticks
 * can be simulated when the app re-opens.
 */
import AsyncStorage from '@react-native-async-storage/async-storage'
import type { SimState } from './simulation'

const KEY_STATE    = '@sim/state'
const KEY_SAVED_AT = '@sim/saved_at'

export async function persistState(state: SimState): Promise<void> {
  try {
    await AsyncStorage.multiSet([
      [KEY_STATE,    JSON.stringify(state)],
      [KEY_SAVED_AT, Date.now().toString()],
    ])
  } catch (_) { /* storage not critical */ }
}

export async function loadPersistedState(): Promise<{
  state:   SimState
  savedAt: number
} | null> {
  try {
    const pairs = await AsyncStorage.multiGet([KEY_STATE, KEY_SAVED_AT])
    const stateStr   = pairs[0][1]
    const savedAtStr = pairs[1][1]
    if (!stateStr || !savedAtStr) return null
    return {
      state:   JSON.parse(stateStr) as SimState,
      savedAt: parseInt(savedAtStr, 10),
    }
  } catch (_) {
    return null
  }
}
