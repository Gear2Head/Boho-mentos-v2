/**
 * AMAÇ: Spotify Widget — Odak müzikleri için bağlantı.
 * MANTIK: Feature flag ile kontrollü açık/kapalı.
 *
 * V19 (BUILD-002): unknown response erişimi → typed SpotifyCurrentlyPlaying.
 */

import React, { useEffect, useState } from 'react';
import { Play, Pause, SkipForward, Music } from 'lucide-react';
import type { SpotifyCurrentlyPlaying, SpotifyTrack } from '../services/spotifyService';
import {
  spotifyAuthUrl,
  getSpotifyTokenFromUrl,
  getCurrentTrack,
  playTrack,
  pauseTrack,
  nextTrack,
} from '../services/spotifyService';

export function SpotifyWidget() {
  const [token, setToken] = useState<string | null>(null);
  const [track, setTrack] = useState<SpotifyTrack | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    const t = getSpotifyTokenFromUrl();
    if (t) setToken(t);
  }, []);

  useEffect(() => {
    if (!token) return;

    const fetchTrack = async () => {
      try {
        // V19: typed — no more unknown.item access
        const data: SpotifyCurrentlyPlaying | null = await getCurrentTrack(token);
        if (data?.item) {
          setTrack(data.item);
          setIsPlaying(data.is_playing);
        }
      } catch (err) {
        console.error('[Spotify] Token hatası:', err);
      }
    };

    fetchTrack();
    const interval = setInterval(fetchTrack, 10_000);
    return () => clearInterval(interval);
  }, [token]);

  const handlePlayPause = async () => {
    if (!token) return;
    try {
      if (isPlaying) {
        await pauseTrack(token);
        setIsPlaying(false);
      } else {
        await playTrack(token);
        setIsPlaying(true);
      }
    } catch (e) {
      console.error('[Spotify] Play/pause error:', e);
    }
  };

  const handleNext = async () => {
    if (!token) return;
    try {
      await nextTrack(token);
      setTimeout(async () => {
        const d = await getCurrentTrack(token);
        if (d) {
          setTrack(d.item);
          setIsPlaying(d.is_playing);
        }
      }, 1000);
    } catch (e) {
      console.error('[Spotify] Next error:', e);
    }
  };

  if (!token) {
    return (
      <div className="flex items-center gap-3 p-3 border border-[#EAE6DF] dark:border-zinc-800 rounded-xl bg-[#FFFFFF] dark:bg-zinc-900 shadow-sm">
        <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center text-white">
          <Music size={16} />
        </div>
        <div className="flex-1">
          <h4 className="text-xs font-bold text-[#4A443C] dark:text-zinc-200">Spotify Bağla</h4>
          <p className="text-[10px] opacity-60 dark:text-zinc-400">Odak müzikleri için giriş yap</p>
        </div>
        {spotifyAuthUrl && (
          <a
            href={spotifyAuthUrl}
            className="px-3 py-1.5 bg-green-500 text-white rounded-lg text-[10px] uppercase tracking-widest font-bold hover:bg-green-600 transition-colors"
          >
            Bağlan
          </a>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 p-3 border border-[#EAE6DF] dark:border-zinc-800 rounded-xl bg-[#FFFFFF] dark:bg-zinc-900 shadow-sm min-w-[250px] overflow-hidden">
      {track?.album?.images?.[0] ? (
        <img
          src={track.album.images[0].url}
          alt={track.album.name}
          className="w-10 h-10 rounded-md object-cover"
        />
      ) : (
        <div className="w-10 h-10 bg-zinc-200 dark:bg-zinc-800 rounded-md flex items-center justify-center">
          <Music size={16} className="text-zinc-400" />
        </div>
      )}

      <div className="flex-1 overflow-hidden">
        <h4 className="text-xs font-bold text-[#4A443C] dark:text-zinc-200 truncate">
          {track ? track.name : 'Bağlı'}
        </h4>
        <p className="text-[10px] opacity-60 dark:text-zinc-400 truncate">
          {track
            ? track.artists.map((a) => a.name).join(', ')
            : 'Müzik çalmıyor'}
        </p>
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={handlePlayPause}
          className="p-1.5 text-[#4A443C] dark:text-zinc-200 hover:bg-[#EAE6DF] dark:hover:bg-zinc-800 rounded-full transition-colors"
          aria-label={isPlaying ? 'Duraklat' : 'Oynat'}
        >
          {isPlaying ? (
            <Pause size={14} fill="currentColor" />
          ) : (
            <Play size={14} fill="currentColor" />
          )}
        </button>
        <button
          onClick={handleNext}
          className="p-1.5 text-[#4A443C] dark:text-zinc-200 hover:bg-[#EAE6DF] dark:hover:bg-zinc-800 rounded-full transition-colors"
          aria-label="Sonraki parça"
        >
          <SkipForward size={14} fill="currentColor" />
        </button>
      </div>
    </div>
  );
}
