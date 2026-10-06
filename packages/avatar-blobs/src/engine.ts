import { arcRender } from './decor';
import { blendExpression } from './expressions';
import { eyeOffset } from './eyefit';
import { blinkScale, eyePoses, liveliness } from './face';
import { clamp, easings, lerp, r2 } from './math';
import { blend, capsulePath, closedPath, radiusAtAngle, toPoints } from './silhouette';
import { stateDef } from './states';
import type { ArcRender, DotRender } from './decor';
import type { BotExpression } from './expressions';
import type { Pose } from './pose';
import type { Point, Silhouette } from './silhouette';
import type { StateDef, StateId } from './states';

/*
 * Every numeric constant in this package is a measurement taken off bloub's reference video, not
 * a setting: gaze angles, eye sizes, radii, timings, colours. Do not round or tidy them; it breaks
 * the resemblance, which is the only success criterion.
 */

interface RenderedEye {
  d: string
  matrix: string
  alpha: number
}

export interface BotFrame {
  bodyPath: string
  bodyAlpha: number
  eyes: RenderedEye[]
  dots: DotRender[]
  /** true draws the dots behind the body (the burst particles) */
  dotsBehind: boolean
  arcs: ArcRender[]
  notif: { x: number; y: number; r: number } | null
  notch: { x: number; y: number; r: number } | null
}

/**
 * Where the bot looks when something outside drives it, today the pointer.
 *
 * `yaw` and `pitch` are ABSOLUTE directions that replace the pose's as `mix` rises. The ENGINE
 * mixes, not the caller, because only it knows the pose at this instant: a caller compensating
 * the expression would read its end value mid-morph and the eyes jumped on every mood change.
 * Absolute on BOTH axes, because the expression's character while following is the SHAPE of its
 * eyes, not where it looks.
 *
 * `mix` is how much the outside drives the DIRECTION (0 = not at all). `wander`, separately, is
 * how much automatic drift remains: it must die out while the pointer moves, but with NO pointer
 * the head must stay turned AND keep living. `spin` is a turn travelled ON THE WAY, in degrees,
 * melting to 0 on arrival; the eyes live on a sphere, so a turn takes them behind the ball and
 * back, and -360deg lands where 0 does.
 */
export interface Look {
  yaw: number
  pitch: number
  mix: number
  spin: number
  wander: number
}

const NO_LOOK: Look = { yaw: 0, pitch: 0, mix: 0, spin: 0, wander: 1 };

const lerpLook = (a: Look, b: Look, t: number): Look => ({
  yaw: lerp(a.yaw, b.yaw, t),
  pitch: lerp(a.pitch, b.pitch, t),
  mix: lerp(a.mix, b.mix, t),
  spin: lerp(a.spin, b.spin, t),
  wander: lerp(a.wander, b.wander, t),
});

const lerpEye = (a: Pose['eyes'][number], b: Pose['eyes'][number], t: number) => ({
  w: lerp(a.w, b.w, t),
  h: lerp(a.h, b.h, t),
  open: lerp(a.open, b.open, t),
  tilt: lerp(a.tilt ?? 0, b.tilt ?? 0, t),
});

