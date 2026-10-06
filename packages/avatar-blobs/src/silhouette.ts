import { lerp, r2, TAU } from './math';
import { PROFILE_SAMPLES, PROFILES } from './profiles';
import type { ProfileName } from './profiles';

export interface Point {
  x: number
  y: number
}

/**
 * A radial profile r(theta) plus a pose.
 *
 * Every profile is sampled at the SAME angles, so the points of any two bodies match one to one
 * and morphing is a linear interpolation of radii. That is what keeps transitions clean without a
 * path-morphing library.
 */
export interface Silhouette {
  radii: number[]
  /** profile rotation, in radians */
  rot: number
  /** centre offset, in ball radii */
  cx: number
  cy: number
  /** squash and stretch, applied in screen space (after rotation) */
  sx: number
  sy: number
}

const ANGLES = Array.from({ length: PROFILE_SAMPLES }, (_, i) => (i / PROFILE_SAMPLES) * TAU);
const COS = ANGLES.map(Math.cos);
const SIN = ANGLES.map(Math.sin);

export function silhouette(name: ProfileName, pose: Partial<Silhouette> = {}): Silhouette {
  return {
    radii: [...PROFILES[name]],
    rot: 0,
    cx: 0,
    cy: 0,
    sx: 1,
    sy: 1,
    ...pose,
  };
}

export function circle(radius: number, pose: Partial<Silhouette> = {}): Silhouette {
  return {
    radii: Array.from({ length: PROFILE_SAMPLES }, () => radius),
    rot: 0,
    cx: 0,
    cy: 0,
    sx: 1,
    sy: 1,
    ...pose,
  };
}

export function blend(a: Silhouette, b: Silhouette, t: number): Silhouette {
  const dst: Silhouette = { radii: Array.from({ length: PROFILE_SAMPLES }, () => 0), rot: 0, cx: 0, cy: 0, sx: 1, sy: 1 };

  for (let i = 0; i < PROFILE_SAMPLES; i++) {
    dst.radii[i] = lerp(a.radii[i] ?? 1, b.radii[i] ?? 1, t);
  }

  // Shortest way round, so +170deg to -170deg does not spin a full turn.
  let dRot = b.rot - a.rot;

  while (dRot > Math.PI) {
    dRot -= TAU;
  }

  while (dRot < -Math.PI) {
    dRot += TAU;
  }
  dst.rot = a.rot + dRot * t;
  dst.cx = lerp(a.cx, b.cx, t);
  dst.cy = lerp(a.cy, b.cy, t);
  dst.sx = lerp(a.sx, b.sx, t);
  dst.sy = lerp(a.sy, b.sy, t);

  return dst;
}

/** Projects the silhouette to screen points; `scale` is the ball radius in viewBox units. `out` is reused across frames. */
export function toPoints(s: Silhouette, scale: number, out: Point[] = []): Point[] {
  const cr = Math.cos(s.rot);
  const sr = Math.sin(s.rot);

  for (let i = 0; i < PROFILE_SAMPLES; i++) {
    const r = s.radii[i] ?? 1;
    const x = r * (COS[i] ?? 0);
    const y = r * (SIN[i] ?? 0);
    // rotation, then squash in screen space, then translation
    const rx = x * cr - y * sr;
    const ry = x * sr + y * cr;
    const p = out[i] ?? { x: 0, y: 0 };
    p.x = (rx * s.sx + s.cx) * scale;
    p.y = (ry * s.sy + s.cy) * scale;
    out[i] = p;
  }
  out.length = PROFILE_SAMPLES;

  return out;
}

/**
 * Closed polyline to Catmull-Rom cubics. With 64 points centred tangents are enough: the outline
 * stays smooth to the pixel even at 600 px, and the string stays short.
 */
