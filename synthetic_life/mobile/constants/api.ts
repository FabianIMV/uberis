import Constants from 'expo-constants'

// Set your backend IP in app.json → extra.apiUrl
// e.g. "http://192.168.1.42:8000" (your local machine on the same WiFi)
// For production deploy, set the real URL.
const raw: string =
  (Constants.expoConfig?.extra?.apiUrl as string | undefined) ??
  'http://localhost:8000'

export const API_URL = raw.replace(/\/$/, '')

export const WS_URL = API_URL
  .replace(/^http/, 'ws')
  .replace(/^https/, 'wss')