/** Blends two poses. The decor cross-fades in opacity, not in geometry. */
function blendPose(a: Pose, b: Pose, t: number): Pose {
  const out = 1 - t;
  return {
    sil: blend(a.sil, b.sil, t),
    offX: lerp(a.offX, b.offX, t),
    offY: lerp(a.offY, b.offY, t),
    gaze: {
      yaw: lerp(a.gaze.yaw, b.gaze.yaw, t),
      pitch: lerp(a.gaze.pitch, b.gaze.pitch, t),
      roll: lerp(a.gaze.roll, b.gaze.roll, t),
    },
    split: lerp(a.split, b.split, t),
    eyes: [lerpEye(a.eyes[0], b.eyes[0], t), lerpEye(a.eyes[1], b.eyes[1], t)],
    eyeAlpha: lerp(a.eyeAlpha, b.eyeAlpha, t),
    bodyAlpha: lerp(a.bodyAlpha, b.bodyAlpha, t),
    dots: [...a.dots.map((d) => ({ ...d, opacity: d.opacity * out })), ...b.dots.map((d) => ({ ...d, opacity: d.opacity * t }))],
    arcs: [
      ...a.arcs.map((r) => ({ ...r, id: `a${r.id}`, opacity: r.opacity * out })),
      ...b.arcs.map((r) => ({ ...r, id: `b${r.id}`, opacity: r.opacity * t })),
    ],
    // the notification dot belongs to one of the two states, it does not blend
    notif: t < 0.5 ? a.notif : b.notif,
    dotsBehind: t < 0.5 ? a.dotsBehind : b.dotsBehind,
  };
}

/**
 * Clock-free engine: `sample(t)` is a pure function of time. Pause, resume and seeking give
 * exactly the same image, and rendering is testable without a DOM. External state enters only
 * through dated setters, never through a variable read during `sample`.
 */
export class BotEngine {
  /** resting ball radius, in viewBox units */
  readonly scale: number;

  private cur: StateId;
  private prev: StateId | null = null;
  /** FROZEN start pose, set only when a state change lands during a fade. See `setState`. */
  private frozenOrigin: Pose | null = null;
  private tCur = 0;
  private tPrev = 0;
  /** How far the current (and the left) state's POSE is ahead of its clock; the fade stays dated on `tCur`. */
  private posePhase = 0;
  private previousPosePhase = 0;
  private blinkAt = -10;
  private pts: Point[] = [];
  private body: number[] | null = null;
  private bodyPrev: number[] | null = null;
  private bodyAt = -10;
  private expr: BotExpression | null = null;
  private exprPrev: BotExpression | null = null;
  private exprAt = -10;
  private look: Look = NO_LOOK;
  private lookPrev: Look = NO_LOOK;
  private lookAt = -10;
  private lookMorph = 0.24;

  /** morph duration when the body changes */
  static readonly BODY_MORPH = 0.45;

  /**
   * Catch-up time of the gaze. Shorter than `BODY_MORPH`: a following gaze must feel attentive,
   * not viscous. The target is reset on every pointer move, so this gives following its inertia.
   */
  static readonly LOOK_MORPH = 0.24;

  constructor(scale = 100, initial: StateId = 'idle', body: number[] | null = null, expression: BotExpression | null = null) {
    this.scale = scale;
    this.cur = initial;
    this.body = body;
    this.expr = expression;
  }

  /** Resting expression; like the body, it glides to the new value. */
  setExpression(expression: BotExpression | null, now = 0) {
    if (expression === this.expr) {
      return;
    }
    this.exprPrev = this.expr;
    this.expr = expression;
    this.exprAt = now;
  }

  private exprAtTime(now: number): BotExpression | null {
    const to = this.expr;
    const from = this.exprPrev;

    if (!to || !from) {
      return to;
    }

    const k = (now - this.exprAt) / BotEngine.BODY_MORPH;

    if (k >= 1) {
      return to;
    }

    return blendExpression(from, to, easings.easeOutQuint(clamp(k)));
  }

  /**
   * Chosen body. It replaces the body only on resting (`baseBody`) states: elsewhere the
   * silhouette IS the animation. It morphs instead of jumping; every body is sampled at the same
   * angles, so interpolating the radii is enough.
   */
  setBody(radii: number[] | null, now = 0) {
    if (radii === this.body) {
      return;
    }
    this.bodyPrev = this.body;
    this.body = radii;
    this.bodyAt = now;
  }

