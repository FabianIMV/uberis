import { Platform } from 'react-native';
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import { Directory, File, Paths } from 'expo-file-system';
import type { DivinePowerId, LiveEventCategory } from '@/engine/types';

export type BioSoundCue =
  | 'tap'
  | 'birth'
  | 'death'
  | 'speciation'
  | 'discovery'
  | 'nourish'
  | 'rain'
  | 'solar'
  | 'mutagen'
  | 'monolith'
  | 'lightning';

const SAMPLE_RATE = 22050;
const TWO_PI = Math.PI * 2;

function encodePcm16Wav(samples: Float32Array, sampleRate = SAMPLE_RATE): Uint8Array {
  const numSamples = samples.length;
  const dataBytes = numSamples * 2;
  const buffer = new ArrayBuffer(44 + dataBytes);
  const view = new DataView(buffer);

  const writeAscii = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeAscii(0, 'RIFF');
  view.setUint32(4, 36 + dataBytes, true);
  writeAscii(8, 'WAVE');
  writeAscii(12, 'fmt ');
  view.setUint32(16, 16, true); // PCM chunk size
  view.setUint16(20, 1, true); // Linear PCM
  view.setUint16(22, 1, true); // Mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // Byte rate
  view.setUint16(32, 2, true); // Block align
  view.setUint16(34, 16, true); // 16-bit
  writeAscii(36, 'data');
  view.setUint32(40, dataBytes, true);

  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    // Soft tanh-like saturation to prevent harsh clipping
    const x = samples[i];
    const soft = x / (1 + Math.abs(x) * 0.35);
    const clamped = Math.max(-1, Math.min(1, soft));
    view.setInt16(offset, Math.round(clamped * 32760), true);
    offset += 2;
  }

  return new Uint8Array(buffer);
}

const BASE64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function uint8ToBase64DataUri(bytes: Uint8Array): string {
  let out = 'data:audio/wav;base64,';
  const len = bytes.length;
  let i = 0;
  for (; i + 2 < len; i += 3) {
    const n = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2];
    out +=
      BASE64_CHARS[(n >> 18) & 63] +
      BASE64_CHARS[(n >> 12) & 63] +
      BASE64_CHARS[(n >> 6) & 63] +
      BASE64_CHARS[n & 63];
  }
  if (i < len) {
    const rem = len - i;
    if (rem === 1) {
      const n = bytes[i] << 16;
      out += BASE64_CHARS[(n >> 18) & 63] + BASE64_CHARS[(n >> 12) & 63] + '==';
    } else {
      const n = (bytes[i] << 16) | (bytes[i + 1] << 8);
      out +=
        BASE64_CHARS[(n >> 18) & 63] +
        BASE64_CHARS[(n >> 12) & 63] +
        BASE64_CHARS[(n >> 6) & 63] +
        '=';
    }
  }
  return out;
}

function adsrEnvelope(t: number, attack: number, decayRate: number, duration: number): number {
  if (t < 0 || t >= duration) return 0;
  const att = t < attack ? t / Math.max(0.001, attack) : 1;
  const relWindow = 0.045;
  const rel = t > duration - relWindow ? (duration - t) / relWindow : 1;
  return att * Math.exp(-decayRate * Math.max(0, t - attack)) * rel;
}

