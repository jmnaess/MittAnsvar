import { createIdleTimer, DISPLAY_IDLE_MS } from '../idle';

describe('createIdleTimer', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('går tilbake etter 2 minutter uten berøring', () => {
    expect(DISPLAY_IDLE_MS).toBe(120_000);
    const onIdle = jest.fn();
    const timer = createIdleTimer(DISPLAY_IDLE_MS, onIdle);
    timer.touch();
    jest.advanceTimersByTime(DISPLAY_IDLE_MS - 1);
    expect(onIdle).not.toHaveBeenCalled();
    jest.advanceTimersByTime(1);
    expect(onIdle).toHaveBeenCalledTimes(1);
  });

  it('en berøring starter tiden på nytt', () => {
    const onIdle = jest.fn();
    const timer = createIdleTimer(DISPLAY_IDLE_MS, onIdle);
    timer.touch();
    jest.advanceTimersByTime(90_000);
    timer.touch();
    jest.advanceTimersByTime(90_000);
    expect(onIdle).not.toHaveBeenCalled();
    jest.advanceTimersByTime(30_000);
    expect(onIdle).toHaveBeenCalledTimes(1);
  });

  it('kalles bare én gang per stille periode', () => {
    const onIdle = jest.fn();
    const timer = createIdleTimer(DISPLAY_IDLE_MS, onIdle);
    timer.touch();
    jest.advanceTimersByTime(DISPLAY_IDLE_MS * 3);
    expect(onIdle).toHaveBeenCalledTimes(1);
  });

  it('stop() hindrer kallet', () => {
    const onIdle = jest.fn();
    const timer = createIdleTimer(DISPLAY_IDLE_MS, onIdle);
    timer.touch();
    timer.stop();
    jest.advanceTimersByTime(DISPLAY_IDLE_MS);
    expect(onIdle).not.toHaveBeenCalled();
  });

  it('starter ikke før første berøring', () => {
    const onIdle = jest.fn();
    createIdleTimer(DISPLAY_IDLE_MS, onIdle);
    jest.advanceTimersByTime(DISPLAY_IDLE_MS);
    expect(onIdle).not.toHaveBeenCalled();
  });
});
