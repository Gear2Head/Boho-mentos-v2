/**
 * AMAÇ: Spotify Web API entegrasyonu
 * MANTIK: PASİF — implicit flow güvenlik açığı (SEC-003) nedeniyle devre dışı.
 *
 * V19 (BUILD-002): unknown response üzerinden property erişimi kaldırıldı.
 * Spotify API response'ları tip-güvenli hale getirildi.
 * PKCE backend tamamlanana kadar feature flag ile korunuyor.
 */

const SPOTIFY_ENABLED = import.meta.env.VITE_SPOTIFY_ENABLED !== 'false';
const SPOTIFY_CLIENT_ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID || 'a68cc587844042c79aff35aa97261a14';
const REDIRECT_URI = typeof window !== 'undefined' ? `${window.location.origin}/callback` : '';

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

  const verifier = generateRandomString(128);
  const challenge = await generateCodeChallenge(verifier);

  sessionStorage.setItem('spotify_verifier', verifier);

  const params = new URLSearchParams({
    client_id: SPOTIFY_CLIENT_ID,
    response_type: 'code',
    redirect_uri: REDIRECT_URI,
    scope: SCOPES,
    code_challenge_method: 'S256',
    code_challenge: challenge,
  });

  window.location.href = `https://accounts.spotify.com/authorize?${params.toString()}`;
}

export function getSpotifyTokenFromUrl(): string | null {
  return localStorage.getItem('spotify_token');
}

export async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = localStorage.getItem('spotify_refresh_token');
  if (!refreshToken || !SPOTIFY_ENABLED) return null;

  try {
    const body = new URLSearchParams({
      client_id: SPOTIFY_CLIENT_ID,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    });

    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body
    });

    if (response.ok) {
      const data = await response.json();
      localStorage.setItem('spotify_token', data.access_token);
      if (data.refresh_token) localStorage.setItem('spotify_refresh_token', data.refresh_token);
      return data.access_token;
    } else if (response.status === 400 || response.status === 401) {
      // Refresh token invalid, clear everything
      localStorage.removeItem('spotify_token');
      localStorage.removeItem('spotify_refresh_token');
    }
  } catch (e) {
    console.error('[Spotify] Refresh token error:', e);
  }
  return null;
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
        localStorage.setItem('spotify_token', data.access_token);
        if (data.refresh_token) localStorage.setItem('spotify_refresh_token', data.refresh_token);
        return data.access_token;
      }
    } catch(e) { console.error('[Spotify] Callback error:', e); }
  }
  return localStorage.getItem('spotify_token');
}

// ─── API Calls Helper ─────────────────────────────────────────────────────────

async function spotifyFetch(url: string, options: RequestInit = {}): Promise<Response> {
  let token = localStorage.getItem('spotify_token');
  if (!token) throw new Error('No spotify token');

  const headers = {
    ...options.headers,
    Authorization: `Bearer ${token}`
  };

  let response = await fetch(url, { ...options, headers });

  if (response.status === 401) {
    // Attempt refresh
    const newToken = await refreshAccessToken();
    if (newToken) {
      const newHeaders = { ...options.headers, Authorization: `Bearer ${newToken}` };
      response = await fetch(url, { ...options, headers: newHeaders });
    } else {
      // Refresh failed or no refresh token - clear and reload
      localStorage.removeItem('spotify_token');
      localStorage.removeItem('spotify_refresh_token');
      if (typeof window !== 'undefined') window.location.assign('/');
    }
  }

  return response;
}

// ─── API Calls ────────────────────────────────────────────────────────────────

export async function getCurrentTrack(): Promise<SpotifyCurrentlyPlaying | null> {
  if (!SPOTIFY_ENABLED) return null;
  try {
    const response = await spotifyFetch('https://api.spotify.com/v1/me/player/currently-playing');
    if (response.status === 204) return null;
    if (!response.ok) return null;
    return response.json() as Promise<SpotifyCurrentlyPlaying>;
  } catch (e) {
    return null;
  }
}

export async function playTrack(
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

  await spotifyFetch('https://api.spotify.com/v1/me/player/play', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: (contextUri || uris) ? JSON.stringify(body) : undefined,
  });
}

export async function pauseTrack(): Promise<void> {
  if (!SPOTIFY_ENABLED) return;
  await spotifyFetch('https://api.spotify.com/v1/me/player/pause', {
    method: 'PUT',
  });
}

export async function nextTrack(): Promise<void> {
  if (!SPOTIFY_ENABLED) return;
  await spotifyFetch('https://api.spotify.com/v1/me/player/next', {
    method: 'POST',
  });
}

export async function getUserPlaylists(): Promise<SpotifyPlaylist[]> {
  if (!SPOTIFY_ENABLED) return [];
  try {
    const response = await spotifyFetch('https://api.spotify.com/v1/me/playlists?limit=20');
    if (!response.ok) return [];
    const data = await response.json();
    return data.items as SpotifyPlaylist[];
  } catch {
    return [];
  }
}

export async function searchTracks(query: string): Promise<SpotifyTrack[]> {
  if (!SPOTIFY_ENABLED || !query) return [];
  try {
    const response = await spotifyFetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track`);
    if (!response.ok) return [];
    const data = await response.json();
    return data.tracks?.items || [];
  } catch {
    return [];
  }
}

export async function getPlaylistTracks(playlistId: string): Promise<SpotifyTrack[]> {
  if (!SPOTIFY_ENABLED) return [];
  try {
    const response = await spotifyFetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=50`);
    if (!response.ok) return [];
    const data = await response.json();
    return (data.items || []).filter((i: any) => i.track).map((i: any) => i.track);
  } catch {
    return [];
  }
}