function synthesizeCueSamples(cue: BioSoundCue): Float32Array {
  switch (cue) {
    case 'tap': {
      const dur = 0.095;
      const out = new Float32Array(Math.floor(SAMPLE_RATE * dur));
      let phase = 0;
      for (let i = 0; i < out.length; i++) {
        const t = i / SAMPLE_RATE;
        const freq = 520 + 290 * Math.exp(-t * 28);
        phase += (TWO_PI * freq) / SAMPLE_RATE;
        const env = adsrEnvelope(t, 0.004, 28, dur);
        out[i] = (Math.sin(phase) * 0.7 + Math.sin(phase * 2.01) * 0.25) * env * 0.42;
      }
      return out;
    }

    case 'birth': {
      // Warm Lydian ascending bell chime: C5 - E5 - G5 - B5
      const dur = 0.56;
      const out = new Float32Array(Math.floor(SAMPLE_RATE * dur));
      const notes = [523.25, 659.25, 783.99, 987.77];
      for (let i = 0; i < out.length; i++) {
        const t = i / SAMPLE_RATE;
        let sample = 0;
        for (let n = 0; n < notes.length; n++) {
          const nt = t - n * 0.075;
          if (nt > 0) {
            const env = adsrEnvelope(nt, 0.008, 7.2, dur - n * 0.075);
            const f = notes[n];
            sample +=
              (Math.sin(TWO_PI * f * nt) * 0.68 +
                Math.sin(TWO_PI * f * 2 * nt) * 0.22 +
                Math.sin(TWO_PI * f * 3.01 * nt) * 0.1) *
              env;
          }
        }
        out[i] = sample * 0.32;
      }
      return out;
    }

    case 'death': {
      // Solemn ethereal minor cello pad descending A3 -> E3
      const dur = 0.78;
      const out = new Float32Array(Math.floor(SAMPLE_RATE * dur));
      let p1 = 0;
      let p2 = 0;
      for (let i = 0; i < out.length; i++) {
        const t = i / SAMPLE_RATE;
        const glide = 1 - 0.25 * Math.min(1, t / dur);
        p1 += (TWO_PI * 220 * glide) / SAMPLE_RATE;
        p2 += (TWO_PI * 329.63 * glide) / SAMPLE_RATE;
        const env = adsrEnvelope(t, 0.06, 3.1, dur);
        out[i] = (Math.sin(p1) * 0.65 + Math.sin(p2) * 0.35 + Math.sin(p1 * 0.5) * 0.3) * env * 0.36;
      }
      return out;
    }

    case 'speciation': {
      // Shimmering evolutionary chord bloom: D4 - F#4 - A4 - C#5 - E5 - A5
      const dur = 0.88;
      const out = new Float32Array(Math.floor(SAMPLE_RATE * dur));
      const notes = [293.66, 369.99, 440.0, 554.37, 659.25, 880.0];
      for (let i = 0; i < out.length; i++) {
        const t = i / SAMPLE_RATE;
        let s = 0;
        for (let n = 0; n < notes.length; n++) {
          const nt = t - n * 0.055;
          if (nt > 0) {
            const f = notes[n];
            const vib = 1 + 0.003 * Math.sin(TWO_PI * 5.5 * nt);
            const env = adsrEnvelope(nt, 0.02, 3.6, dur - n * 0.055);
            s += (Math.sin(TWO_PI * f * vib * nt) * 0.7 + Math.sin(TWO_PI * f * 2 * nt) * 0.22) * env;
          }
        }
        out[i] = s * 0.24;
      }
      return out;
    }

    case 'discovery': {
      // Resonant crystalline archive fifths: G4 -> D5 -> A5 -> B5
      const dur = 0.72;
      const out = new Float32Array(Math.floor(SAMPLE_RATE * dur));
      const notes = [392.0, 587.33, 880.0, 987.77];
      for (let i = 0; i < out.length; i++) {
        const t = i / SAMPLE_RATE;
        let s = 0;
        for (let n = 0; n < notes.length; n++) {
          const nt = t - n * 0.08;
          if (nt > 0) {
            const f = notes[n];
            const fm = Math.sin(TWO_PI * f * 2.0 * nt) * 0.45 * Math.exp(-nt * 9);
            const env = adsrEnvelope(nt, 0.006, 5.4, dur - n * 0.08);
            s += Math.sin(TWO_PI * f * nt + fm) * env;
          }
        }
        out[i] = s * 0.3;
      }
      return out;
    }

    case 'nourish': {
      // Golden nectar sparkle cascade
      const dur = 0.62;
      const out = new Float32Array(Math.floor(SAMPLE_RATE * dur));
      const notes = [440.0, 554.37, 659.25, 880.0, 1108.73];
      for (let i = 0; i < out.length; i++) {
        const t = i / SAMPLE_RATE;
        let s = 0;
        for (let n = 0; n < notes.length; n++) {
          const nt = t - n * 0.052;
          if (nt > 0) {
            const env = adsrEnvelope(nt, 0.006, 6.8, dur - n * 0.052);
            s +=
              (Math.sin(TWO_PI * notes[n] * nt) * 0.75 +
                Math.sin(TWO_PI * notes[n] * 2.0 * nt) * 0.25) *
              env;
          }
        }
        out[i] = s * 0.28;
      }
      return out;
    }

    case 'rain': {
      // Gentle filtered raindrop shimmer + soft aquatic D4/A4 fifth
      const dur = 0.65;
      const out = new Float32Array(Math.floor(SAMPLE_RATE * dur));
      let lpNoise = 0;
      let seed = 1337;
      for (let i = 0; i < out.length; i++) {
        const t = i / SAMPLE_RATE;
        seed = (seed * 16807) % 2147483647;
        const white = (seed / 1073741823.5) - 1;
        lpNoise = lpNoise * 0.86 + white * 0.14;
        const env = adsrEnvelope(t, 0.03, 3.8, dur);
        const drop1 = t > 0.08 ? Math.sin(TWO_PI * 740 * (t - 0.08)) * Math.exp(-(t - 0.08) * 22) : 0;
        const drop2 = t > 0.22 ? Math.sin(TWO_PI * 987 * (t - 0.22)) * Math.exp(-(t - 0.22) * 22) : 0;
        const pad = Math.sin(TWO_PI * 293.66 * t) * 0.4 + Math.sin(TWO_PI * 440.0 * t) * 0.35;
        out[i] = (lpNoise * 0.48 + pad * 0.42) * env * 0.38 + (drop1 + drop2) * 0.18;
      }
      return out;
    }

    case 'solar': {
      // Warm golden harmonic swell C4 + G4 + B4 + E5
      const dur = 0.7;
      const out = new Float32Array(Math.floor(SAMPLE_RATE * dur));
      const chord = [261.63, 392.0, 493.88, 659.25];
      for (let i = 0; i < out.length; i++) {
        const t = i / SAMPLE_RATE;
        const env = adsrEnvelope(t, 0.07, 3.1, dur);
        let s = 0;
        for (let k = 0; k < chord.length; k++) {
          s += Math.sin(TWO_PI * chord[k] * t + 0.2 * Math.sin(TWO_PI * 3 * t)) * (0.35 - k * 0.04);
        }
        out[i] = s * env * 0.55;
      }
      return out;
    }

    case 'mutagen': {
      // Cosmic FM bioluminescent spiral
      const dur = 0.66;
      const out = new Float32Array(Math.floor(SAMPLE_RATE * dur));
      let phase = 0;
      for (let i = 0; i < out.length; i++) {
        const t = i / SAMPLE_RATE;
        const carrier = 310 + 240 * Math.sin(TWO_PI * 6.5 * t) * Math.exp(-t * 1.8) + t * 280;
        const mod = Math.sin(TWO_PI * 19 * t) * 1.6 * Math.exp(-t * 2.5);
        phase += (TWO_PI * carrier) / SAMPLE_RATE;
        const env = adsrEnvelope(t, 0.015, 3.6, dur);
        out[i] = Math.sin(phase + mod) * env * 0.36;
      }
      return out;
    }

    case 'monolith': {
      // Deep resonant stone-crystal sub-fifth C2 + G2 + C4 + G4
      const dur = 0.88;
      const out = new Float32Array(Math.floor(SAMPLE_RATE * dur));
      for (let i = 0; i < out.length; i++) {
        const t = i / SAMPLE_RATE;
        const env = adsrEnvelope(t, 0.025, 2.8, dur);
        const sub = Math.sin(TWO_PI * 65.41 * t) * 0.55 + Math.sin(TWO_PI * 98.0 * t) * 0.42;
        const crystal =
          Math.sin(TWO_PI * 261.63 * t + Math.sin(TWO_PI * 523.25 * t) * 0.4 * Math.exp(-t * 5)) *
          0.38;
        out[i] = (sub + crystal) * env * 0.48;
      }
      return out;
    }

    case 'lightning': {
      // Electric snap transient + sub-thunder boom
      const dur = 0.72;
      const out = new Float32Array(Math.floor(SAMPLE_RATE * dur));
      let phase = 0;
      let seed = 9001;
      let lp = 0;
      for (let i = 0; i < out.length; i++) {
        const t = i / SAMPLE_RATE;
        seed = (seed * 16807) % 2147483647;
        const noise = seed / 1073741823.5 - 1;
        lp = lp * 0.78 + noise * 0.22;
        const boomFreq = 42 + 160 * Math.exp(-t * 16);
        phase += (TWO_PI * boomFreq) / SAMPLE_RATE;
        const snapEnv = Math.exp(-t * 32);
        const boomEnv = adsrEnvelope(t, 0.004, 4.2, dur);
        out[i] = (noise * 0.55 * snapEnv + (Math.sin(phase) * 0.7 + lp * 0.45) * boomEnv) * 0.52;
      }
      return out;
    }
  }
}

