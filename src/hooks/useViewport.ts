/**
 * AMAÇ: Ekran kırılımlarını merkezi ve reaktif yönetmek.
 * MANTIK: window resize + orientation dinleme ile SSR-safe viewport bilgisi döndürür.
 */
import { useCallback, useEffect, useState } from "react";

export type Breakpoint = "xs" | "sm" | "md" | "lg" | "xl";

export interface ViewportInfo {
  width: number;
  height: number;
  breakpoint: Breakpoint;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isSmall: boolean;
  orientation: "portrait" | "landscape";
}

const getBreakpoint = (width: number): Breakpoint => {
  if (width < 480) return "xs";
  if (width < 768) return "sm";
  if (width < 1024) return "md";
  if (width < 1280) return "lg";
  return "xl";
};

const computeInfo = (): ViewportInfo => {
  if (typeof window === "undefined") {
    return {
      width: 375,
      height: 812,
      breakpoint: "sm",
      isMobile: true,
      isTablet: false,
      isDesktop: false,
      isSmall: false,
      orientation: "portrait",
    };
  }
  const width = window.innerWidth;
  const height = window.innerHeight;
  return {
    width,
    height,
    breakpoint: getBreakpoint(width),
    isMobile: width < 768,
    isTablet: width >= 768 && width < 1024,
    isDesktop: width >= 1024,
    isSmall: width < 480,
    orientation: height >= width ? "portrait" : "landscape",
  };
};

export function useViewport(): ViewportInfo {
  const [info, setInfo] = useState<ViewportInfo>(() => computeInfo());

  const update = useCallback(() => {
    setInfo(computeInfo());
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.addEventListener("resize", update, { passive: true });
    window.addEventListener("orientationchange", update, { passive: true });
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
    };
  }, [update]);

  return info;
}

