"use client";
import { useEffect, useState } from "react";

import { getHealth, getSystemStats } from "@/lib/api";
import type { HealthStatus, SystemStats } from "@/lib/types";

export function useSystemStats(intervalMs = 3000) {
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [health, setHealth] = useState<HealthStatus | null>(null);

  useEffect(() => {
    let alive = true;
    const poll = async () => {
      try {
        const [s, h] = await Promise.all([getSystemStats(), getHealth()]);
        if (alive) {
          setStats(s);
          setHealth(h);
        }
      } catch {
        if (alive) setHealth(null);
      }
    };
    void poll();
    const t = setInterval(poll, intervalMs);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [intervalMs]);

  return { stats, health };
}
