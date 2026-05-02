import { useEffect } from 'react';
import { getMobileRuntimeCapabilities } from '../services/mobileCapabilities';

export function useAndroidView() {
  useEffect(() => {
    const caps = getMobileRuntimeCapabilities();
    document.documentElement.dataset.standalone = String(caps.standalone);
    document.documentElement.dataset.haptics = String(caps.vibration);
    document.documentElement.dataset.camera = String(caps.camera);
  }, []);
}
