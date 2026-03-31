/**
 * AMAÇ: Canvas (Kalem/Çizim) Katmanı
 * MANTIK: HTML5 Canvas + useCanvasSync hook ile resize sorununu giderir.
 */

import React, { useRef, useEffect, useState } from 'react';
import { useCanvasSync } from '../../hooks/useCanvasSync';
import { useAppStore } from '../../store/appStore';

export function CanvasLayer() {
  const store = useAppStore();
  const { containerRef, canvasRef, dims, clearCanvas, undoCanvas } = useCanvasSync(true);
  const [isDrawing, setIsDrawing] = useState(false);
  const ctxRef = useRef<CanvasRenderingContextEx | null>(null);

  // Expose methods to global/window if needed for toolbars, or use store integration
  useEffect(() => {
    (window as any)._canvasAPI = { clear: clearCanvas, undo: undoCanvas };
    return () => delete (window as any)._canvasAPI;
  }, [clearCanvas, undoCanvas]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Temel Ayarlar
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = store.theme === 'dark' ? '#EAE6DF' : '#2A2A2A'; 
    ctx.lineWidth = store.drawingMode === 'eraser' ? 20 : 2;
    ctxRef.current = ctx;

  }, [dims, store.theme, store.drawingMode]);

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    if (store.drawingMode === 'pointer') return;
    const { offsetX, offsetY } = getCoordinates(e);
    ctxRef.current?.beginPath();
    ctxRef.current?.moveTo(offsetX, offsetY);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || store.drawingMode === 'pointer') return;
    // Önleyen scroll sadece mobilde ve çiziyorsa
    e.preventDefault();
    const { offsetX, offsetY } = getCoordinates(e);
    if (!ctxRef.current) return;
    
    if (store.drawingMode === 'eraser') {
      ctxRef.current.globalCompositeOperation = 'destination-out';
      ctxRef.current.lineWidth = 20;
    } else {
      ctxRef.current.globalCompositeOperation = 'source-over';
      ctxRef.current.lineWidth = 2;
      ctxRef.current.strokeStyle = store.theme === 'dark' ? '#E5E7EB' : '#1F2937';
    }

    ctxRef.current.lineTo(offsetX, offsetY);
    ctxRef.current.stroke();
  };

  const stopDrawing = () => {
    ctxRef.current?.closePath();
    setIsDrawing(false);
  };

  const getCoordinates = (e: any) => {
    if (e.nativeEvent instanceof TouchEvent) {
      const bcr = canvasRef.current?.getBoundingClientRect();
      if (!bcr) return { offsetX: 0, offsetY: 0 };
      return {
        offsetX: e.nativeEvent.touches[0].clientX - bcr.left,
        offsetY: e.nativeEvent.touches[0].clientY - bcr.top,
      };
    }
    return {
      offsetX: e.nativeEvent.offsetX,
      offsetY: e.nativeEvent.offsetY,
    };
  };

  return (
    <div 
      ref={containerRef} 
      className={`absolute inset-0 z-20 ${store.drawingMode === 'pointer' ? 'pointer-events-none' : 'pointer-events-auto touch-none'}`}
    >
      <canvas
        ref={canvasRef}
        width={dims.width}
        height={dims.height}
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
        onTouchStart={startDrawing}
        onTouchMove={draw}
        onTouchEnd={stopDrawing}
        className="w-full h-full cursor-crosshair"
      />
    </div>
  );
}
