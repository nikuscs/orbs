import { COMET_DOT, COMET_RIBBONS, DOT_PEAK, DOT_R, DOT_X, NOTIF_ANGLE, NOTIF_DIST, NOTIF_MARGIN, NOTIF_POP, NOTIF_R, particles, RINGS, SWOOSH } from './decor';
import { REST_GAZE } from './face';
import { clamp, easings, TAU } from './math';
import { barItalic, barUpright, base, dotPulse, pair, spinningTriangle, TEAR } from './pose';
import { circle, silhouette } from './silhouette';
import type { Pose } from './pose';
import type { Silhouette } from './silhouette';

export type StateId
  = | 'idle'
    | 'thinking'
    | 'wink'
    | 'wide'
    | 'alert'
    | 'notify'
    | 'exclaim'
    | 'sleep'
    | 'egg'
    | 'hexagon'
    | 'play'
    | 'orbit'
    | 'burst'
    | 'comet'
    | 'swirl';

export interface StateDef {
  id: StateId
  /** hold time when the full sequence plays */
  duration: number
  /**
   * Below this the animation is cut before it lands: the "!" does not come back, the body stays
   * burst. It is read off the `pose` constants, not chosen. Absent means the state ignores time
   * or loops, so any duration suits it.
   */
  minDuration?: number
  /** entry morph duration */
  morph: number
  /** true hides the entry behind a blink, as in the video */
  blinkIn: boolean
  /**
   * true means the body is the resting silhouette, so the chosen body can replace it. States
   * that draw their own outline (the "!", the dots, the egg, the triangle) are false: that
   * outline IS the animation.
   */
  baseBody: boolean
  /**
   * true means the state wears the resting face, so the chosen expression can replace it. Only
   * `idle` in the catalogue: the other face states carry an expression measured on the video,
   * which is precisely what is reproduced.
   */
  baseFace: boolean
  pose: (local: number) => Pose
}

