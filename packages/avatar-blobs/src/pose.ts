import { EYE_H, EYE_SPLIT, EYE_W, REST_GAZE } from './face';
import { clamp, TAU } from './math';
import { circle, hullOfCircles, polyPath, profileFromPolygon, silhouette } from './silhouette';
import type { ArcSpec, DotRender } from './decor';
import type { HeadGaze } from './face';
import type { Silhouette } from './silhouette';

export interface EyeCfg {
  /** local width (short axis of the capsule), in ball radii */
  w: number
  /** local height (long axis) */
  h: number
  /** 1 open, 0 closed */
  open: number
  /**
   * The capsule's own tilt in degrees, positive leans the top right. Applied AFTER the sphere's
   * tangent frame. Without it both eyes always lean the same way (the head roll), and anger or
   * sadness, which need mirrored tilts, are out of reach.
   */
  tilt?: number
}

export interface Pose {
  /** body silhouette, in ball radii */
  sil: Silhouette
  /** global offset of the body AND the eyes */
  offX: number
  offY: number
  gaze: HeadGaze
  /** half the eye spacing on the sphere, in degrees */
  split: number
  /** inner eye, outer eye */
  eyes: [EyeCfg, EyeCfg]
  /** eye opacity, for faceless states */
  eyeAlpha: number
  bodyAlpha: number
  dots: DotRender[]
  arcs: ArcSpec[]
  notif: { x: number; y: number; r: number; notch: number } | null
  /** true sends the decor behind the body (the burst particles) */
  dotsBehind: boolean
}

export const pair = (w: number, h: number): [EyeCfg, EyeCfg] => [
  { w, h, open: 1 },
  { w, h, open: 1 },
];

export function base(over: Partial<Pose> = {}): Pose {
  return {
    sil: circle(1),
    offX: 0,
    offY: 0,
    gaze: { ...REST_GAZE },
    split: EYE_SPLIT,
    eyes: pair(EYE_W, EYE_H),
    eyeAlpha: 1,
    bodyAlpha: 1,
    dots: [],
    arcs: [],
    notif: null,
    dotsBehind: false,
    ...over,
  };
}

/*
 * Bar of the upright "!": convex hull of two circles. Measured: top circle (0, -0.505) r 0.132,
 * bottom circle (0, +0.130) r 0.075, straight flanks, so it tapers (top/bottom ratio 1.76).
 */
const BAR_UPRIGHT_CY = -0.1875;
const BAR_UPRIGHT = profileFromPolygon(hullOfCircles(0, -0.505, 0.132, 0, 0.13, 0.075), 0, BAR_UPRIGHT_CY);

/** Bar of the slanted "!": a pure capsule (constant width 0.269, length 0.776). */
const BAR_ITALIC = profileFromPolygon(hullOfCircles(0, -0.2535, 0.1345, 0, 0.2535, 0.1345), 0, 0);

export const barUpright = (pose: Partial<Silhouette> = {}): Silhouette => ({
  radii: [...BAR_UPRIGHT],
  rot: 0,
  cx: 0,
  cy: BAR_UPRIGHT_CY,
  sx: 1,
  sy: 1,
  ...pose,
});

export const barItalic = (pose: Partial<Silhouette> = {}): Silhouette => ({
  radii: [...BAR_ITALIC],
  rot: 0,
  cx: 0,
  cy: 0,
  sx: 1,
  sy: 1,
  ...pose,
});

/**
 * The slanted "!" dot is not a disc but a teardrop: round end (r 0.118) towards the bar, thin
 * point opposite, 0.300 long along the glyph axis. Centred on the round end.
 */
export const TEAR = polyPath(hullOfCircles(0, 0, 0.118, 0, 0.172, 0.012));

/**
 * The triangle does not spin in place: its centre travels a circle of radius 0.213 around the
 * origin (measured). That offset is what makes it read as tumbling rather than pivoting.
 */
const TRI_ORBIT = 0.213;

export function spinningTriangle(rot: number): Silhouette {
  return silhouette('triangle', {
    rot,
    cx: -TRI_ORBIT * Math.sin(rot),
    cy: TRI_ORBIT * Math.cos(rot),
  });
}

/** Pulse wave running through the three dots from left to right. */
export function dotPulse(t: number, index: number): number {
  const p = ((((t - index * 0.5) / 1.5) % 1) + 1) % 1;
  const k = p < 0.5 ? 0.5 - 0.5 * Math.cos(p * TAU) : 0;
  return clamp(k * 2);
}
