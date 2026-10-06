/*
 * Where to put the face on a chosen body.
 *
 * The eyes live on a sphere and `radiusAtAngle` pulls them onto the real outline in proportion to
 * the local radius. That places their CENTRE, but an eye has a size: the margin left before the
 * edge shrinks by the same factor, so a body that is narrow in that direction pushes the eye
 * into the edge until the mask opens it outwards. The capsule showed as a notch in the body on
 * `capsule`, `triangle`, `cloud` and `droplet`.
 *
 * This module solves that ONCE, at import, and returns a table of offsets. That choice is the
 * whole fix, far more than the geometry below. Solved in the render loop, the correction reacts
 * to everything that moves sixty times a second (gaze drift, pointer, an expression mid-morph,
 * which edge is nearest, which eye is tightest). Seven per-frame variants were written and every
 * one trembled. The engine instead interpolates between two table constants on the boundaries of
 * each morph, which is monotonic by construction.
 *
 * Since the solver never runs during animation it has no continuity constraint, so it can probe a
 * whole fan of directions and cover the worst case of the gaze drift. The table is a module
 * constant built from pure data, deterministic and stateless like the blink schedule in
 * `face.ts`, so `engine.sample(t)` stays pure.
 */

import { EXPRESSIONS } from './expressions';
import { eyePoses } from './face';
import { clamp } from './math';
import { radiusAtAngle, toPoints } from './silhouette';
import { BODIES } from './skins';
import { STATES } from './states';
import type { BotExpression } from './expressions';
import type { Pose } from './pose';
import type { Point } from './silhouette';
import type { StateDef, StateId } from './states';

/** Reference radius of the solver; the returned offset is in units of it. */
const R = 100;

/*
 * Peak amplitudes of the idle life, read off `liveliness`: `loopNoise` is bounded by 1, so these
 * sums are exact bounds. They must be covered, or the fix is right on the nominal pose and wrong
 * a second later: 7 degrees of yaw move the eye about twelve units on a radius-100 ball. That is
 * exactly what let `capsule` + `scared` overflow while a single-instant check passed it.
 */
const DRIFT_YAW = 5.5 + 1.6;
const DRIFT_PITCH = 4.2 + 1.3;
/** Centre float, in ball radii. */
const DRIFT_X = 0.006;
const DRIFT_Y = 0.007;

interface Face {
  gaze: Pose['gaze']
  split: number
  eyes: Pose['eyes']
}

/*
 * A capsule ready to measure: its axis segment, and what is needed to compute the radius to
 * clear IN A GIVEN DIRECTION. A capsule is a segment thickened by a disc of radius `r`, so its
 * image under the tangent matrix is a segment thickened by an ELLIPSE, and the radius to clear
 * depends on the direction: the ellipse's support function, `r * |A^T u|`. Taking its largest
 * singular value instead is conservative but wrong in the one direction that matters: the
 * reference margin on the circle came out NEGATIVE and 34 combinations kept overflowing.
 */
interface Footprint {
  /** centre, in viewBox units */
  x: number
  y: number
  /** half axis vector */
  ax: number
  ay: number
  /** local disc radius, before the transform */
  r: number
  /** tangent matrix columns, for the support function */
  m: [number, number, number, number]
}

/** Footprints of a face's two eyes on a profile. Blinks are left out: a closed eye needs no room. */
function footprints(face: Face, sil: Pose['sil'], radii: number[]): Footprint[] {
  const out: Footprint[] = [];
  const poses = eyePoses(face.gaze, R, face.split);

  for (let i = 0; i < 2; i++) {
    const e = poses[i];

    if (e.depth <= 0.02) {
      continue;
    }

    const cfg = face.eyes[i];
    const phi = ((cfg.tilt ?? 0) * Math.PI) / 180;
    const cp = Math.cos(phi);
    const sp = Math.sin(phi);
    const ax = e.a * cp + e.c * sp;
    const ay = e.b * cp + e.d * sp;
    const cx = -e.a * sp + e.c * cp;
    const cy = -e.b * sp + e.d * cp;

    const hw = Math.max(cfg.w * R, 0.01) / 2;
    const hh = Math.max(cfg.h * R, 0.01) / 2;
    const r = Math.min(hw, hh);
    // the axis runs along the larger dimension
    const long = hh > hw;
    const half = long ? hh - r : hw - r;
    // the local-radius pro rata, exactly as the engine does it
    const fit = radiusAtAngle(radii, Math.atan2(e.y, e.x) - sil.rot);
    out.push({
      x: e.x * fit,
      y: e.y * fit,
      ax: (long ? cx : ax) * half,
      ay: (long ? cy : ay) * half,
      r,
      m: [ax, ay, cx, cy],
    });
  }

  return out;
}

/**
 * Closest approach between an outline and a segment: the distance, and the unit vector from the
 * outline to the segment (the direction that clears). Both come out of ONE pass: computing them
 * apart doubled the only real cost of this module.
 */
