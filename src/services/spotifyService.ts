/**
 * AMAÇ: Spotify Web API entegrasyonu
 * MANTIK: Şu an PASİF — implicit flow güvenlik açığı (SEC-003) nedeniyle devre dışı.
 * UYARI: Token hash'ten frontend'de okunamaz. Backend-assisted PKCE gerekli.
 *        Production'da VITE_SPOTIFY_ENABLED=true olmadan hiçbir fonksiyon çalışmaz.
 */

/** [SEC-003 FIX]: Implicit flow frontend token açığını engelle */
const SPOTIFY_ENABLED = import.meta.env.VITE_SPOTIFY_ENABLED === 'true';

const SPOTIFY_CLIENT_ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID || '';
const REDIRECT_URI = `${window.location.origin}/callback`;
const SCOPES = 'user-read-playback-state user-modify-playback-state user-read-currently-playing playlist-read-private';

export const spotifyAuthUrl = SPOTIFY_ENABLED
  ? `https://accounts.spotify.com/authorize?client_id=${SPOTIFY_CLIENT_ID}&response_type=code&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=${encodeURIComponent(SCOPES)}`
  : null;

export function getSpotifyTokenFromUrl(): string | null {
  if (!SPOTIFY_ENABLED || typeof window === 'undefined') return null;
  // [SEC-003 FIX]: Artık hash'ten token OKUNMUYOR — code flow, backend'den alınmalı
  return sessionStorage.getItem('spotify_token');
}

export async function getCurrentTrack(token: string): Promise<unknown | null> {
  if (!SPOTIFY_ENABLED) return null;
  const response = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (response.status === 204) return null;
  if (!response.ok) throw new Error('Spotify API Error');
  return response.json();
}

export async function playTrack(token: string, contextUri?: string): Promise<void> {
  if (!SPOTIFY_ENABLED) return;
  await fetch('https://api.spotify.com/v1/me/player/play', {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: contextUri ? JSON.stringify({ context_uri: contextUri }) : undefined
  });
}

export async function pauseTrack(token: string): Promise<void> {
  if (!SPOTIFY_ENABLED) return;
  await fetch('https://api.spotify.com/v1/me/player/pause', {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` }
  });
}

export async function nextTrack(token: string): Promise<void> {
  if (!SPOTIFY_ENABLED) return;
  await fetch('https://api.spotify.com/v1/me/player/next', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` }
  });
}

