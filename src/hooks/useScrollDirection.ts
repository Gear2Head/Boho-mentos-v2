import { useEffect, useState } from "react";

/**
 * [UI-003]: Scroll direction detection for auto-hiding mobile bottom nav.
 * Returns "up" or "down" based on scroll direction.
 */
export function useScrollDirection() {
  const [direction, setDirection] = useState<"up" | "down">("up");

  useEffect(() => {
    if (typeof window === "undefined") return;

    let lastScrollY = window.pageYOffset;
    let ticking = false;

    const updateScrollDirection = () => {
      const currentScrollY = window.pageYOffset;
      if (Math.abs(currentScrollY - lastScrollY) < 10) {
        ticking = false;
        return;
      }
      setDirection(currentScrollY > lastScrollY && currentScrollY > 60 ? "down" : "up");
      lastScrollY = currentScrollY > 0 ? currentScrollY : 0;
      ticking = false;
    };

    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(updateScrollDirection);
        ticking = true;
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return direction;
}
