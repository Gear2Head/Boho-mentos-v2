import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Music, Play, Pause, SkipForward, ExternalLink } from 'lucide-react';
import { useAppStore } from '../../store/appStore';

export function CompactSpotify() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [track, setTrack] = useState<{ name: string; artist: string; image: string } | null>(null);
  
  // Use casting to bypass missing property error until types are refreshed
  const spotifyToken = useAppStore(s => (s as any).spotifyToken);

  useEffect(() => {
    if (!spotifyToken) return;
    
    const fetchNowPlaying = async () => {
      try {
        const res = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
          headers: { Authorization: `Bearer ${spotifyToken}` }
        });
        if (res.status === 200) {
          const data = await res.json();
          if (data.item) {
            setTrack({
              name: data.item.name,
              artist: data.item.artists[0].name,
              image: data.item.album.images[0].url
            });
            setIsPlaying(data.is_playing);
          }
        }
      } catch (e) {
        console.error('Spotify fetch error:', e);
      }
    };

    fetchNowPlaying();
    const interval = setInterval(fetchNowPlaying, 30000);
    return () => clearInterval(interval);
  }, [spotifyToken]);

  if (!spotifyToken) {
    return (
      <div className="p-3 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl group hover:bg-emerald-500/10 transition-all cursor-pointer">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#1DB954] flex items-center justify-center text-black shadow-[0_0_15px_rgba(29,185,84,0.3)] group-hover:scale-110 transition-transform">
             <Music size={14} />
          </div>
          <div className="flex-1 min-w-0">
             <p className="text-[10px] font-black text-[#1DB954] uppercase tracking-widest leading-none">Spotify</p>
             <p className="text-[9px] text-zinc-500 font-bold truncate mt-1">Bağlan ve odaklan</p>
          </div>
        </div>
      </div>
    );
  }

  const displayTrack = track || {
    name: 'Lo-Fi Study Beats',
    artist: 'Chillhop Music',
    image: 'https://i.scdn.co/image/ab67616d0000b273b070445d045d94943f05f560'
  };

  return (
    <div className="p-3 bg-zinc-900/50 border border-white/5 rounded-2xl group relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent pointer-events-none" />
      
      <div className="flex items-center gap-3 relative z-10">
        <div className="relative w-10 h-10 shrink-0">
          <div className="absolute inset-0 bg-[#1DB954] rounded-xl blur-md opacity-20 group-hover:opacity-40 transition-opacity" />
          <img 
            src={displayTrack.image}
            className="w-full h-full rounded-xl object-cover border border-white/10 relative z-10 shadow-lg"
            alt="Track"
          />
          <button 
            onClick={() => setIsPlaying(!isPlaying)}
            className="absolute inset-0 z-20 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl"
          >
            {isPlaying ? <Pause size={16} className="text-white" fill="currentColor" /> : <Play size={16} className="text-white ml-0.5" fill="currentColor" />}
          </button>
        </div>

        <div className="flex-1 min-w-0">
           <div className="flex items-center gap-1.5">
              <div className="flex gap-0.5">
                 {[1, 2, 3, 4].map(i => (
                   <motion.div 
                     key={i}
                     animate={{ height: isPlaying ? [4, 10, 4] : 4 }}
                     transition={{ repeat: Infinity, duration: 0.5, delay: i * 0.1 }}
                     className="w-0.5 bg-[#1DB954] rounded-full"
                   />
                 ))}
              </div>
              <p className="text-[9px] font-black text-[#1DB954] uppercase tracking-widest leading-none">
                {isPlaying ? 'NOW PLAYING' : 'PAUSED'}
              </p>
           </div>
           <p className="text-[11px] font-bold text-zinc-100 truncate mt-1 leading-tight">{displayTrack.name}</p>
           <p className="text-[9px] text-zinc-500 font-bold truncate">{displayTrack.artist}</p>
        </div>

        <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
           <button className="p-1.5 hover:bg-white/5 rounded-lg text-zinc-400 hover:text-white transition-colors">
              <SkipForward size={14} />
           </button>
           <button className="p-1.5 hover:bg-white/5 rounded-lg text-zinc-400 hover:text-white transition-colors">
              <ExternalLink size={14} />
           </button>
        </div>
      </div>
    </div>
  );
}
