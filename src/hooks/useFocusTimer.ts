import { useState, useEffect, useCallback, useRef } from 'react';

export interface FocusSession {
  id: string;
  startTime: string;
  durationInSeconds: number;
}

export function useFocusTimer() {
  const [sessionSeconds, setSessionSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [mode, setMode] = useState<'up' | 'down'>('up');
  const [laps, setLaps] = useState<FocusSession[]>([]);
  const saveTimerRef = useRef<number | null>(null);

  // LocalStorage senkronizasyonu
  useEffect(() => {
    try {
      if (typeof window === 'undefined') return;
      const saved = window.localStorage.getItem('yks_focus_timer');
      if (!saved) return;
      const parsed = JSON.parse(saved);
      setSessionSeconds(parsed.sessionSeconds || 0);
      setMode(parsed.mode || 'up');
      setLaps(parsed.laps || []);
    } catch {
      return;
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    saveTimerRef.current = window.setTimeout(() => {
      try {
        window.localStorage.setItem('yks_focus_timer', JSON.stringify({ sessionSeconds, laps, mode }));
      } catch {
        return;
      }
    }, 5000);
    return () => {
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    };
  }, [sessionSeconds, laps, mode]);

  // Kronometre
  useEffect(() => {
    let interval: number | undefined;
    if (isRunning) {
      interval = window.setInterval(() => {
        setSessionSeconds(prev => {
          if (mode === 'down') {
            if (prev <= 1) {
              setIsRunning(false);
              return 0;
            }
            return prev - 1;
          }
          return prev + 1;
        });
      }, 1000);
    }
    return () => {
      if (interval !== undefined) window.clearInterval(interval);
    };
  }, [isRunning, mode]);

  const start = useCallback(() => setIsRunning(true), []);
  const pause = useCallback(() => setIsRunning(false), []);
  const reset = useCallback(() => {
    setIsRunning(false);
    setSessionSeconds(0);
  }, []);

  const setDuration = useCallback((seconds: number) => {
    setSessionSeconds(seconds);
    setMode('down');
  }, []);

  const setStopwatch = useCallback(() => {
    setSessionSeconds(0);
    setMode('up');
  }, []);

  const addLap = useCallback(() => {
    if (sessionSeconds === 0) return;
    const newLap: FocusSession = {
      id: Date.now().toString(),
      startTime: new Date().toISOString(),
      durationInSeconds: sessionSeconds,
    };
    setLaps(prev => [...prev, newLap]);
    setSessionSeconds(0);
    setIsRunning(false); // Lap eklendiğinde mola başlar
    return newLap;
  }, [sessionSeconds]);

  const formatTime = (totalSeconds: number) => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${h > 0 ? h.toString().padStart(2, '0') + ':' : ''}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return {
    sessionSeconds,
    formattedTime: formatTime(sessionSeconds),
    isRunning,
    mode,
    start,
    pause,
    reset,
    setDuration,
    setStopwatch,
    addLap,
    laps,
    formatTime
  };
}
