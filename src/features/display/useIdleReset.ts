import { useCallback, useEffect, useRef } from 'react';
import { createIdleTimer, DISPLAY_IDLE_MS, type IdleTimer } from './idle';

/**
 * Kaller onIdle når skjermen ikke er rørt på ms, så lenge active er satt. Returnerer touch, som
 * skjermen kaller ved hver berøring (onTouchStart på roten).
 */
export function useIdleReset(active: boolean, onIdle: () => void, ms = DISPLAY_IDLE_MS): () => void {
  const onIdleRef = useRef(onIdle);
  const timerRef = useRef<IdleTimer | null>(null);

  useEffect(() => {
    onIdleRef.current = onIdle;
  }, [onIdle]);

  useEffect(() => {
    if (!active) return;
    const timer = createIdleTimer(ms, () => onIdleRef.current());
    timerRef.current = timer;
    timer.touch();
    return () => {
      timer.stop();
      timerRef.current = null;
    };
  }, [active, ms]);

  return useCallback(() => timerRef.current?.touch(), []);
}