  /** Does NOT reset `bodyPrev` once the morph ends: re-reading a past time must give the in-between image again. */
  private bodyAtTime(now: number): number[] | null {
    const to = this.body;
    const from = this.bodyPrev;

    if (!to || !from) {
      return to;
    }

    const k = (now - this.bodyAt) / BotEngine.BODY_MORPH;

    if (k >= 1) {
      return to;
    }

    const t = easings.easeOutQuint(clamp(k));
    return to.map((r, i) => lerp(from[i] ?? r, r, t));
  }

  /**
   * New gaze target, null to go back to the state's. It starts from the CURRENT value, not the
   * previous target like `setBody`: this is called on every pointer move, and restarting from the
   * old target would step the gaze back before each catch-up, so following would tremble.
   */
  setLook(look: Look | null, now: number, morph = BotEngine.LOOK_MORPH) {
    // A non-finite target is refused and the last one KEPT: a single NaN would spread to every
    // frame and the bot would never settle again (a zero-size getBoundingClientRect gives 0 / 0).
    if (look && !Number.isFinite(look.yaw + look.pitch + look.mix + look.spin + look.wander)) {
      return;
    }
    this.lookPrev = this.lookAtTime(now);
    this.look = look ?? NO_LOOK;
    this.lookAt = now;
    this.lookMorph = morph;
  }

  private lookAtTime(now: number): Look {
    const k = (now - this.lookAt) / this.lookMorph;

    if (k >= 1) {
      return this.look;
    }

    return lerpLook(this.lookPrev, this.look, easings.easeOutQuint(clamp(k)));
  }

  private posed(def: StateDef, t: number, body: number[] | null, expr: BotExpression | null): Pose {
    let pose = def.pose(t);

    if (def.baseBody && body) {
      // keep the pose (rotation, offset, squash) and swap only the profile
      pose = { ...pose, sil: { ...pose.sil, radii: body } };
    }

    if (def.baseFace && expr) {
      pose = { ...pose, gaze: expr.gaze, split: expr.split, eyes: expr.eyes };
    }

    return pose;
  }

  /**
   * Eye offset at `now` for a state, in ball radii. READ from the table and interpolated, never
   * recomputed (see `eyefit.ts`), with the exact curve and duration of the body morph: same cause,
   * same motion. The table is queried on the morph BOUNDARIES (`bodyPrev` and `body`), never on
   * the interpolated profile, a fresh array every frame that exists in no table.
   */
  private eyeOffsetAtTime(now: number, state: StateId): { x: number; y: number } {
    const alongAxis = (start: number, duration: number, a: { x: number; y: number }, b: { x: number; y: number }) => {
      if (a === b) {
        return b;
      }

      const k = (now - start) / duration;

      if (k >= 1) {
        return b;
      }

      const t = easings.easeOutQuint(clamp(k));
      return { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) };
    };

    // expression axis, for each of the two bodies involved
    const perBody = (radii: number[] | null) =>
      alongAxis(this.exprAt, BotEngine.BODY_MORPH, eyeOffset(radii, state, this.exprPrev?.id ?? null), eyeOffset(radii, state, this.expr?.id ?? null));

