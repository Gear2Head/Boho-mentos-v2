import { useEffect } from 'react';

export function useAndroidView() {
  useEffect(() => {
    // PWA olduğu için artık Capacitor'a gerek yok.
    // Gerekirse manifesto ve CSS ile native-like davranılır.
  }, []);
}