function nearest(pts: Point[], x0: number, y0: number, x1: number, y1: number) {
  const sx = x1 - x0;
  const sy = y1 - y0;
  const len2 = sx * sx + sy * sy;
  let best = Infinity;
  let vx = 0;
  let vy = 0;

  for (const p of pts) {
    const t = clamp(len2 > 0 ? ((p.x - x0) * sx + (p.y - y0) * sy) / len2 : 0);
    const ex = x0 + t * sx - p.x;
    const ey = y0 + t * sy - p.y;
    const d2 = ex * ex + ey * ey;

    if (d2 < best) {
      best = d2;
      vx = ex;
      vy = ey;
    }
  }

  const d = Math.sqrt(best);
  return { d, ux: d > 1e-9 ? vx / d : 0, uy: d > 1e-9 ? vy / d : 0 };
}

/** Capsules to fit in an outline, plus the reference outline. */
interface Trial {
  footprints: Footprint[]
  reference: Footprint[]
  outline: Point[]
  referenceOutline: Point[]
}

/** Idle centre float in viewBox units, added to the capsule radius: under one unit, cheaper than four more trials. */
const FLOAT = Math.hypot(DRIFT_X, DRIFT_Y) * R;

/** Margin of the tightest capsule, and the direction that clears it. */
function tightest(pts: Point[], prints: Footprint[], tx: number, ty: number) {
  let margin = Infinity;
  let ux = 0;
  let uy = 0;

  for (const e of prints) {
    const x = e.x + tx;
    const y = e.y + ty;
    const a = nearest(pts, x - e.ax, y - e.ay, x + e.ax, y + e.ay);
    // the ellipse's support function in the approach direction
    const [m0, m1, m2, m3] = e.m;
    const radius = e.r * Math.hypot(m0 * a.ux + m1 * a.uy, m2 * a.ux + m3 * a.uy) + FLOAT;

    if (a.d - radius < margin) {
      margin = a.d - radius;
      ux = a.ux;
      uy = a.uy;
    }
  }

  return { margin, ux, uy };
}

/** Probed directions and bisection steps. Their product is the table build cost, the one number to watch here. */
const DIRECTIONS = 12;
const BISECTION_STEPS = 8;

/**
 * The offset to apply to both eyes for this body, state and expression.
 *
 * One TRANSLATION shared by both eyes, an isometry: spacing, sizes and tilts are kept to the
 * pixel, the face just sits a little lower on a body with no room on top. Variants that bounded
 * each eye apart spread the pair, and scaling the face shrank the eyes, visibly.
 *
 * The target margin is the ORIGINAL profile's, not a strict clearance: on the circle the outer
 * eye already grazes the edge (17.3 units on a radius-100 ball), on purpose, it gives the volume.
 * It is capped by what the body offers at its centre, or the demand is impossible on a flat body.
 *
 * DIRECTIONAL SEARCH, not descent: probe a ring of directions and bisect the distance along each.
 * A gradient descent was tried first and never converged: clearing the pair from one edge pushes
 * it towards another.
 */
function solve(trials: Trial[]): { x: number; y: number } {
  if (!trials.length) {
    return { x: 0, y: 0 };
  }

  const marginAt = (tx: number, ty: number) => {
    let m = Infinity;

    for (const trial of trials) {
      m = Math.min(m, tightest(trial.outline, trial.footprints, tx, ty).margin);
    }

    return m;
  };

  let required = Infinity;

  for (const trial of trials) {
    required = Math.min(required, tightest(trial.referenceOutline, trial.reference, 0, 0).margin);
  }

  // The reach must get to the body centre: `wide` has 87-unit capsules, which on a triangle only
  // fit near the middle, about fifty units from their nominal place.
  let mx = 0;
  let my = 0;
  const prints = trials[0].footprints;

  for (const e of prints) {
    mx -= e.x / prints.length;
    my -= e.y / prints.length;
  }

  const reach = Math.max(0.35 * R, Math.hypot(mx, my) * 1.25);

  required = Math.min(required, marginAt(mx, my));

  // Already fine (the circle, any wide enough body). The capsule must also FIT: without that
  // second condition a body where nothing fits passes the first one degenerately. `wide` and
  // `notify` overflow a triangle or droplet whatever happens; then aim for the least bad.
  const initial = marginAt(0, 0);

  if (initial >= required && initial >= 0) {
    return { x: 0, y: 0 };
  }

  const target = Math.max(required, 0);

  let bestX = 0;
  let bestY = 0;
  let bestNorm = Infinity;
  // fallback when nothing fits: the translation that clears the most, probed on the way
  let fallbackX = 0;
  let fallbackY = 0;
  let fallback = initial;

  for (let d = 0; d < DIRECTIONS; d++) {
    const a = (d / DIRECTIONS) * Math.PI * 2;
    const ux = Math.cos(a);
    const uy = Math.sin(a);

    if (marginAt(ux * reach, uy * reach) < target) {
      for (const k of [0.3, 0.6, 1]) {
        const m = marginAt(ux * reach * k, uy * reach * k);

        if (m > fallback) {
          fallback = m;
          fallbackX = ux * reach * k;
          fallbackY = uy * reach * k;
        }
      }
      continue;
    }

    let low = 0;
    let high = reach;

    for (let i = 0; i < BISECTION_STEPS; i++) {
      const mid = (low + high) / 2;

      if (marginAt(ux * mid, uy * mid) >= target) {
        high = mid;
      } else {
        low = mid;
      }
    }

    if (high < bestNorm) {
      bestNorm = high;
      bestX = ux * high;
      bestY = uy * high;
    }
  }

  const x = bestNorm === Infinity ? fallbackX : bestX;
  const y = bestNorm === Infinity ? fallbackY : bestY;
  // in BALL RADII: the engine scales it back
  return { x: Number((x / R).toFixed(6)), y: Number((y / R).toFixed(6)) };
}