export const STATES: StateDef[] = [
  {
    id: 'idle',
    duration: 2.4,
    morph: 0.45,
    blinkIn: false,
    baseFace: true,
    baseBody: true,
    pose: () => base(),
  },

  {
    id: 'thinking',
    duration: 2.6,
    morph: 0.4,
    baseFace: false,
    baseBody: false,
    blinkIn: true,
    pose: (t) => {
      const mid = dotPulse(t, 1);
      // The side dots grow out of the ball's flanks: in the video they stay fused with it for
      // 1-2 frames before detaching.
      const emerge = 0.3 + 0.7 * easings.easeOutCubic(clamp(t / 0.3));
      return base({
        // the ball BECOMES the middle dot, so the morph stays continuous
        sil: circle(DOT_R * (1 + (DOT_PEAK - 1) * mid), { cx: DOT_X[1] }),
        eyeAlpha: 0,
        dots: [0, 2].map((i) => {
          const k = dotPulse(t, i);
          return {
            x: DOT_X[i] * emerge,
            y: 0,
            r: DOT_R * (1 + (DOT_PEAK - 1) * k),
            opacity: 0.55 + 0.45 * k,
          };
        }),
      });
    },
  },

  {
    id: 'wink',
    duration: 1.6,
    morph: 0.3,
    blinkIn: true,
    baseFace: false,
    baseBody: true,
    pose: () =>
      base({
        gaze: { yaw: -5.37, pitch: 4.55, roll: 6.7 },
        split: 16.25,
        // The closed eye is not the open eye squashed: it is a horizontal dash WIDER than the
        // open eye (0.447 against 0.236).
        eyes: [
          { w: 0.236, h: 0.464, open: 1 },
          { w: 0.447, h: 0.089, open: 1 },
        ],
      }),
  },

  {
    id: 'wide',
    duration: 1.8,
    morph: 0.55,
    blinkIn: true,
    baseFace: false,
    baseBody: true,
    pose: () =>
      base({
        gaze: { yaw: 6.92, pitch: -21.96, roll: 11.6 },
        split: 18.43,
        eyes: pair(0.356, 0.875),
      }),
  },

  {
    id: 'alert',
    duration: 2.4,
    // the "!" is back in place at 1.6 + 0.4
    minDuration: 2,
    morph: 0.45,
    baseFace: false,
    baseBody: false,
    blinkIn: false,
    pose: (t) => {
      // Measured travel: -0.087 to +0.732 in 1.5 s, ease-in-out, micro overshoot.
      const p = clamp(t / 1.5);
      const travel = easings.easeInOutCubic(p) * 0.82 - 0.087;
      const back = t > 1.6 ? clamp((t - 1.6) / 0.4) : 0;
      const x = travel * (1 - back) + 0.1 * back;
      // Secondary 2.5 Hz buzz, bar and dot in phase opposition.
      const buzz = Math.sin(t * 2.5 * TAU) * 0.005;
      const tilt = (17.7 * Math.PI) / 180;
      return base({
        sil: barItalic({
          rot: tilt,
          cx: x,
          cy: -0.325 - buzz,
        }),
        eyeAlpha: 0,
        dots: [
          {
            // the dot follows the glyph axis, 0.580 from the bar centre
            x: x - Math.sin(tilt) * 0.58,
            y: -0.325 + Math.cos(tilt) * 0.58 + buzz * 2.8,
            r: 0.118,
            d: TEAR,
            rot: (tilt * 180) / Math.PI,
            opacity: 1,
          },
        ],
      });
    },
  },

  {
    id: 'notify',
    duration: 2.2,
    morph: 0.5,
    blinkIn: true,
    baseFace: false,
    baseBody: true,
    pose: (t) => {
      // Blue dot pop: peaks 14 % above rest around 0.3 s, then settles.
      const p = clamp(t / 0.45);
      const pop = 1 + (NOTIF_POP - 1) * Math.sin(p * Math.PI) * (1 - p * 0.35);
      const r = NOTIF_R * (p < 1 ? pop : 1);
      const a = (NOTIF_ANGLE * Math.PI) / 180;
      return base({
        // the gaze turns away from the dot
        gaze: { yaw: -21.94, pitch: -5.82, roll: -12.2 },
        split: 18.89,
        eyes: pair(0.505, 0.498),
        notif: {
          x: Math.cos(a) * NOTIF_DIST,
          y: Math.sin(a) * NOTIF_DIST,
          r,
          notch: r + NOTIF_MARGIN,
        },
      });
    },
  },

  {
    id: 'exclaim',
    duration: 2,
    morph: 0.45,
    baseFace: false,
    baseBody: false,
    blinkIn: false,
    pose: () =>
      base({
        sil: barUpright(),
        eyeAlpha: 0,
        dots: [{ x: -0.012, y: 0.526, r: 0.113, opacity: 1 }],
      }),
  },

  {
    id: 'sleep',
    duration: 2.4,
    morph: 0.5,
    baseFace: false,
    baseBody: false,
    blinkIn: false,
    pose: (t) =>
      base({
        // Measured vertical bounce: 0.19 either side of +0.11, 0.6 s period.
        sil: circle(0.1585, { cy: 0.11 + Math.sin(t * (TAU / 0.6)) * 0.19 }),
        eyeAlpha: 0,
      }),
  },

  {
    id: 'egg',
    duration: 1.8,
    morph: 0.4,
    baseFace: false,
    baseBody: false,
    blinkIn: true,
    pose: () =>
      base({
        sil: silhouette('egg'),
        gaze: { yaw: 19.97, pitch: 26.01, roll: -17.1 },
        // the eyes narrow with the body
        split: 11.07,
        eyes: pair(0.164, 0.385),
      }),
  },

  {
    id: 'hexagon',
    duration: 1.6,
    morph: 0.4,
    baseFace: false,
    baseBody: false,
    blinkIn: true,
    pose: () =>
      base({
        sil: silhouette('hexagon'),
        gaze: { yaw: 23.11, pitch: 24.42, roll: -13.3 },
        split: 13.37,
        eyes: pair(0.177, 0.411),
      }),
  },

  {
    id: 'play',
    duration: 2,
    morph: 0.5,
    baseFace: false,
    baseBody: false,
    blinkIn: true,
    pose: (t) => {
      // The triangle stays almost still while the bundle sweeps across it, right to left.
      const fade = clamp(t / 0.35) * clamp((2.2 - t) / 0.5);
      return base({
        sil: spinningTriangle(0),
        gaze: { yaw: 12, pitch: -8, roll: -6 },
        split: 15,
        eyes: pair(0.18, 0.34),
        arcs: SWOOSH.map((s, i) => ({
          id: `sw${i}`,
          seed: { ...s, cx: 0.45 - t * 0.42 },
          t,
          opacity: fade,
        })),
      });
    },
  },

  {
    id: 'orbit',
    duration: 3.4,
    // the body has relaxed from triangle back to ball at 1.6 + 0.9
    minDuration: 2.5,
    morph: 0.6,
    baseFace: false,
    baseBody: false,
    blinkIn: false,
    pose: (t) => {
      // Measured spin: 0.35 s ramp, then 1.25 turns/s counter-clockwise.
      const ramp = easings.easeInOutCubic(clamp(t / 0.35));
      const rot = -TAU * 1.25 * t * ramp;
      const back = easings.easeInOutCubic(clamp((t - 1.6) / 0.9));
      const tri = spinningTriangle(rot);
      const ball = circle(1, { rot });

      const sil: Silhouette = {
        radii: tri.radii.map((r, i) => r + (ball.radii[i] - r) * back),
        rot,
        cx: tri.cx * (1 - back),
        cy: tri.cy * (1 - back),
        sx: 1,
        sy: 1,
      };

      const fade = clamp(t / 0.8) * clamp((3.6 - t) / 0.9);
      return base({
        sil,
        // the eyes race round the sphere about 3x faster than the silhouette
        gaze: {
          yaw: REST_GAZE.yaw + Math.sin(t * 6.5) * 65 * (1 - back),
          pitch: -4 + back * 32,
          roll: -13,
        },
        eyes: pair(0.18, 0.34 + back * 0.07),
        // the rings come in one by one over 0.8 s
        arcs: RINGS.map((s, i) => ({
          id: `rg${i}`,
          seed: s,
          t,
          opacity: fade * clamp((t - i * 0.13) / 0.3),
        })),
      });
    },
  },

  {
    /*
     * bloub's settings-view entry, and the ONLY state not measured on the video: chosen, it
     * borrows orbit's measured rings but cuts short (1 s, half the rings, no triangle). Both
     * base flags are the point: `baseBody` lets the chosen body morph in, `baseFace` keeps the
     * resting face so pointer follow applies from the start. Deliberately outside `SEQUENCE`.
     */
    id: 'swirl',
    // a little longer than the gaze turn (`TURN_TIME`, 1.1 s): the eyes must land before the rings fade
    duration: 1.3,
    minDuration: 1.3,
    morph: 0.3,
    baseFace: true,
    baseBody: true,
    blinkIn: true,
    pose: (t) =>
      base({
        arcs: RINGS.slice(0, 3).map((s, i) => ({
          id: `sw${i}`,
          seed: s,
          t,
          // in one after the other, gone before the block ends so idle resumes on a clean frame
          opacity: clamp((t - i * 0.06) / 0.14) * clamp((1.22 - t) / 0.34),
        })),
      }),
  },

  {
    id: 'burst',
    duration: 2.6,
    // the body is whole again at 1.7 + 0.7
    minDuration: 2.4,
    morph: 0.4,
    baseFace: false,
    baseBody: false,
    blinkIn: false,
    pose: (t) => {
      // Measured collapse: 1.0 to 0.166 in 0.7 s, ease-out, no bounce.
      const collapse = 1 - 0.834 * easings.easeOutQuint(clamp(t / 0.7));
      const regrow = easings.easeOutQuint(clamp((t - 1.7) / 0.7));
      return base({
        sil: circle(collapse + (1 - collapse) * regrow),
        eyeAlpha: clamp((t - 1.85) / 0.4),
        dots: particles(t, 1),
        dotsBehind: true,
      });
    },
  },

  {
    id: 'comet',
    duration: 2.4,
    // The dot is whole again at 1.85 + 0.6 = 2.45, 0.05 s after the video's cut: that remainder
    // finishes during the next fade, as in the reference, so do not go below the measured duration.
    minDuration: 2.4,
    morph: 0.45,
    baseFace: false,
    baseBody: false,
    blinkIn: false,
    pose: (t) => {
      const collapse = 1 - (1 - COMET_DOT) * easings.easeOutQuint(clamp(t / 0.55));
      const regrow = easings.easeOutQuint(clamp((t - 1.85) / 0.6));
      const fade = clamp((t - 0.15) / 0.25) * clamp((1.95 - t) / 0.3);
      return base({
        // the dot drifts 0.035 down then back up (measured wobble)
        sil: circle(collapse + (1 - collapse) * regrow, {
          cy: Math.sin(clamp(t / 1.7) * Math.PI) * 0.035,
        }),
        eyeAlpha: clamp((t - 2) / 0.35),
        arcs: COMET_RIBBONS.map((s, i) => ({ id: `cm${i}`, seed: s, t, opacity: fade })),
      });
    },
  },
];

const STATE_BY_ID = new Map(STATES.map((s) => [s.id, s]));

/** Every id has an entry; the idle fallback only exists for the type checker. */
export const stateDef = (id: StateId): StateDef => STATE_BY_ID.get(id) ?? STATES[0];

/** Local time at which each state reads best: the pose of still frames and thumbnails. */
export const POSES: Record<StateId, number> = {
  idle: 1,
  thinking: 1.1,
  wink: 0.8,
  wide: 0.8,
  alert: 0.75,
  notify: 0.9,
  exclaim: 0.8,
  sleep: 0.45,
  egg: 0.8,
  hexagon: 0.8,
  play: 0.9,
  orbit: 1.2,
  swirl: 0.5,
  burst: 0.45,
  comet: 1.15,
};

/** The catalogue, in the reference video's order. */
export const SEQUENCE: StateId[] = ['idle', 'thinking', 'wink', 'wide', 'alert', 'notify', 'exclaim', 'sleep', 'egg', 'hexagon', 'play', 'orbit', 'burst', 'comet'];
