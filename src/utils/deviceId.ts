/**
 * Generates and persists a stable device ID in localStorage.
 * Used for conflict detection in multi-device sync scenarios.
 */
export function getDeviceId(): string {
  const key = 'boho_device_id';
  const existing = localStorage.getItem(key);
  if (existing) return existing;
  const id = `dev_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  localStorage.setItem(key, id);
  return id;
}
