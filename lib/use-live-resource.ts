"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** Refresh data without reloading the document or replacing form state. */
export function useLiveResource<T>(initial: T, path: string, { interval = 30000, paused = false } = {}) {
  const [data, setData] = useState(initial);
  const [error, setError] = useState("");
  const [checkedAt, setCheckedAt] = useState("");
  const active = useRef(true);
  const generation = useRef(0);
  const inFlight = useRef<AbortController | null>(null);
  const refresh = useCallback(async () => {
    if (inFlight.current) return;
    const requestGeneration = generation.current;
    const controller = new AbortController();
    inFlight.current = controller;
    const timeout = window.setTimeout(() => controller.abort(), 12000);
    try {
      const response = await fetch(`/api/dashboard/proxy/${path}`, { cache: "no-store", signal: controller.signal });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const next: T = await response.json();
      if (active.current && generation.current === requestGeneration && !controller.signal.aborted) { setData(next); setError(""); setCheckedAt(new Date().toISOString()); }
    } catch {
      if (active.current && generation.current === requestGeneration) setError("최신 자료를 확인하지 못했어요");
    } finally {
      window.clearTimeout(timeout);
      if (inFlight.current === controller) inFlight.current = null;
    }
  }, [path]);
  useEffect(() => {
    active.current = true;
    const update = () => { if (!paused && document.visibilityState === "visible") void refresh(); };
    queueMicrotask(() => { if (active.current) update(); });
    const timer = window.setInterval(update, interval);
    window.addEventListener("focus", update);
    document.addEventListener("visibilitychange", update);
    return () => {
      active.current = false;
      generation.current += 1;
      window.clearInterval(timer);
      window.removeEventListener("focus", update);
      document.removeEventListener("visibilitychange", update);
      inFlight.current?.abort();
    };
  }, [refresh, interval, paused]);
  return { data, refresh, error, checkedAt };
}