export function closedPath(pts: Point[], tension = 1 / 6): string {
  const n = pts.length;

  if (n < 3) {
    return '';
  }

  const first = pts[0];
  let d = `M${r2(first.x)} ${r2(first.y)}`;

  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % n];
    const p3 = pts[(i + 2) % n];
    const c1x = p1.x + (p2.x - p0.x) * tension;
    const c1y = p1.y + (p2.y - p0.y) * tension;
    const c2x = p2.x - (p3.x - p1.x) * tension;
    const c2y = p2.y - (p3.y - p1.y) * tension;
    d += `C${r2(c1x)} ${r2(c1y)} ${r2(c2x)} ${r2(c2y)} ${r2(p2.x)} ${r2(p2.y)}`;
  }

  return `${d}Z`;
}

/**
 * Any polygon to a radial profile, by casting rays from (cx, cy). Builds the bodies that are not
 * naturally r(theta), like the tapered bar of the "!". Runs once at load, never in the render loop.
 */
export function profileFromPolygon(poly: Point[], cx: number, cy: number): number[] {
  const radii = Array.from({ length: PROFILE_SAMPLES }, () => 0);
  const n = poly.length;

  for (let k = 0; k < PROFILE_SAMPLES; k++) {
    const dx = COS[k] ?? 0;
    const dy = SIN[k] ?? 0;
    let best = 0;

    for (let i = 0; i < n; i++) {
      const a = poly[i];
      const b = poly[(i + 1) % n];
      const ex = b.x - a.x;
      const ey = b.y - a.y;
      const den = dx * ey - dy * ex;

      if (Math.abs(den) < 1e-9) {
        continue;
      }

      const px = a.x - cx;
      const py = a.y - cy;
      const t = (px * ey - py * ex) / den;
      const u = (px * dy - py * dx) / den;

      if (t > best && u >= 0 && u <= 1) {
        best = t;
      }
    }
    radii[k] = best;
  }

  return radii;
}

/** Convex hull of two circles: the tapered bar of the upright "!". */
export function hullOfCircles(x1: number, y1: number, r1: number, x2: number, y2: number, r2v: number, steps = 96): Point[] {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const dist = Math.hypot(dx, dy) || 1e-6;
  // angle of the common outer tangents
  const base = Math.atan2(dy, dx);
  const spread = Math.acos(Math.max(-1, Math.min(1, (r1 - r2v) / dist)));
  const pts: Point[] = [];

  for (let i = 0; i <= steps / 2; i++) {
    const a = base + spread + ((TAU - 2 * spread) * i) / (steps / 2);
    pts.push({ x: x1 + Math.cos(a) * r1, y: y1 + Math.sin(a) * r1 });
  }

  for (let i = 0; i <= steps / 2; i++) {
    const a = base - spread + (2 * spread * i) / (steps / 2);
    pts.push({ x: x2 + Math.cos(a) * r2v, y: y2 + Math.sin(a) * r2v });
  }

  return pts;
}

/**
 * Profile radius in any direction, interpolated between the two nearest samples. Re-anchors what
 * sits "on" the body (the eyes, the notification dot) once the silhouette is no longer a circle:
 * without it an eye placed at 0.62 radius leaves a body whose edge is at 0.55 in that direction,
 * and the mask clips it.
 */
export function radiusAtAngle(radii: number[], angle: number): number {
  const n = radii.length;
  const t = ((((angle / TAU) % 1) + 1) % 1) * n;
  const i = Math.floor(t);
  return lerp(radii[i % n] ?? 1, radii[(i + 1) % n] ?? 1, t - i);
}

/** Superellipse |x/sx|^n + |y/sy|^n = 1: n = 2 is an ellipse, n near 4 the squircle. */
export function superellipseProfile(n: number, sx = 1, sy = 1): number[] {
  return ANGLES.map((_, i) => {
    const c = Math.abs((COS[i] ?? 0) / sx) ** n;
    const s = Math.abs((SIN[i] ?? 0) / sy) ** n;
    return (c + s) ** (-1 / n);
  });
}

/**
 * Radial profile of a UNION of discs: the farthest ray/circle intersection. Exact as long as the
 * origin is inside the union, which gives the cloud its bumps without a path boolean.
 */
