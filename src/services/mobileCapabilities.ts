export type HapticPattern = 'light' | 'success' | 'warning' | 'error' | 'reward';

const WEB_PATTERNS: Record<HapticPattern, number | number[]> = {
  light: 12,
  success: [18, 24, 18],
  warning: [30, 35, 30],
  error: [45, 40, 45],
  reward: [20, 35, 20, 35, 55],
};

type CapacitorHapticsModule = {
  impact?: (options: { style: 'LIGHT' | 'MEDIUM' | 'HEAVY' }) => Promise<void>;
  notification?: (options: { type: 'SUCCESS' | 'WARNING' | 'ERROR' }) => Promise<void>;
};

function isStandaloneDisplay(): boolean {
  if (typeof window === 'undefined') return false;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return window.matchMedia?.('(display-mode: standalone)').matches || nav.standalone === true;
}

function canUseVibration(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';
}

function isNativePlatform(): boolean {
  try {
    // ASSUME: Capacitor.isNativePlatform() is the reliable check for native vs web
    const cap = (window as any).Capacitor;
    return cap?.isNativePlatform?.() === true;
  } catch {
    return false;
  }
}

async function loadCapacitorHaptics(): Promise<CapacitorHapticsModule | null> {
  if (!isNativePlatform()) return null;
  try {
    const mod = await import(/* @vite-ignore */ '@capacitor/haptics');
    return mod.Haptics as CapacitorHapticsModule;
  } catch {
    return null;
  }
}

export async function triggerHaptic(pattern: HapticPattern = 'light'): Promise<void> {
  const haptics = await loadCapacitorHaptics();
  if (haptics) {
    if (pattern === 'success' && haptics.notification) return haptics.notification({ type: 'SUCCESS' });
    if (pattern === 'warning' && haptics.notification) return haptics.notification({ type: 'WARNING' });
    if (pattern === 'error' && haptics.notification) return haptics.notification({ type: 'ERROR' });
    if (haptics.impact) {
      const style = pattern === 'reward' ? 'HEAVY' : pattern === 'light' ? 'LIGHT' : 'MEDIUM';
      return haptics.impact({ style });
    }
  }

  if (canUseVibration()) {
    navigator.vibrate(WEB_PATTERNS[pattern]);
  }
}

export function getMobileRuntimeCapabilities() {
  return {
    standalone: isStandaloneDisplay(),
    vibration: canUseVibration(),
    camera: typeof navigator !== 'undefined' && Boolean(navigator.mediaDevices?.getUserMedia),
    share: typeof navigator !== 'undefined' && typeof navigator.share === 'function',
    serviceWorker: typeof navigator !== 'undefined' && 'serviceWorker' in navigator,
    indexedDb: typeof window !== 'undefined' && 'indexedDB' in window,
  };
}
