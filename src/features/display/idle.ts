// Tilbake til «Alle» på familieskjermen når ingen har rørt den på en stund.
// Ren timer uten React, så den kan testes med falske timere. Se useIdleReset.ts.

/** Personvisningen går tilbake til «Alle» etter 2 minutter uten berøring. */
export const DISPLAY_IDLE_MS = 2 * 60_000;

export type IdleTimer = {
  /** Noen rørte skjermen: tiden starter på nytt. */
  touch: () => void;
  /** Ingen flere kall til onIdle. */
  stop: () => void;
};

/** onIdle kalles én gang når det har gått ms siden siste touch(). Starter ved første touch(). */
export function createIdleTimer(ms: number, onIdle: () => void): IdleTimer {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const stop = () => {
    if (timer !== undefined) clearTimeout(timer);
    timer = undefined;
  };
  return {
    touch: () => {
      stop();
      timer = setTimeout(() => {
        timer = undefined;
        onIdle();
      }, ms);
    },
    stop,
  };
}
