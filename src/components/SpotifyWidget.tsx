/**
 * AMAÇ: Spotify Widget — Odak müzikleri için bağlantı.
 * MANTIK: Feature flag ile kontrollü açık/kapalı.
 *
 * V21: Minimize/expand davranışı + dış tıklama ile otomatik kapanma.
 */

import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  Play, Pause, SkipForward, Music, Search,
  ChevronLeft, ChevronRight, ChevronDown, ChevronUp,
  PanelRightClose
} from 'lucide-react';
import type { SpotifyCurrentlyPlaying, SpotifyTrack, SpotifyPlaylist } from '../services/spotifyService';
import {
  loginWithSpotify,
  processSpotifyCallback,
  getSpotifyTokenFromUrl,
  getCurrentTrack,
  playTrack,
  pauseTrack,
  nextTrack,
  getUserPlaylists,
  searchTracks,
  getPlaylistTracks
} from '../services/spotifyService';
import { useAppStore } from '../store/appStore';

export function SpotifyWidget() {
  const isSpotifyWidgetOpen = useAppStore(s => s.isSpotifyWidgetOpen);

  const [token, setToken] = useState<string | null>(null);
  const [track, setTrack] = useState<SpotifyTrack | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playlists, setPlaylists] = useState<SpotifyPlaylist[]>([]);

  const [showPanel, setShowPanel] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false); // minimized to tab on side

  const [activeTab, setActiveTab] = useState<'playlists' | 'search'>('playlists');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SpotifyTrack[]>([]);
  const [selectedPlaylist, setSelectedPlaylist] = useState<SpotifyPlaylist | null>(null);
  const [playlistTracks, setPlaylistTracks] = useState<SpotifyTrack[]>([]);

  const containerRef = useRef<HTMLDivElement>(null);

  // ─── Outside click → collapse ─────────────────────────────────────────────
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowPanel(false);
        setIsCollapsed(true);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // ─── Auth ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    processSpotifyCallback().then((t) => {
      if (t) setToken(t);
      else {
        const existing = getSpotifyTokenFromUrl();
        if (existing) setToken(existing);
      }
    });
  }, []);

  // ─── Track polling ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!token) return;

    const fetchTrack = async () => {
      try {
        const data: SpotifyCurrentlyPlaying | null = await getCurrentTrack(token);
        if (data?.item) {
          setTrack(data.item);
          setIsPlaying(data.is_playing);
        }
      } catch (err) {
        console.error('[Spotify] Token hatası:', err);
      }
    };

    const fetchPlaylists = async () => {
      try {
        const pl = await getUserPlaylists(token);
        setPlaylists(pl);
      } catch (e) {
        console.error(e);
      }
    };

    fetchTrack();
    fetchPlaylists();
    const interval = setInterval(fetchTrack, 10_000);
    return () => clearInterval(interval);
  }, [token]);

  // ─── Search debounce ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!searchQuery) { setSearchResults([]); return; }
    const timer = setTimeout(async () => {
      if (!token) return;
      try {
        const res = await searchTracks(token, searchQuery);
        setSearchResults(res);
      } catch (e) { console.error(e); }
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery, token]);

  // ─── Controls ─────────────────────────────────────────────────────────────
  const handlePlayPause = async () => {
    if (!token) return;
    try {
      if (isPlaying) { await pauseTrack(token); setIsPlaying(false); }
      else           { await playTrack(token);  setIsPlaying(true);  }
    } catch (e) { console.error('[Spotify] Play/pause error:', e); }
  };

  const handleNext = async () => {
    if (!token) return;
    try {
      await nextTrack(token);
      setTimeout(async () => {
        const d = await getCurrentTrack(token);
        if (d?.item) { setTrack(d.item); setIsPlaying(d.is_playing); }
      }, 1000);
    } catch (e) { console.error('[Spotify] Next error', e); }
  };

  const handlePlaylistClick = async (pl: SpotifyPlaylist) => {
    setSelectedPlaylist(pl);
    if (!token) return;
    try {
      const tracks = await getPlaylistTracks(token, pl.id);
      setPlaylistTracks(tracks);
    } catch (e) { console.error(e); }
  };

  const handlePlaySpecificTrack = async (contextUri?: string, trackUri?: string) => {
    if (!token) return;
    try {
      if (contextUri && trackUri) await playTrack(token, contextUri, undefined, trackUri);
      else if (trackUri)          await playTrack(token, undefined, [trackUri]);
      else if (contextUri)        await playTrack(token, contextUri);
      setIsPlaying(true);
      setTimeout(async () => {
        const d = await getCurrentTrack(token);
        if (d?.item) setTrack(d.item);
      }, 1000);
    } catch (e) { console.error(e); }
  };

  if (!isSpotifyWidgetOpen) return null;

  // ─── Auth gate ────────────────────────────────────────────────────────────
  if (!token) {
    return (
      <div ref={containerRef} className="fixed bottom-24 right-4 md:bottom-6 md:right-6 z-[60] flex items-center gap-3 p-3 border border-[#EAE6DF] dark:border-zinc-800 rounded-xl bg-[#FFFFFF] dark:bg-zinc-900 shadow-xl">
        <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center text-white">
          <Music size={16} />
        </div>
        <div className="flex-1">
          <h4 className="text-xs font-bold text-[#4A443C] dark:text-zinc-200">Spotify Bağla</h4>
          <p className="text-[10px] opacity-60 dark:text-zinc-400">Odak müzikleri için giriş yap</p>
        </div>
        <button
          onClick={loginWithSpotify}
          className="px-3 py-1.5 bg-green-500 text-white rounded-lg text-[10px] uppercase tracking-widest font-bold hover:bg-green-600 transition-colors"
        >
          Bağlan
        </button>
      </div>
    );
  }

  // ─── Collapsed tab ────────────────────────────────────────────────────────
  if (isCollapsed) {
    return (
      <div
        ref={containerRef}
        className="fixed bottom-24 right-0 md:bottom-6 z-[60] flex items-center"
        style={{ transform: 'translateX(0)' }}
      >
        {/* Collapsed tab — click to expand */}
        <button
          onClick={() => { setIsCollapsed(false); setShowPanel(false); }}
          className="flex items-center gap-2 px-2 py-3 bg-zinc-900 dark:bg-zinc-900 border border-zinc-700 border-r-0 rounded-l-xl shadow-xl text-green-400 hover:text-green-300 transition-colors group"
          title="Spotify'ı aç"
        >
          <ChevronLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
          <Music size={14} />
          {isPlaying && (
            <span className="flex gap-0.5 items-end h-3">
              <span className="w-0.5 bg-green-400 rounded-sm animate-[equalizer_0.8s_ease-in-out_infinite]" style={{ height: '60%', animationDelay: '0ms' }} />
              <span className="w-0.5 bg-green-400 rounded-sm animate-[equalizer_0.8s_ease-in-out_infinite]" style={{ height: '100%', animationDelay: '200ms' }} />
              <span className="w-0.5 bg-green-400 rounded-sm animate-[equalizer_0.8s_ease-in-out_infinite]" style={{ height: '40%', animationDelay: '400ms' }} />
            </span>
          )}
        </button>
      </div>
    );
  }

  // ─── Expanded widget ──────────────────────────────────────────────────────
  return (
    <div ref={containerRef} className="fixed bottom-24 right-4 md:bottom-6 md:right-6 z-[60]">

      {/* Panel (playlist / search) */}
      {showPanel && (
        <div className="absolute bottom-16 right-0 w-72 h-96 flex flex-col bg-[#FFFFFF] dark:bg-zinc-900 border border-[#EAE6DF] dark:border-zinc-800 rounded-xl shadow-2xl overflow-hidden mb-2 animate-in slide-in-from-bottom-2 fade-in duration-200">

          <div className="flex border-b border-[#EAE6DF] dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 shrink-0">
            <button
              onClick={() => { setActiveTab('playlists'); setSelectedPlaylist(null); }}
              className={`flex-1 py-3 text-[10px] font-bold uppercase tracking-widest transition-colors ${activeTab === 'playlists' ? 'text-green-500 border-b-2 border-green-500 bg-green-500/5' : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'}`}
            >
              Listeler
            </button>
            <button
              onClick={() => { setActiveTab('search'); setSelectedPlaylist(null); }}
              className={`flex-1 py-3 text-[10px] font-bold uppercase tracking-widest transition-colors ${activeTab === 'search' ? 'text-green-500 border-b-2 border-green-500 bg-green-500/5' : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'}`}
            >
              Arama
            </button>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col min-h-0">

            {/* Playlists */}
            {activeTab === 'playlists' && !selectedPlaylist && (
              <div className="flex flex-col p-2 space-y-1">
                {playlists.map(pl => (
                  <button
                    key={pl.id}
                    onClick={() => handlePlaylistClick(pl)}
                    className="w-full text-left flex items-center gap-3 p-2 hover:bg-[#FDFBF7] dark:hover:bg-zinc-800 rounded-lg transition-colors group"
                  >
                    {pl.images?.[0]
                      ? <img src={pl.images[0].url} className="w-10 h-10 rounded-md shrink-0 object-cover" alt="" />
                      : <div className="w-10 h-10 bg-zinc-100 dark:bg-zinc-800 rounded-md flex items-center justify-center shrink-0"><Music size={14} className="text-zinc-400" /></div>
                    }
                    <div className="flex-1 overflow-hidden">
                      <span className="text-xs font-bold text-[#4A443C] dark:text-zinc-200 truncate block group-hover:text-green-500 transition-colors">{pl.name}</span>
                    </div>
                    <ChevronRight size={16} className="text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                ))}
              </div>
            )}

            {/* Playlist tracks drill-down */}
            {activeTab === 'playlists' && selectedPlaylist && (
              <div className="flex flex-col relative h-full">
                <div className="flex items-center gap-2 p-2 border-b border-[#EAE6DF] dark:border-zinc-800 sticky top-0 bg-[#FFFFFF] dark:bg-zinc-900 z-10 shrink-0">
                  <button onClick={() => setSelectedPlaylist(null)} className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors">
                    <ChevronLeft size={16} className="dark:text-zinc-300" />
                  </button>
                  <span className="font-bold text-[11px] truncate flex-1 dark:text-zinc-200 uppercase tracking-wider">{selectedPlaylist.name}</span>
                  <button onClick={() => handlePlaySpecificTrack(selectedPlaylist.uri)} className="p-1.5 text-green-500 hover:bg-green-500/10 rounded-lg transition-colors" title="Listeyi Çal">
                    <Play size={14} fill="currentColor" />
                  </button>
                </div>
                <div className="p-2 space-y-1 flex-1 overflow-y-auto custom-scrollbar">
                  {playlistTracks.map(t => (
                    <button key={t.id} onClick={() => handlePlaySpecificTrack(selectedPlaylist.uri, t.uri)} className="w-full text-left flex items-center gap-3 p-2 hover:bg-[#FDFBF7] dark:hover:bg-zinc-800 rounded-lg group transition-colors">
                      {t.album?.images?.[0]
                        ? <img src={t.album.images[0].url} className="w-8 h-8 rounded shrink-0 object-cover" alt="" />
                        : <div className="w-8 h-8 bg-zinc-100 dark:bg-zinc-800 rounded shrink-0 flex items-center justify-center"><Music size={12} className="text-zinc-400" /></div>
                      }
                      <div className="flex-1 overflow-hidden">
                        <span className="text-[11px] font-bold text-[#4A443C] dark:text-zinc-200 truncate block group-hover:text-green-500 transition-colors">{t.name}</span>
                        <span className="text-[9px] text-zinc-500 truncate block">{t.artists.map(a => a.name).join(', ')}</span>
                      </div>
                      <Play size={12} className="opacity-0 group-hover:opacity-100 text-green-500 shrink-0" fill="currentColor" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Search */}
            {activeTab === 'search' && (
              <div className="flex flex-col p-3 h-full">
                <div className="relative mb-3 shrink-0">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400">
                    <Search size={14} />
                  </div>
                  <input
                    type="text"
                    placeholder="Şarkı ara..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-[#F5F2EB] dark:bg-zinc-950 border border-[#EAE6DF] dark:border-zinc-800 rounded-lg py-2 pl-9 pr-3 text-[11px] font-medium focus:outline-none focus:border-green-500 text-[#4A443C] dark:text-zinc-200 placeholder-zinc-400 transition-colors"
                  />
                </div>
                <div className="space-y-1 flex-1 overflow-y-auto custom-scrollbar">
                  {searchResults.map(t => (
                    <button key={t.id} onClick={() => handlePlaySpecificTrack(undefined, t.uri)} className="w-full text-left flex items-center gap-3 p-2 hover:bg-[#FDFBF7] dark:hover:bg-zinc-800 rounded-lg group transition-colors">
                      {t.album?.images?.[0]
                        ? <img src={t.album.images[0].url} className="w-8 h-8 rounded shrink-0 object-cover" alt="" />
                        : <div className="w-8 h-8 bg-zinc-100 dark:bg-zinc-800 rounded shrink-0 flex items-center justify-center"><Music size={12} className="text-zinc-400" /></div>
                      }
                      <div className="flex-1 overflow-hidden">
                        <span className="text-[11px] font-bold text-[#4A443C] dark:text-zinc-200 truncate block group-hover:text-green-500 transition-colors">{t.name}</span>
                        <span className="text-[9px] text-zinc-500 truncate block">{t.artists.map(a => a.name).join(', ')}</span>
                      </div>
                      <Play size={12} className="opacity-0 group-hover:opacity-100 text-green-500 shrink-0" fill="currentColor" />
                    </button>
                  ))}
                  {searchQuery && searchResults.length === 0 && (
                    <div className="text-center p-4 text-[11px] text-zinc-500">Sonuç bulunamadı</div>
                  )}
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {/* Main Player Bar */}
      <div className="relative flex items-center gap-3 p-3 border border-[#EAE6DF] dark:border-zinc-800 rounded-xl bg-[#FFFFFF] dark:bg-zinc-900 shadow-lg min-w-[260px] max-w-[320px] overflow-hidden transition-all hover:border-zinc-300 dark:hover:border-zinc-700 group">

        {/* Collapse button — visible on hover */}
        <button
          onClick={() => { setIsCollapsed(true); setShowPanel(false); }}
          className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800"
          title="Küçült (köşeye çek)"
        >
          <PanelRightClose size={11} />
        </button>

        {track?.album?.images?.[0] ? (
          <img
            src={track.album.images[0].url}
            alt={track.album.name}
            className={`w-10 h-10 rounded-md object-cover flex-shrink-0 ${isPlaying ? 'ring-2 ring-green-500/50' : ''}`}
          />
        ) : (
          <div className="w-10 h-10 bg-zinc-200 dark:bg-zinc-800 rounded-md flex items-center justify-center shrink-0">
            <Music size={16} className="text-zinc-400" />
          </div>
        )}

        <div className="flex-1 overflow-hidden">
          <h4 className="text-[11px] font-bold text-[#4A443C] dark:text-zinc-200 truncate">
            {track ? track.name : 'Bağlı'}
          </h4>
          <p className="text-[9px] opacity-60 dark:text-zinc-400 truncate mt-0.5 uppercase tracking-wide">
            {track ? track.artists.map((a) => a.name).join(', ') : 'Müzik çalmıyor'}
          </p>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => setShowPanel(!showPanel)}
            className={`p-1.5 rounded-full transition-colors ${showPanel ? 'text-green-500 bg-green-500/10' : 'text-[#4A443C] dark:text-zinc-400 hover:bg-[#EAE6DF] dark:hover:bg-zinc-800'}`}
            title="Arama ve Listeler"
          >
            <Search size={14} />
          </button>
          <div className="w-px h-6 bg-[#EAE6DF] dark:bg-zinc-800 mx-0.5" />
          <button
            onClick={handlePlayPause}
            className="p-1.5 text-[#4A443C] dark:text-zinc-100 hover:text-green-500 hover:bg-[#EAE6DF] dark:hover:bg-zinc-800 rounded-full transition-colors"
            aria-label={isPlaying ? 'Duraklat' : 'Oynat'}
          >
            {isPlaying ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
          </button>
          <button
            onClick={handleNext}
            className="p-1.5 text-[#4A443C] dark:text-zinc-100 hover:text-green-500 hover:bg-[#EAE6DF] dark:hover:bg-zinc-800 rounded-full transition-colors"
            aria-label="Sonraki parça"
          >
            <SkipForward size={14} fill="currentColor" />
          </button>
        </div>
      </div>
    </div>
  );
}
