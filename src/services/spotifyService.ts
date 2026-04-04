/**
 * AMAÇ: Spotify Web API entegrasyonu
 * MANTIK: PASİF — implicit flow güvenlik açığı (SEC-003) nedeniyle devre dışı.
 *
 * V19 (BUILD-002): unknown response üzerinden property erişimi kaldırıldı.
 * Spotify API response'ları tip-güvenli hale getirildi.
 * PKCE backend tamamlanana kadar feature flag ile korunuyor.
 */

const SPOTIFY_ENABLED = import.meta.env.VITE_SPOTIFY_ENABLED === 'true';
const SPOTIFY_CLIENT_ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID || '';
const REDIRECT_URI =
  typeof window !== 'undefined'
    ? `${window.location.origin}/callback`
    : '';

const SCOPES = [
  'user-read-playback-state',
  'user-modify-playback-state',
  'user-read-currently-playing',
  'playlist-read-private',
].join(' ');

export const spotifyAuthUrl: string | null = SPOTIFY_ENABLED
  ? `https://accounts.spotify.com/authorize?client_id=${SPOTIFY_CLIENT_ID}&response_type=code&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=${encodeURIComponent(SCOPES)}`
  : null;

// ─── Typed Spotify API responses ──────────────────────────────────────────────

export interface SpotifyArtist {
  id: string;
  name: string;
}

export interface SpotifyImage {
  url: string;
  width: number | null;
  height: number | null;
}

export interface SpotifyAlbum {
  id: string;
  name: string;
  images: SpotifyImage[];
}

export interface SpotifyTrack {
  id: string;
  name: string;
  artists: SpotifyArtist[];
  album: SpotifyAlbum;
  duration_ms: number;
}

export interface SpotifyCurrentlyPlaying {
  is_playing: boolean;
  item: SpotifyTrack | null;
  progress_ms: number | null;
}

// ─── Token ────────────────────────────────────────────────────────────────────

export function getSpotifyTokenFromUrl(): string | null {
  if (!SPOTIFY_ENABLED || typeof window === 'undefined') return null;
  // SEC-003: hash token okunmuyor — backend PKCE flow gerekli
  return sessionStorage.getItem('spotify_token');
}

// ─── API Calls ────────────────────────────────────────────────────────────────

export async function getCurrentTrack(
  token: string
): Promise<SpotifyCurrentlyPlaying | null> {
  if (!SPOTIFY_ENABLED) return null;
  const response = await fetch(
    'https://api.spotify.com/v1/me/player/currently-playing',
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (response.status === 204) return null;
  if (!response.ok) throw new Error(`Spotify API ${response.status}`);
  // V19 BUILD-002: cast to typed interface — no more `any` or `unknown` access
  return response.json() as Promise<SpotifyCurrentlyPlaying>;
}

export async function playTrack(
  token: string,
  contextUri?: string
): Promise<void> {
  if (!SPOTIFY_ENABLED) return;
  await fetch('https://api.spotify.com/v1/me/player/play', {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: contextUri ? JSON.stringify({ context_uri: contextUri }) : undefined,
  });
}

export async function pauseTrack(token: string): Promise<void> {
  if (!SPOTIFY_ENABLED) return;
  await fetch('https://api.spotify.com/v1/me/player/pause', {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function nextTrack(token: string): Promise<void> {
  if (!SPOTIFY_ENABLED) return;
  await fetch('https://api.spotify.com/v1/me/player/next', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
}
