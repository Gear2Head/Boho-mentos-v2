/**
 * AMAÇ: Canvas boyutunu ResizeObserver ile piksel-mükemmel senkronize eder
 * MANTIK: CSS boyutu != intrinsic canvas boyutu — bu hook ikisini eşitler
 */

import { useEffect, useRef, useState, useCallback } from 'react';

interface CanvasDimensions {
  width: number;
  height: number;
}

export function useCanvasSync(enabled: boolean) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<any>(null);
  const [dims, setDims] = useState<CanvasDimensions>({ width: 800, height: 600 });

  useEffect(() => {
    if (!enabled || !containerRef.current) return;

    const handleResize = (entries: ResizeObserverEntry[]) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setDims({ width: Math.floor(width), height: Math.floor(height) });
      }
    };

    const ro = new ResizeObserver(handleResize);
    ro.observe(containerRef.current);

    const { width, height } = containerRef.current.getBoundingClientRect();
    setDims({ width: Math.floor(width), height: Math.floor(height) });

    return () => ro.disconnect();
  }, [enabled]);

  const clearCanvas = useCallback(() => {
    canvasRef.current?.clear?.();
  }, []);

  const undoCanvas = useCallback(() => {
    canvasRef.current?.undo?.();
  }, []);

  const exportCanvas = useCallback((): string | null => {
    try {
      return canvasRef.current?.getDataURL?.('image/png') ?? null;
    } catch {
      return null;
    }
  }, []);

  return { containerRef, canvasRef, dims, clearCanvas, undoCanvas, exportCanvas };
}
