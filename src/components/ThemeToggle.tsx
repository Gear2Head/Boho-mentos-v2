import React, { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';
import { useAppStore } from '../store/appStore';

export function ThemeToggle() {
  const theme = useAppStore(s => s.theme);
  const setTheme = useAppStore(s => s.setTheme);
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== 'undefined') {
      return document.documentElement.classList.contains('dark') || 
             localStorage.getItem('theme') === 'dark';
    }
    return false;
  });

  useEffect(() => {
    setIsDark(theme === 'dark');
  }, [theme]);

  return (
    <button 
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className="relative w-14 h-8 flex items-center bg-[#EAE6DF] dark:bg-zinc-800 rounded-full p-1 cursor-pointer transition-colors"
      aria-label="Temayı Değiştir"
    >
      <div 
        className={`bg-white dark:bg-zinc-950 w-6 h-6 rounded-full shadow-md transform transition-transform flex items-center justify-center ${
          isDark ? 'translate-x-6' : 'translate-x-0'
        }`}
      >
        {isDark ? <Moon size={14} className="text-zinc-200" /> : <Sun size={14} className="text-[#C17767]" />}
      </div>
    </button>
  );
}
