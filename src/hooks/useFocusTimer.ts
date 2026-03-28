import { useState, useEffect, useCallback } from 'react';

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

  // LocalStorage senkronizasyonu
  useEffect(() => {
    const saved = localStorage.getItem('yks_focus_timer');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setSessionSeconds(parsed.sessionSeconds || 0);
        setMode(parsed.mode || 'up');
        setLaps(parsed.laps || []);
      } catch (e) {}
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('yks_focus_timer', JSON.stringify({ sessionSeconds, laps, mode }));
  }, [sessionSeconds, laps, mode]);

  // Kronometre
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRunning) {
      interval = setInterval(() => {
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
    return () => clearInterval(interval);
  }, [isRunning]);

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