    // then the body axis
    return alongAxis(this.bodyAt, BotEngine.BODY_MORPH, perBody(this.bodyPrev), perBody(this.body));
  }

  get state(): StateId {
    return this.cur;
  }

  /**
   * Restarts on `id` WITHOUT a previous state, like a fresh engine. `setState` cannot do this: it
   * keeps the left state to fade from it, and replaying frame 0 after a full pass blended the
   * first state with the LAST one. Like `setState`, a dated setter, never called while sampling.
   */
  reset(id: StateId, now: number) {
    this.cur = id;
    this.prev = null;
    this.frozenOrigin = null;
    this.tCur = now;
    this.tPrev = now;
    this.posePhase = 0;
    this.previousPosePhase = 0;
    this.blinkAt = -10;
  }

  /** Origin of the current fade: the frozen pose if any, else the left state at its own elapsed time, still animating on purpose. */
  private origin(now: number, body: number[] | null, expr: BotExpression | null): Pose | null {
    if (this.frozenOrigin) {
      return this.frozenOrigin;
    }

    if (!this.prev) {
      return null;
    }

    return this.posed(stateDef(this.prev), Math.max(0, now - this.tPrev + this.previousPosePhase), body, expr);
  }

  /** Composite pose at `now`, fade included: what `sample` blends, before idle life and gaze. */
  private composedPose(now: number): Pose {
    const def = stateDef(this.cur);
    const body = this.bodyAtTime(now);
    const expr = this.exprAtTime(now);
    const pose = this.posed(def, Math.max(0, now - this.tCur + this.posePhase), body, expr);
    const since = now - this.tCur;

    if (since >= def.morph) {
      return pose;
    }

    const origin = this.origin(now, body, expr);

    if (!origin) {
      return pose;
    }

    return blendPose(origin, pose, easings.easeOutQuint(clamp(since / def.morph)));
  }

  /**
   * Dated state change.
   *
   * The engine keeps ONE slot of history, so a change landing mid-fade used to blend from the
   * FULL pose of the state being left instead of the half-blended image on screen (35.9 px jump
   * against 8.0 px of normal motion on idle, wide, idle at 100 ms). So the current composite pose
   * is frozen and blended from. ONLY in that case: freezing on every change would halt the left
   * state's own animation for the whole fade (the "!" of `alert` would stop mid-run).
   *
   * `posePhase` advances the new state's pose without touching the fade, so a bot entering a
   * state mid-animation morphs from the image on screen to a pose already under way.
   */
  setState(id: StateId, now: number, posePhase = 0) {
    if (id === this.cur) {
      return;
    }

    const { morph } = stateDef(this.cur);
    const midFade = this.prev !== null && now - this.tCur < morph;
    this.frozenOrigin = midFade ? this.composedPose(now) : null;
    this.prev = this.cur;
    this.tPrev = this.tCur;
    this.previousPosePhase = this.posePhase;
    this.posePhase = posePhase;
    this.cur = id;
    this.tCur = now;
    // In the video every change of outline is hidden by a blink.
    if (stateDef(id).blinkIn) {
      this.blinkAt = now;
    }
  }

  sample(now: number): BotFrame {
    const R = this.scale;
    const def = stateDef(this.cur);
    const body = this.bodyAtTime(now);
    const expr = this.exprAtTime(now);
    let pose = this.posed(def, Math.max(0, now - this.tCur + this.posePhase), body, expr);
    let offset = this.eyeOffsetAtTime(now, this.cur);

    // The previous state is never purged: `since < def.morph` ignores it once the fade is over,
    // and forgetting it would make the engine non-replayable.
    const since = now - this.tCur;
    const origin = since < def.morph ? this.origin(now, body, expr) : null;

    if (origin) {
      // Exponential ease-out, the curve measured on the video. The ratio is clamped: re-reading a
      // time BEFORE the state change gives a negative ratio that the ease-out extrapolates thirty
      // times too far.
      const ratio = easings.easeOutQuint(clamp(since / def.morph));
      pose = blendPose(origin, pose, ratio);
      // The eye offset follows the SAME curve as the silhouette that causes it.
      const left = this.prev;

      if (left) {
        const before = this.eyeOffsetAtTime(now, left);
        offset = {
          x: lerp(before.x, offset.x, ratio),
          y: lerp(before.y, offset.y, ratio),
        };
      }
    }

    const alive = pose.eyeAlpha > 0.01;
    const look = this.lookAtTime(now);
    const life = liveliness(now, { wander: alive ? look.wander : 0, blink: alive });

    const gaze = {
      // Both aims REPLACE the pose's instead of adding to it (see `Look`), and the turn is taken
      // off on the way. The drift is added AFTER the mix so it survives a turned head with no pointer.
      yaw: lerp(pose.gaze.yaw, look.yaw, look.mix) + life.dYaw - look.spin,
      pitch: lerp(pose.gaze.pitch, look.pitch, look.mix) + life.dPitch,
      // the roll follows nothing: the head leans -13deg in the video, and rolling with the pointer breaks that signature
      roll: pose.gaze.roll + life.dRoll,
    };

    // blink triggered by the state change, on top of the schedule
    const forced = clamp((now - this.blinkAt) / 0.2);
    const forcedLid = forced < 1 ? Math.abs(forced * 2 - 1) : 1;
    const lid = Math.min(life.lid, forcedLid);

    const offX = pose.offX + life.driftX;
    const offY = pose.offY + life.driftY;

    const sil: Silhouette = {
      ...pose.sil,
      cx: pose.sil.cx + offX,
      cy: pose.sil.cy + offY,
      sy: pose.sil.sy * life.breath,
    };

    const bodyPath = closedPath(toPoints(sil, R, this.pts));

    // The eyes live on a radius-1 sphere; once the silhouette is no longer a circle they are
    // pulled in to the real radius in their direction, or they overflow and the mask cuts them.
    const bodyRadius = (x: number, y: number) => radiusAtAngle(pose.sil.radii, Math.atan2(y, x) - pose.sil.rot);

    const eyes: RenderedEye[] = [];

    if (pose.eyeAlpha > 0.01) {
      const poses = eyePoses(gaze, R, pose.split);

      for (let i = 0; i < 2; i++) {
        const e = poses[i];

        if (e.depth <= 0.02) {
          continue;
        }

        const cfg = pose.eyes[i];
        const fit = bodyRadius(e.x, e.y);
        // The eye's own tilt composes the tangent frame with a rotation in the eye plane, which
        // allows mirrored tilts between the two eyes.
        const phi = ((cfg.tilt ?? 0) * Math.PI) / 180;
        const cp = Math.cos(phi);
        const sp = Math.sin(phi);
        const ax = e.a * cp + e.c * sp;
        const ay = e.b * cp + e.d * sp;
        const cx2 = -e.a * sp + e.c * cp;
        const cy2 = -e.b * sp + e.d * cp;
        // The blink applies AFTER all that: a vertical squash on screen, not along the capsule axis.
        const k = blinkScale(Math.min(lid, cfg.open));
        eyes.push({
          d: capsulePath(cfg.w * R, cfg.h * R),
          matrix: `matrix(${r2(ax)},${r2(ay * k)},${r2(cx2)},${r2(cy2 * k)},${r2(e.x * fit + (offX + offset.x) * R)},${r2(e.y * fit + (offY + offset.y) * R)})`,
          alpha: pose.eyeAlpha * clamp(e.depth / 0.12),
        });
      }
    }

    const dots = pose.dots.filter((p) => p.opacity > 0.01 && p.r > 0.0005).map((p) => ({ ...p, x: (p.x + offX) * R, y: (p.y + offY) * R, r: p.r * R }));

    // the notification dot sits on the outline, so it follows the body too
    const nFit = pose.notif ? bodyRadius(pose.notif.x, pose.notif.y) : 1;
    const nx = pose.notif ? (pose.notif.x * nFit + offX) * R : 0;
    const ny = pose.notif ? (pose.notif.y * nFit + offY) * R : 0;
    const notif = pose.notif ? { x: nx, y: ny, r: pose.notif.r * R } : null;
    const notch = pose.notif ? { x: nx, y: ny, r: pose.notif.notch * R } : null;

    return {
      bodyPath,
      bodyAlpha: pose.bodyAlpha,
      eyes,
      dots,
      dotsBehind: pose.dotsBehind,
      // States declare arcs in ball radii; only the engine knows the viewBox scale, so it draws them.
      arcs: pose.arcs.filter((a) => a.opacity > 0.01).map((a) => arcRender(a.seed, a.t, R, a.id, a.opacity)),
      notif,
      notch,
    };
  }
}