function synthesizeAmbientDroneLoop(): Float32Array {
  // Exact 6.0-second phase-continuous generative harmonic pad loop
  const dur = 6.0;
  const totalSamples = Math.floor(SAMPLE_RATE * dur);
  const out = new Float32Array(totalSamples);
  // Quantize frequencies to exact integer cycles over 6.0s so loop boundary is 100% seamless
  const rawPartials = [
    { freq: 65.41, amp: 0.26, lfoCycles: 1 }, // C2
    { freq: 98.0, amp: 0.22, lfoCycles: 1 }, // G2
    { freq: 146.83, amp: 0.16, lfoCycles: 2 }, // D3
    { freq: 164.81, amp: 0.14, lfoCycles: 1 }, // E3
    { freq: 246.94, amp: 0.1, lfoCycles: 2 }, // B3
    { freq: 329.63, amp: 0.06, lfoCycles: 3 }, // E4 shimmer
  ];

  const partials = rawPartials.map((p, idx) => ({
    freq: Math.round(p.freq * dur) / dur,
    amp: p.amp,
    lfoFreq: p.lfoCycles / dur,
    lfoPhase: (idx * Math.PI) / 3,
  }));

  for (let i = 0; i < totalSamples; i++) {
    const t = i / SAMPLE_RATE;
    let s = 0;
    for (let k = 0; k < partials.length; k++) {
      const p = partials[k];
      const mod = 0.72 + 0.28 * Math.sin(TWO_PI * p.lfoFreq * t + p.lfoPhase);
      s += Math.sin(TWO_PI * p.freq * t) * p.amp * mod;
    }
    out[i] = s * 0.45;
  }
  return out;
}

