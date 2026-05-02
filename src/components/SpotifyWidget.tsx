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

const SpotifyLogo = ({ size = 16, className = "" }: { size?: number, className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} fill="currentColor" className={`bi bi-spotify ${className}`} viewBox="0 0 16 16">
    <path d="M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0m3.669 11.538a.5.5 0 0 1-.686.165c-1.879-1.147-4.243-1.407-7.028-.77a.499.499 0 0 1-.222-.973c3.048-.696 5.662-.397 7.77.892a.5.5 0 0 1 .166.686m.979-2.178a.624.624 0 0 1-.858.205c-2.15-1.321-5.428-1.704-7.972-.932a.625.625 0 0 1-.362-1.194c2.905-.881 6.517-.454 8.986 1.063a.624.624 0 0 1 .206.858m.084-2.268C10.154 5.56 5.9 5.419 3.438 6.166a.748.748 0 1 1-.434-1.432c2.825-.857 7.523-.692 10.492 1.07a.747.747 0 1 1-.764 1.288"/>
  </svg>
);

import { motion, AnimatePresence } from 'motion/react';

export function SpotifyWidget() {
  const isSpotifyWidgetOpen = useAppStore(s => s.isSpotifyWidgetOpen);

  const [token, setToken] = useState<string | null>(null);
  const [track, setTrack] = useState<SpotifyTrack | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playlists, setPlaylists] = useState<SpotifyPlaylist[]>([]);

  const [showPanel, setShowPanel] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const [activeTab, setActiveTab] = useState<'playlists' | 'search'>('playlists');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SpotifyTrack[]>([]);
  const [selectedPlaylist, setSelectedPlaylist] = useState<SpotifyPlaylist | null>(null);
  const [playlistTracks, setPlaylistTracks] = useState<SpotifyTrack[]>([]);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const progressIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowPanel(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Load existing token immediately from localStorage
  useEffect(() => {
    const existing = localStorage.getItem('spotify_token');
    if (existing) setToken(existing);
  }, []);

  // Handle OAuth callback code if present
  useEffect(() => {
    processSpotifyCallback().then((t) => {
      if (t) setToken(t);
    });
  }, []);


  useEffect(() => {
    if (!token) return;

    const fetchTrack = async () => {
      try {
        const data: SpotifyCurrentlyPlaying | null = await getCurrentTrack();
        if (data?.item) {
          setTrack(data.item);
          setIsPlaying(data.is_playing);
          setProgress(data.progress_ms || 0);
          setDuration(data.item.duration_ms);
        } else if (data) {
          // ASSUME: Playing but no track item means ad or transition
          setIsPlaying(data.is_playing);
        }
      } catch {
        // Token expired or network issue — silently degrade
      }
    };

    const fetchPlaylists = async () => {
      try {
        const pl = await getUserPlaylists();
        setPlaylists(pl);
      } catch {
        // Silently degrade — user can retry
      }
    };

    fetchTrack();
    fetchPlaylists();
    const interval = setInterval(fetchTrack, 5_000);
    return () => clearInterval(interval);
  }, [token]);

  // Local progress ticker
  useEffect(() => {
    if (isPlaying) {
      progressIntervalRef.current = window.setInterval(() => {
        setProgress(p => Math.min(p + 1000, duration));
      }, 1000);
    } else if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
    }
    return () => {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    };
  }, [isPlaying, duration]);

  useEffect(() => {
    if (!searchQuery) { setSearchResults([]); return; }
    const timer = setTimeout(async () => {
      if (!token) return;
      try {
        const res = await searchTracks(searchQuery);
        setSearchResults(res);
      } catch (e) { console.error(e); }
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery, token]);

  const handlePlayPause = async () => {
    if (!token) return;
    try {
      if (isPlaying) { await pauseTrack(); setIsPlaying(false); }
      else           { await playTrack();  setIsPlaying(true);  }
    } catch (e) { console.error('[Spotify] Play/pause error:', e); }
  };

  const handleNext = async () => {
    if (!token) return;
    try {
      await nextTrack();
      setTimeout(async () => {
        const d = await getCurrentTrack();
        if (d?.item) { setTrack(d.item); setIsPlaying(d.is_playing); }
      }, 1000);
    } catch (e) { console.error('[Spotify] Next error', e); }
  };

  const handlePlaylistClick = async (pl: SpotifyPlaylist) => {
    setSelectedPlaylist(pl);
    if (!token) return;
    try {
      const tracks = await getPlaylistTracks(pl.id);
      setPlaylistTracks(tracks);
    } catch (e) { console.error(e); }
  };

  const handlePlaySpecificTrack = async (contextUri?: string, trackUri?: string) => {
    if (!token) return;
    try {
      if (contextUri && trackUri) await playTrack(contextUri, undefined, trackUri);
      else if (trackUri)          await playTrack(undefined, [trackUri]);
      else if (contextUri)        await playTrack(contextUri);
      setIsPlaying(true);
      setTimeout(async () => {
        const d = await getCurrentTrack();
        if (d?.item) setTrack(d.item);
      }, 1000);
    } catch (e) { console.error(e); }
  };

  if (!isSpotifyWidgetOpen) return null;

  if (!token) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="fixed bottom-24 right-4 md:bottom-6 md:right-6 z-[60] flex items-center gap-4 p-4 border border-[#1DB954]/30 rounded-2xl bg-zinc-950/80 backdrop-blur-xl shadow-2xl"
      >
        <div className="w-12 h-12 bg-[#1DB954] rounded-full flex items-center justify-center text-white shadow-lg shadow-[#1DB954]/20 overflow-hidden">
          <SpotifyLogo size={24} />
        </div>
        <div className="flex-1">
          <h4 className="text-sm font-bold text-white tracking-tight">Spotify Bağlantısı</h4>
          <p className="text-[10px] text-zinc-500 font-medium tracking-wide">Odak moduna geçmek için bağla</p>
        </div>
        <button
          onClick={loginWithSpotify}
          className="px-4 py-2 bg-[#1DB954] text-black rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-[#1ed760] transition-all hover:scale-105 active:scale-95 shadow-md shadow-[#1DB954]/30"
        >
          Bağlan
        </button>
      </motion.div>
    );
  }

  return (
    <div ref={containerRef} className="fixed bottom-24 right-4 md:bottom-6 md:right-6 z-[60]">
      <AnimatePresence>
        {isCollapsed ? (
          <motion.button
            key="collapsed"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 50 }}
            onClick={() => setIsCollapsed(false)}
            className="flex items-center gap-3 pl-4 pr-3 py-3 bg-zinc-950/80 backdrop-blur-xl border border-white/10 rounded-l-2xl shadow-2xl text-[#1DB954] hover:text-[#1ed760] transition-colors group"
          >
            <div className="flex flex-col items-center gap-1">
              <ChevronLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
            </div>
            <SpotifyLogo size={18} className={isPlaying ? 'animate-bounce' : ''} />
            {isPlaying && (
              <div className="flex gap-1 items-end h-4 pr-1">
                {[...Array(3)].map((_, i) => (
                  <motion.span 
                    key={i}
                    animate={{ height: ['40%', '100%', '60%'] }}
                    transition={{ repeat: Infinity, duration: 0.8, delay: i * 0.2 }}
                    className="w-1 bg-[#1DB954] rounded-full" 
                  />
                ))}
              </div>
            )}
          </motion.button>
        ) : (
          <motion.div
            key="expanded"
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="flex flex-col gap-2"
          >
            <AnimatePresence>
              {showPanel && (
                <motion.div 
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="w-80 h-[450px] flex flex-col bg-zinc-950/90 backdrop-blur-3xl border border-white/10 rounded-3xl shadow-2xl overflow-hidden"
                >
                  <div className="flex p-1 bg-white/5 m-2 rounded-2xl shrink-0">
                    <button
                      onClick={() => { setActiveTab('playlists'); setSelectedPlaylist(null); }}
                      className={`flex-1 py-2.5 text-[10px] font-bold uppercase tracking-widest rounded-xl transition-all ${activeTab === 'playlists' ? 'text-white bg-white/10 shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}
                    >
                      Kütüphane
                    </button>
                    <button
                      onClick={() => { setActiveTab('search'); setSelectedPlaylist(null); }}
                      className={`flex-1 py-2.5 text-[10px] font-bold uppercase tracking-widest rounded-xl transition-all ${activeTab === 'search' ? 'text-white bg-white/10 shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}
                    >
                      Keşfet
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto px-4 pb-4 custom-scrollbar">
                    {activeTab === 'playlists' && !selectedPlaylist && (
                      <div className="grid grid-cols-2 gap-3 py-2">
                        {playlists.map(pl => (
                          <motion.button
                            whileHover={{ y: -4 }}
                            key={pl.id}
                            onClick={() => handlePlaylistClick(pl)}
                            className="flex flex-col gap-2 group text-left"
                          >
                            <div className="aspect-square rounded-2xl overflow-hidden bg-white/5 border border-white/5 group-hover:border-[#1DB954]/50 transition-colors">
                              {pl.images?.[0] 
                                ? <img src={pl.images[0].url} className="w-full h-full object-cover" alt="" />
                                : <div className="w-full h-full flex items-center justify-center"><SpotifyLogo size={24} className="opacity-20" /></div>
                              }
                            </div>
                            <span className="text-[10px] font-bold text-zinc-100 truncate w-full px-1">{pl.name}</span>
                          </motion.button>
                        ))}
                      </div>
                    )}

                    {activeTab === 'playlists' && selectedPlaylist && (
                      <div className="space-y-4 py-2">
                        <button 
                          onClick={() => setSelectedPlaylist(null)}
                          className="flex items-center gap-2 text-zinc-500 hover:text-[#1DB954] transition-colors text-[10px] font-bold uppercase tracking-wider mb-2"
                        >
                          <ChevronLeft size={14} /> Geri Dön
                        </button>
                        <div className="space-y-1">
                          {playlistTracks.map(t => (
                            <button key={t.id} onClick={() => handlePlaySpecificTrack(selectedPlaylist.uri, t.uri)} className="w-full flex items-center gap-3 p-2 hover:bg-white/5 rounded-xl group transition-all">
                              <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0 border border-white/5">
                                <img src={t.album?.images?.[0]?.url} className="w-full h-full object-cover" alt="" />
                              </div>
                              <div className="flex-1 text-left min-w-0">
                                <p className="text-[11px] font-bold text-zinc-100 truncate group-hover:text-[#1DB954] transition-colors">{t.name}</p>
                                <p className="text-[9px] text-zinc-500 truncate">{t.artists.map(a => a.name).join(', ')}</p>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {activeTab === 'search' && (
                      <div className="space-y-4 py-2">
                        <div className="relative">
                          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
                          <input
                            type="text"
                            placeholder="Şarkı, sanatçı ara..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 pl-10 pr-4 text-xs font-medium focus:outline-none focus:border-[#1DB954]/50 text-white placeholder-zinc-600 transition-all"
                          />
                        </div>
                        <div className="space-y-1">
                          {searchResults.map(t => (
                            <button key={t.id} onClick={() => handlePlaySpecificTrack(undefined, t.uri)} className="w-full flex items-center gap-3 p-2 hover:bg-white/5 rounded-xl group transition-all">
                              <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0 border border-white/5">
                                <img src={t.album?.images?.[0]?.url} className="w-full h-full object-cover" alt="" />
                              </div>
                              <div className="flex-1 text-left min-w-0">
                                <p className="text-xs font-bold text-zinc-100 truncate group-hover:text-[#1DB954] transition-colors">{t.name}</p>
                                <p className="text-[10px] text-zinc-500 truncate">{t.artists.map(a => a.name).join(', ')}</p>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <motion.div 
              className="w-80 bg-zinc-950/80 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-2xl overflow-hidden relative group"
              whileHover={{ scale: 1.01 }}
            >
              <button
                onClick={() => { setIsCollapsed(true); setShowPanel(false); }}
                className="absolute top-2 right-2 w-6 h-6 bg-zinc-800/50 border border-white/10 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-zinc-400 hover:text-white z-20"
              >
                <PanelRightClose size={12} />
              </button>

              <div className="p-3 flex items-center gap-3">
                <div className="relative shrink-0">
                  <div className={`w-12 h-12 rounded-2xl overflow-hidden border border-white/10 shadow-lg ${isPlaying ? 'animate-[spin_12s_linear_infinite]' : ''}`}>
                    {track?.album?.images?.[0] ? (
                      <img src={track.album.images[0].url} className="w-full h-full object-cover" alt="" />
                    ) : (
                      <div className="w-full h-full bg-zinc-900 flex items-center justify-center text-[#1DB954]">
                        <SpotifyLogo size={20} />
                      </div>
                    )}
                  </div>
                  {isPlaying && (
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-[#1DB954] rounded-full flex items-center justify-center border-2 border-zinc-950 shadow-lg shadow-[#1DB954]/40">
                      <div className="flex gap-[1px] items-end h-2">
                         <motion.span animate={{ height: [4, 8, 5] }} transition={{ repeat: Infinity, duration: 0.6 }} className="w-[1.5px] bg-white rounded-full" />
                         <motion.span animate={{ height: [2, 8, 3] }} transition={{ repeat: Infinity, duration: 0.5, delay: 0.1 }} className="w-[1.5px] bg-white rounded-full" />
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <h4 className="text-[11px] font-black text-white truncate tracking-tight">{track ? track.name : 'Boho Odak'}</h4>
                  <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest truncate mt-0.5">{track ? track.artists.map(a => a.name).join(', ') : 'Zihninle Bağlan'}</p>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button 
                    onClick={() => setShowPanel(!showPanel)}
                    className={`p-2 rounded-xl transition-all ${showPanel ? 'text-[#1DB954] bg-[#1DB954]/10' : 'text-zinc-500 hover:text-white hover:bg-white/5'}`}
                  >
                    <Search size={16} />
                  </button>
                  <button 
                    onClick={handlePlayPause}
                    className="p-2 text-white hover:text-[#1DB954] transition-all transform active:scale-90"
                  >
                    {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
                  </button>
                  <button 
                    onClick={handleNext}
                    className="p-2 text-white hover:text-[#1DB954] transition-all transform active:scale-90"
                  >
                    <SkipForward size={18} fill="currentColor" />
                  </button>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="h-1 bg-white/5 w-full overflow-hidden">
                <motion.div 
                   className="h-full bg-[#1DB954] rounded-r-full shadow-[0_0_8px_#1DB954]"
                   initial={{ width: 0 }}
                   animate={{ width: duration > 0 ? `${(progress / duration) * 100}%` : 0 }}
                   transition={{ ease: "linear", duration: 1 }}
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