/**
 * The face to cover: the expression's when the state takes one, its own otherwise. ONE entry per
 * expression rather than a worst case shared by all: on a capsule `neutral` has high eyes that
 * want to go down while `scared` has low eyes that want to go up, and no single translation
 * satisfies both.
 */
function faceOf(def: StateDef, pose: Pose, expr: BotExpression | null): Face {
  if (def.baseFace && expr) {
    return { gaze: expr.gaze, split: expr.split, eyes: expr.eyes };
  }
  return { gaze: pose.gaze, split: pose.split, eyes: pose.eyes };
}

/** Times to sample in a state: one if its pose does not move. */
function sampleTimes(def: StateDef): number[] {
  const signature = (p: Pose) => JSON.stringify([p.gaze, p.split, p.eyes, p.sil.rot, p.sil.cx, p.sil.cy, p.sil.sx, p.sil.sy]);

  if (signature(def.pose(0)) === signature(def.pose(def.duration))) {
    return [0];
  }

  const n = 3;
  return Array.from({ length: n }, (_, i) => (i / (n - 1)) * def.duration);
}

function offsetFor(def: StateDef, radii: number[], expr: BotExpression | null): { x: number; y: number } {
  const trials: Trial[] = [];

  for (const t of sampleTimes(def)) {
    const pose = def.pose(t);
    const outline = toPoints({ ...pose.sil, radii }, R);
    const referenceOutline = toPoints(pose.sil, R);
    const v = faceOf(def, pose, expr);
    // The four drift corners bound the nominal pose, their centre: testing it as well would change no margin.
    const corners: Face[] = [];

    for (const dy of [-DRIFT_YAW, DRIFT_YAW]) {
      for (const dp of [-DRIFT_PITCH, DRIFT_PITCH]) {
        corners.push({
          ...v,
          gaze: { yaw: v.gaze.yaw + dy, pitch: v.gaze.pitch + dp, roll: v.gaze.roll },
        });
      }
    }

    for (const c of corners) {
      trials.push({
        footprints: footprints(c, pose.sil, radii),
        reference: footprints(c, pose.sil, pose.sil.radii),
        outline,
        referenceOutline,
      });
    }
  }

  return solve(trials);
}

const ZERO = { x: 0, y: 0 } as const;

const keyOf = (state: StateId, expr: string | null) => `${state}|${expr ?? ''}`;

/*
 * One entry per (body, base-body state, expression), solved on first use: solving all 296 at import
 * took about 25 ms before any avatar could draw. Only `idle` and `swirl` wear the resting face, so
 * only they vary by expression. Keyed by the radii array REFERENCE, the engine's own convention
 * (`radii === this.body`). An unknown profile, or null, corrects nothing.
 */
const CATALOGUE = new Set(BODIES.map((body) => body.radii));
const OFFSETS = new Map<number[], Map<string, { x: number; y: number }>>();

/**
 * Offset for both eyes for this body on this state, in ball radii. Zero for any body outside the
 * catalogue, which covers null and the circle (both profiles are the same there), so the body
 * measured on the video never moves.
 */
export function eyeOffset(radii: number[] | null, state: StateId, expr: string | null): { x: number; y: number } {
  const def = STATES.find((candidate) => candidate.id === state);

  if (!radii || !CATALOGUE.has(radii) || !def?.baseBody) {
    return ZERO;
  }

  // a state without the resting face has one entry whatever the expression, as does an unknown expression
  const face = def.baseFace ? EXPRESSIONS.find((candidate) => candidate.id === expr) ?? null : null;
  const key = keyOf(def.id, face?.id ?? null);
  const byKey = OFFSETS.get(radii) ?? new Map<string, { x: number; y: number }>();
  const offset = byKey.get(key) ?? offsetFor(def, radii, face);
  byKey.set(key, offset);
  OFFSETS.set(radii, byKey);

  return offset;
}