class BioSynthEngine {
  private initialized = false;
  private initializing: Promise<void> | null = null;
  private soundEnabled = true;
  private players = new Map<BioSoundCue, AudioPlayer>();
  private dronePlayer: AudioPlayer | null = null;
  private lastPlayedAt = new Map<BioSoundCue, number>();

  async ensureInitialized(): Promise<void> {
    if (this.initialized) return;
    if (this.initializing) return this.initializing;

    this.initializing = this.doInitialize();
    return this.initializing;
  }

  private createWavUri(name: string, samples: Float32Array): string | null {
    try {
      const wavBytes = encodePcm16Wav(samples, SAMPLE_RATE);
      if (Platform.OS === 'web') {
        return uint8ToBase64DataUri(wavBytes);
      }
      const dir = new Directory(Paths.cache, 'uberis_biosynth_v2');
      if (!dir.exists) {
        dir.create({ idempotent: true, intermediates: true });
      }
      const file = new File(dir, `${name}.wav`);
      if (!file.exists) {
        file.create({ intermediates: true, overwrite: true });
      }
      file.writeSync(wavBytes);
      return file.uri;
    } catch {
      return null;
    }
  }

  private async doInitialize(): Promise<void> {
    try {
      await setAudioModeAsync({
        playsInSilentMode: true,
        interruptionMode: 'mixWithOthers',
      });
    } catch {
      // Ignore audio session warning on unsupported environments
    }

    const cues: BioSoundCue[] = [
      'tap',
      'birth',
      'death',
      'speciation',
      'discovery',
      'nourish',
      'rain',
      'solar',
      'mutagen',
      'monolith',
      'lightning',
    ];

    for (const cue of cues) {
      try {
        const uri = this.createWavUri(cue, synthesizeCueSamples(cue));
        if (uri) {
          const player = createAudioPlayer({ uri });
          player.volume = cue === 'tap' ? 0.35 : 0.62;
          this.players.set(cue, player);
        }
      } catch {
        // Non-fatal per cue
      }
    }

    try {
      const droneUri = this.createWavUri('drone_loop', synthesizeAmbientDroneLoop());
      if (droneUri) {
        const drone = createAudioPlayer({ uri: droneUri });
        drone.loop = true;
        drone.volume = 0.14;
        this.dronePlayer = drone;
      }
    } catch {
      // Non-fatal
    }

    this.initialized = true;
    this.syncDronePlayback();
  }

