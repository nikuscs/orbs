import { EYE_H, EYE_SPLIT, EYE_W, REST_GAZE } from './face';
import { lerp } from './math';
import type { HeadGaze } from './face';
import type { EyeCfg } from './pose';

/*
 * Resting expressions. The face is just two capsules, so everything rests on four levers: head
 * orientation, eye spacing, eye proportions, and each eye's own tilt. The last one is what makes
 * anger and sadness possible: they need MIRRORED tilts (tops converging or diverging), which the
 * head roll alone cannot do since it leans both eyes the same way.
 *
 * Only the resting state wears these. The video's expressive states (wink, wide, notify) keep
 * their own: reproducing them is the point.
 *
 * Amplitudes follow bible-strong-avatar-lab, which exposes the same model: width 0.8 to 2.7
 * times neutral, height 0.3 to 1.5, angles up to 80deg either way. These stay inside that range.
 */

export type ExpressionId
  = | 'neutral'
    | 'attentive'
    | 'surprised'
    | 'excited'
    | 'happy'
    | 'laughing'
    | 'angry'
    | 'sad'
    | 'scared'
    | 'suspicious'
    | 'confused'
    | 'curious'
    | 'proud'
    | 'shy'
    | 'bored'
    | 'sleepy';

export interface BotExpression {
  id: ExpressionId
  gaze: HeadGaze
  split: number
  eyes: [EyeCfg, EyeCfg]
}

/** `tilt` in degrees, positive leans the top of the capsule right. */
const eye = (w: number, h: number, tilt = 0, open = 1): EyeCfg => ({ w, h, tilt, open });

/** Both eyes alike, with mirrored tilts. */
const pair = (w: number, h: number, tilt = 0, open = 1): [EyeCfg, EyeCfg] => [eye(w, h, tilt, open), eye(w, h, -tilt, open)];

export const EXPRESSIONS: BotExpression[] = [
  {
    // the pose measured frame by frame on the reference video
    id: 'neutral',
    gaze: { ...REST_GAZE },
    split: EYE_SPLIT,
    eyes: [eye(EYE_W, EYE_H), eye(EYE_W, EYE_H)],
  },
  {
    id: 'attentive',
    gaze: { yaw: 4, pitch: 5, roll: -4 },
    split: 16,
    eyes: pair(0.21, 0.44),
  },
  {
    id: 'surprised',
    gaze: { yaw: 3, pitch: -3, roll: 0 },
    split: 19,
    eyes: pair(0.45, 0.47),
  },
  {
    id: 'excited',
    gaze: { yaw: 6, pitch: -14, roll: 0 },
    split: 19.5,
    eyes: pair(0.4, 0.56, -10),
  },
  {
    // eyes squinted into arcs: the tops converge slightly
    id: 'happy',
    gaze: { yaw: 5, pitch: 9, roll: 0 },
    split: 17,
    eyes: pair(0.27, 0.17, 14),
  },
  {
    id: 'laughing',
    gaze: { yaw: 4, pitch: 14, roll: 0 },
    split: 18,
    eyes: pair(0.34, 0.13, 20),
  },
  {
    // tops converging hard towards the centre, plus narrowed eyes
    id: 'angry',
    gaze: { yaw: 3, pitch: 7, roll: 0 },
    split: 17,
    eyes: pair(0.34, 0.15, 30),
  },
  {
    // the reverse: tops diverge and the gaze drops
    id: 'sad',
    gaze: { yaw: 3, pitch: -13, roll: 0 },
    split: 16,
    eyes: pair(0.22, 0.4, -28),
  },
  {
    id: 'scared',
    gaze: { yaw: 2, pitch: -20, roll: 0 },
    split: 20.5,
    eyes: pair(0.4, 0.6),
  },
  {
    // one eye clearly more closed than the other
    id: 'suspicious',
    gaze: { yaw: 12, pitch: 6, roll: -6 },
    split: 16,
    eyes: [eye(0.21, 0.4), eye(0.22, 0.15)],
  },
  {
    // Lopsided on both axes: sizes AND tilts mismatched. The squinted eye is flat on purpose
    // (ratio 1.6): near 1 it would be round and its tilt would not show.
    id: 'confused',
    gaze: { yaw: -14, pitch: 3, roll: 8 },
    split: 16.5,
    eyes: [eye(0.2, 0.44, -18), eye(0.28, 0.17, 14)],
  },
  {
    // the head leans: the roll carries the curiosity
    id: 'curious',
    gaze: { yaw: 16, pitch: -9, roll: -15 },
    split: 16.5,
    eyes: [eye(0.24, 0.46, -8), eye(0.2, 0.38, -8)],
  },
  {
    id: 'proud',
    gaze: { yaw: 5, pitch: 17, roll: 0 },
    split: 17,
    eyes: pair(0.3, 0.15, 18),
  },
  {
    id: 'shy',
    gaze: { yaw: -19, pitch: -14, roll: -7 },
    split: 14,
    eyes: pair(0.17, 0.3),
  },
  {
    // horizontal slits and a gaze that wanders off sideways
    id: 'bored',
    gaze: { yaw: -22, pitch: 2, roll: 0 },
    split: 16,
    eyes: pair(0.3, 0.12),
  },
  {
    // Half-closed lids go through `open`, the same on-screen vertical squash as a blink.
    id: 'sleepy',
    gaze: { yaw: 6, pitch: -9, roll: -3 },
    split: 16,
    eyes: pair(0.2, 0.42, 0, 0.42),
  },
];

export const EXPRESSION_BY_ID = new Map<ExpressionId, BotExpression>(EXPRESSIONS.map((e) => [e.id, e]));
export const DEFAULT_EXPRESSION: ExpressionId = 'neutral';

const lerpEyeCfg = (a: EyeCfg, b: EyeCfg, t: number): EyeCfg => ({
  w: lerp(a.w, b.w, t),
  h: lerp(a.h, b.h, t),
  tilt: lerp(a.tilt ?? 0, b.tilt ?? 0, t),
  open: lerp(a.open, b.open, t),
});

export function blendExpression(a: BotExpression, b: BotExpression, t: number): BotExpression {
  return {
    id: b.id,
    gaze: {
      yaw: lerp(a.gaze.yaw, b.gaze.yaw, t),
      pitch: lerp(a.gaze.pitch, b.gaze.pitch, t),
      roll: lerp(a.gaze.roll, b.gaze.roll, t),
    },
    split: lerp(a.split, b.split, t),
    eyes: [lerpEyeCfg(a.eyes[0], b.eyes[0], t), lerpEyeCfg(a.eyes[1], b.eyes[1], t)],
  };
}
