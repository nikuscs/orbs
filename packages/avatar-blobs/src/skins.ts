import { PROFILE_SAMPLES } from './profiles';
import { hullOfCircles, profileFromPolygon, regularPolygonProfile, superellipseProfile, unionOfCirclesProfile } from './silhouette';

/*
 * Bodies and colours offered as avatar choices. Unlike the animated silhouettes (`profiles.ts`),
 * these are NOT measured on the video: they are built analytically after the original
 * customiser's grid. Two sources on purpose: animated states stay true to the video, the base
 * bodies are a user choice.
 */

export type BodyId = 'circle' | 'pebble' | 'squircle' | 'capsule' | 'triangle' | 'hexagon' | 'cloud' | 'droplet';

export interface BotBody {
  id: BodyId
  radii: number[]
}

/** Scales the peak radius to `max`, so every body weighs the same to the eye. */
function normalize(radii: number[], max = 1): number[] {
  const peak = Math.max(...radii);

  if (peak <= 0) {
    return radii;
  }

  const k = max / peak;
  return radii.map((r) => r * k);
}

const ANGLES = Array.from({ length: PROFILE_SAMPLES }, (_, i) => (i / PROFILE_SAMPLES) * Math.PI * 2);

/** A circle bent by two low harmonics: irregular but smooth. */
const pebble = normalize(
  ANGLES.map((a) => 1 + 0.075 * Math.cos(2 * a + 0.5) + 0.035 * Math.cos(3 * a + 2.1)),
  1.02,
);

/** Union of bumps: wide at the bottom, two lobes on top. */
const cloud = normalize(
  unionOfCirclesProfile([
    { x: -0.44, y: 0.2, r: 0.54 },
    { x: 0.46, y: 0.2, r: 0.5 },
    { x: 0.02, y: 0.3, r: 0.6 },
    { x: -0.24, y: -0.3, r: 0.48 },
    { x: 0.3, y: -0.24, r: 0.44 },
  ]),
  1.02,
);

/** Big disc at the bottom, thin point on top. */
const droplet = normalize(profileFromPolygon(hullOfCircles(0, 0.28, 0.66, 0, -0.96, 0.05), 0, 0), 1.04);

/** Lying capsule: hull of two discs side by side. */
const capsule = profileFromPolygon(hullOfCircles(-0.42, 0, 0.62, 0.42, 0, 0.62), 0, 0);

export const BODIES: BotBody[] = [
  { id: 'circle', radii: Array.from({ length: PROFILE_SAMPLES }, () => 1) },
  { id: 'pebble', radii: pebble },
  // 1.15, not 1.02: a superellipse peaks on the diagonal, so normalising on it reads smaller than the circle
  { id: 'squircle', radii: normalize(superellipseProfile(4.2), 1.15) },
  { id: 'capsule', radii: capsule },
  // -90deg: a vertex at the top of the screen (y points down)
  { id: 'triangle', radii: regularPolygonProfile(3, 1.12, 0.34, -90) },
  // 0deg: vertices left and right, so the top and bottom edges are flat
  { id: 'hexagon', radii: regularPolygonProfile(6, 1.04, 0.26, 0) },
  { id: 'cloud', radii: cloud },
  { id: 'droplet', radii: droplet },
];

export const BODY_BY_ID = new Map<BodyId, BotBody>(BODIES.map((s) => [s.id, s]));
export const DEFAULT_BODY: BodyId = 'circle';

export type ColorId = 'ink' | 'cream' | 'brown' | 'red' | 'orange' | 'amber' | 'green' | 'turquoise' | 'blue' | 'violet' | 'pink' | 'grey';

export interface BotColor {
  id: ColorId
  hex: string
}

/** The original customiser's palette. */
export const COLORS: BotColor[] = [
  { id: 'ink', hex: '#0a0a0c' },
  { id: 'brown', hex: '#8b5e3c' },
  { id: 'red', hex: '#e8483f' },
  { id: 'orange', hex: '#f08a24' },
  { id: 'amber', hex: '#f0b429' },
  { id: 'green', hex: '#3ecf8e' },
  { id: 'turquoise', hex: '#2fbfa0' },
  { id: 'blue', hex: '#3b93f0' },
  { id: 'violet', hex: '#8b5cf6' },
  { id: 'pink', hex: '#e152b0' },
  { id: 'grey', hex: '#a3a3a3' },
  { id: 'cream', hex: '#f1efe9' },
];

export const COLOR_BY_ID = new Map<ColorId, BotColor>(COLORS.map((c) => [c.id, c]));

/** Colours that vanish on one theme's background, so the avatar inverts there: near black on dark, near white on light. */
export const INVERT_ON_DARK: ColorId[] = ['ink'];
export const INVERT_ON_LIGHT: ColorId[] = ['cream'];
export const DEFAULT_COLOR: ColorId = 'ink';

/** Mixes two hex colours: the depth haze of the burst particles. */
export function mixHex(from: string, to: string, t: number): string {
  const parse = (h: string) => {
    const v = Number.parseInt(h.slice(1), 16);
    return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
  };

  const a = parse(from);
  const b = parse(to);
  const c = a.map((x, i) => Math.round(x + (b[i] - x) * t));
  return `#${c.map((x) => x.toString(16).padStart(2, '0')).join('')}`;
}
