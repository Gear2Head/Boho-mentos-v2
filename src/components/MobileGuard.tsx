/**
 * AMAÇ: Mobil taşmaları ve safe viewport bozulmalarını engellemek.
 * MANTIK: İçeriği viewport kırılımına göre güvenli kapsayıcıya sarar.
 */
import React from "react";

interface MobileGuardProps {
  children: React.ReactNode;
  className?: string;
}

export function MobileGuard({ children, className = "" }: MobileGuardProps) {
  const containerClass = "w-full max-w-full overflow-x-hidden";

  return <div className={`${containerClass} ${className}`}>{children}</div>;
}