  setSoundEnabled(enabled: boolean): void {
    this.soundEnabled = enabled;
    if (enabled && !this.initialized) {
      void this.ensureInitialized();
      return;
    }
    this.syncDronePlayback();
  }

  private syncDronePlayback(): void {
    if (!this.dronePlayer) return;
    try {
      if (this.soundEnabled) {
        if (!this.dronePlayer.playing) {
          this.dronePlayer.play();
        }
      } else if (this.dronePlayer.playing) {
        this.dronePlayer.pause();
      }
    } catch {
      // Ignore transient player state error
    }
  }

  async play(cue: BioSoundCue, minGapMs = 110): Promise<void> {
    if (!this.soundEnabled) return;
    const now = Date.now();
    const prev = this.lastPlayedAt.get(cue) ?? 0;
    if (now - prev < minGapMs) return;
    this.lastPlayedAt.set(cue, now);

    if (!this.initialized) {
      await this.ensureInitialized();
    }

    const player = this.players.get(cue);
    if (!player) return;

    try {
      await player.seekTo(0);
      player.play();
    } catch {
      try {
        player.play();
      } catch {
        // Ignore playback error on locked web autoplay before first gesture
      }
    }
  }

  playForPower(power: Exclude<DivinePowerId, 'observe'>): void {
    const map: Record<Exclude<DivinePowerId, 'observe'>, BioSoundCue> = {
      nourish: 'nourish',
      rain: 'rain',
      solar_blessing: 'solar',
      mutagen: 'mutagen',
      monolith: 'monolith',
      spawn_life: 'birth',
      lightning: 'lightning',
    };
    void this.play(map[power], 80);
  }

  playForEventCategory(category: LiveEventCategory): void {
    switch (category) {
      case 'birth':
        void this.play('birth', 450);
        break;
      case 'death':
        void this.play('death', 700);
        break;
      case 'speciation':
        void this.play('speciation', 600);
        break;
      case 'tech_discovered':
      case 'tribe_founded':
        void this.play('discovery', 600);
        break;
      default:
        break;
    }
  }
}

export const bioSynth = new BioSynthEngine();
