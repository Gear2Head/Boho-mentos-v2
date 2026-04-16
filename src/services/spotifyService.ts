/**
 * AMAÇ: Spotify Web API entegrasyonu
 * MANTIK: PASİF — implicit flow güvenlik açığı (SEC-003) nedeniyle devre dışı.
 *
 * V19 (BUILD-002): unknown response üzerinden property erişimi kaldırıldı.
 * Spotify API response'ları tip-güvenli hale getirildi.
 * PKCE backend tamamlanana kadar feature flag ile korunuyor.
 */

const SPOTIFY_ENABLED = import.meta.env.VITE_SPOTIFY_ENABLED !== 'false';
const SPOTIFY_CLIENT_ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID || ''; // Blank by default, user must provide one
const REDIRECT_URI = typeof window !== 'undefined' ? (window.location.host.includes('localhost') ? 'http://127.0.0.1:3000/callback' : `${window.location.origin}/callback`) : '';

const SCOPES = [
  'user-read-playback-state',
  'user-modify-playback-state',
  'user-read-currently-playing',
  'playlist-read-private',
  'playlist-read-collaborative'
].join(' ');

export const spotifyAuthUrl: string | null = null; // Deprecated, use loginWithSpotify instead

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

export interface SpotifyPlaylist {
  id: string;
  name: string;
  uri: string;
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

function generateRandomString(length: number) {
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const values = crypto.getRandomValues(new Uint8Array(length));
  return values.reduce((acc, x) => acc + possible[x % possible.length], "");
}

async function generateCodeChallenge(codeVerifier: string) {
  const data = new TextEncoder().encode(codeVerifier);
  const digest = await window.crypto.subtle.digest('SHA-256', data);
  return btoa(String.fromCharCode.apply(null, [...new Uint8Array(digest)]))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export async function loginWithSpotify() {
  if (!SPOTIFY_ENABLED) return;
  const verifier = generateRandomString(64);
  sessionStorage.setItem('spotify_verifier', verifier);
  const challenge = await generateCodeChallenge(verifier);
  
  const args = new URLSearchParams({
    response_type: 'code',
    client_id: SPOTIFY_CLIENT_ID,
    scope: SCOPES,
    redirect_uri: REDIRECT_URI,
    code_challenge_method: 'S256',
    code_challenge: challenge
  });
  window.location.href = 'https://accounts.spotify.com/authorize?' + args.toString();
}

export function getSpotifyTokenFromUrl(): string | null {
  // Backwards compatibility for implicit / token fetch
  return sessionStorage.getItem('spotify_token');
}

export async function processSpotifyCallback(): Promise<string | null> {
  if (!SPOTIFY_ENABLED || typeof window === 'undefined') return null;
  const urlParams = new URLSearchParams(window.location.search);
  const code = urlParams.get('code');
  if (code) {
    window.history.replaceState(null, '', window.location.pathname);
    const verifier = sessionStorage.getItem('spotify_verifier') || '';
    const body = new URLSearchParams({
      client_id: SPOTIFY_CLIENT_ID,
      grant_type: 'authorization_code',
      code,
      redirect_uri: REDIRECT_URI,
      code_verifier: verifier,
    });
    try {
      const response = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body
      });
      if (response.ok) {
        const data = await response.json();
        sessionStorage.setItem('spotify_token', data.access_token);
        return data.access_token;
      }
    } catch(e) { console.error('[Spotify] Callback error:', e); }
  }
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
  contextUri?: string,
  uris?: string[],
  offsetUri?: string
): Promise<void> {
  if (!SPOTIFY_ENABLED) return;
  const body: any = {};
  if (contextUri) {
    body.context_uri = contextUri;
    if (offsetUri) body.offset = { uri: offsetUri };
  } else if (uris && uris.length > 0) {
    body.uris = uris;
  }

  await fetch('https://api.spotify.com/v1/me/player/play', {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: (contextUri || uris) ? JSON.stringify(body) : undefined,
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

export async function getUserPlaylists(token: string): Promise<SpotifyPlaylist[]> {
  if (!SPOTIFY_ENABLED) return [];
  const response = await fetch('https://api.spotify.com/v1/me/playlists?limit=20', {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!response.ok) return [];
  const data = await response.json();
  return data.items as SpotifyPlaylist[];
}

export async function searchTracks(token: string, query: string): Promise<SpotifyTrack[]> {
  if (!SPOTIFY_ENABLED || !query) return [];
  const response = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!response.ok) {
    const err = await response.text();
    console.error(`[Spotify Search 400/Error] q=${query}:`, err);
    return [];
  }
  const data = await response.json();
  return data.tracks?.items || [];
}

export async function getPlaylistTracks(token: string, playlistId: string): Promise<SpotifyTrack[]> {
  if (!SPOTIFY_ENABLED) return [];
  const response = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks?market=from_token&additional_types=track`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      sessionStorage.removeItem('spotify_token');
      if (typeof window !== 'undefined') window.location.reload();
    }
    const err = await response.text();
    console.error(`[Spotify Playlist 403/Error] id=${playlistId}:`, err);
    return [];
  }
  const data = await response.json();
  return (data.items || []).filter((i: any) => i.track).map((i: any) => i.track);
}