export function unionOfCirclesProfile(circles: { x: number; y: number; r: number }[]): number[] {
  const out = Array.from({ length: PROFILE_SAMPLES }, () => 0);

  for (let i = 0; i < PROFILE_SAMPLES; i++) {
    const dx = COS[i] ?? 0;
    const dy = SIN[i] ?? 0;
    let best = 0;

    for (const c of circles) {
      const b = dx * c.x + dy * c.y;
      const disc = b * b - (c.x * c.x + c.y * c.y - c.r * c.r);

      if (disc < 0) {
        continue;
      }

      const t = b + Math.sqrt(disc);

      if (t > best) {
        best = t;
      }
    }
    out[i] = best;
  }

  return out;
}

/**
 * Rounded polygon as a Minkowski sum with a disc: each edge is pushed out by `rc` and each vertex
 * becomes an arc of radius `rc`, so vertices go at the wanted radius MINUS rc. Expects a clockwise
 * polygon in screen space (y down).
 */
function roundedPolygon(verts: Point[], rc: number, arcSteps = 10): Point[] {
  const n = verts.length;
  const out: Point[] = [];

  const normal = (a: Point, b: Point) => {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.hypot(dx, dy) || 1;
    // clockwise with y down: the outward normal is (dy, -dx)
    return Math.atan2(-dx / len, dy / len);
  };

  for (let i = 0; i < n; i++) {
    const prev = verts[(i - 1 + n) % n];
    const cur = verts[i];
    const next = verts[(i + 1) % n];
    const a0 = normal(prev, cur);
    const a1 = normal(cur, next);
    let d = a1 - a0;

    while (d > Math.PI) {
      d -= TAU;
    }

    while (d < -Math.PI) {
      d += TAU;
    }

    for (let k = 0; k <= arcSteps; k++) {
      const a = a0 + (d * k) / arcSteps;
      out.push({ x: cur.x + Math.cos(a) * rc, y: cur.y + Math.sin(a) * rc });
    }
  }

  return out;
}

/** Regular polygon with rounded corners, inscribed in `radius`. */
export function regularPolygonProfile(sides: number, radius: number, rc: number, rotationDeg = 0): number[] {
  const rot = (rotationDeg * Math.PI) / 180;

  const verts = Array.from({ length: sides }, (_, i) => {
    // clockwise on screen: theta grows with y pointing down
    const a = rot + (i / sides) * TAU;
    return { x: Math.cos(a) * (radius - rc), y: Math.sin(a) * (radius - rc) };
  });

  return profileFromPolygon(roundedPolygon(verts, rc), 0, 0);
}

/** Exact closed polyline: keeps straight segments, unlike `closedPath`. */
export function polyPath(pts: Point[], scale = 1): string {
  if (pts.length < 3) {
    return '';
  }

  let d = '';

  for (const [i, p] of pts.entries()) {
    d += `${i === 0 ? 'M' : 'L'}${r2(p.x * scale)} ${r2(p.y * scale)}`;
  }

  return `${d}Z`;
}

/** Capsule (stadium) centred on the origin: the exact outline of the bot's eyes. */
export function capsulePath(w: number, h: number): string {
  const hw = Math.max(w, 0.01) / 2;
  const hh = Math.max(h, 0.01) / 2;
  const r = Math.min(hw, hh);
  return (
    `M${r2(-hw)} ${r2(-hh + r)}`
    + `A${r2(r)} ${r2(r)} 0 0 1 ${r2(-hw + r)} ${r2(-hh)}`
    + `L${r2(hw - r)} ${r2(-hh)}`
    + `A${r2(r)} ${r2(r)} 0 0 1 ${r2(hw)} ${r2(-hh + r)}`
    + `L${r2(hw)} ${r2(hh - r)}`
    + `A${r2(r)} ${r2(r)} 0 0 1 ${r2(hw - r)} ${r2(hh)}`
    + `L${r2(-hw + r)} ${r2(hh)}`
    + `A${r2(r)} ${r2(r)} 0 0 1 ${r2(-hw)} ${r2(hh - r)}Z`
  );
}
