/**
 * AMAÇ: Spotify Web API entegrasyonu (OAuth 2.0 PKCE veya Code Flow)
 * MANTIK: Kullanıcının dinleme alışkanlıklarını yönetmek ve FocusTimer ile senkronize etmek.
 */

const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID || '';
const REDIRECT_URI = 'http://localhost:3000/callback';
const SCOPES = 'user-read-playback-state user-modify-playback-state user-read-currently-playing playlist-read-private';

export const spotifyAuthUrl = `https://accounts.spotify.com/authorize?client_id=${SPOTIFY_CLIENT_ID}&response_type=token&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=${encodeURIComponent(SCOPES)}`;

export function getSpotifyTokenFromUrl(): string | null {
  if (typeof window === 'undefined') return null;
  const hash = window.location.hash.substring(1);
  const params = new URLSearchParams(hash);
  const token = params.get('access_token');
  if (token) {
    localStorage.setItem('spotify_token', token);
    window.location.hash = ''; // Temizle
    return token;
  }
  return localStorage.getItem('spotify_token');
}

export async function getCurrentTrack(token: string) {
  const response = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (response.status === 204) return null; // Şarkı çalmıyor
  if (!response.ok) throw new Error('Spotify API Error');
  return response.json();
}

export async function playTrack(token: string, contextUri?: string) {
  await fetch('https://api.spotify.com/v1/me/player/play', {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: contextUri ? JSON.stringify({ context_uri: contextUri }) : undefined
  });
}

export async function pauseTrack(token: string) {
  await fetch('https://api.spotify.com/v1/me/player/pause', {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` }
  });
}

export async function nextTrack(token: string) {
  await fetch('https://api.spotify.com/v1/me/player/next', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` }
  });
}
