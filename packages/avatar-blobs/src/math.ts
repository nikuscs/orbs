export const TAU = Math.PI * 2;

export function clamp(v: number, lo = 0, hi = 1): number {
  if (v < lo) {
    return lo;
  }

  if (v > hi) {
    return hi;
  }

  return v;
}

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

type Easing = (t: number) => number;

/**
 * Measured on the reference video: transitions are exponential ease-outs and the body never
 * overshoots. The only springs are local (the notification pop, the eyes opening) and live in
 * the state that needs them.
 */
export const easings = {
  easeOutCubic: (t: number) => 1 - (1 - t) ** 3,
  easeInOutCubic: (t: number) => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2),
  easeOutQuint: (t: number) => 1 - (1 - t) ** 5,
} satisfies Record<string, Easing>;

/** Periodic 1D noise that loops seamlessly over `period`, for the gaze drift. */
export function loopNoise(t: number, period: number, seed = 0): number {
  const p = (t / period) * TAU;
  return 0.55 * Math.sin(p + seed) + 0.3 * Math.sin(2 * p + seed * 1.7 + 1.1) + 0.15 * Math.sin(3 * p + seed * 2.3 + 2.4);
}

/** Deterministic PRNG (mulberry32): the same sequence on every run, so renders replay exactly. */
export function createRng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;

    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Short rounding: halves the size of the path strings generated every frame. */
export const r2 = (v: number) => Math.round(v * 100) / 100;
