import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import type { DivinePowerId, LiveEventCategory } from '@/engine/types';

let hapticsEnabled = true;

export function setHapticsEnabled(enabled: boolean): void {
  hapticsEnabled = enabled;
}

function canHaptic(): boolean {
  return hapticsEnabled && Platform.OS !== 'web';
}

export function hapticSelection(): void {
  if (!canHaptic()) return;
  void Haptics.selectionAsync().catch(() => {});
}

export function hapticCreatureSelect(): void {
  if (!canHaptic()) return;
  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

export function hapticSoft(): void {
  if (!canHaptic()) return;
  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft).catch(() => {});
}

export function hapticSuccess(): void {
  if (!canHaptic()) return;
  void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
}

export function hapticDivinePower(power: DivinePowerId): void {
  if (!canHaptic()) return;
  switch (power) {
    case 'observe':
      void Haptics.selectionAsync().catch(() => {});
      break;
    case 'lightning':
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
      setTimeout(() => {
        if (canHaptic()) {
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
        }
      }, 90);
      break;
    case 'monolith':
    case 'spawn_life':
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid).catch(() => {});
      break;
    case 'mutagen':
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      break;
    case 'nourish':
    case 'rain':
    case 'solar_blessing':
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft).catch(() => {});
      break;
  }
}

export function hapticForEventCategory(category: LiveEventCategory): void {
  if (!canHaptic()) return;
  switch (category) {
    case 'speciation':
    case 'tech_discovered':
    case 'tribe_founded':
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      break;
    case 'birth':
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft).catch(() => {});
      break;
    case 'predator':
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      break;
    default:
      break;
  }
}
