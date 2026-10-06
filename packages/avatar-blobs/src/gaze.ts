import type { Look } from './engine';

/*
 * Where the bot looks while following the pointer. Pure: the pointer comes in already normalised,
 * so the rule needs no DOM.
 *
 * Head angles in degrees, CHOSEN, not measured: the reference video shows no pointer following.
 * Wide enough to stand out from the idle drift (7deg of yaw, 5.5 of pitch), restrained enough that
 * no eye goes behind the sphere's limb.
 */
const YAW_MAX = 16;
const PITCH_MAX = 13;

/**
 * Gaze height with the pointer centred, chosen slightly above the equator so the bot looks
 * attentive. ABSOLUTE on purpose: relative to the expression, the eyes dropped on the first mood
 * change, since `neutral` looks up at +28.6deg while the moods sit between -9 and +9.
 */
const PITCH = 10;

/**
 * Head turn while following: bloub's settings view turns the bot to look LEFT, towards its panel.
 * Not a mirror of the image: the eyes really go round the sphere, so they keep their lean and
 * depth squash.
 */
const TURN = 26;

/**
 * Full turn travelled ON THE WAY: the eyes go round the ball before arriving, crossing the limb
 * and reappearing on the other side. It lands exactly by construction, -360deg being 0.
 */
const SPIN = 360;

/** Duration of the turn, a little shorter than the `swirl` entry so the eyes land before its rings fade. */
export const TURN_TIME = 1.1;

interface Aim {
  /** horizontal pointer offset from the bot centre, -1 to 1 (right positive) */
  nx: number
  /** vertical offset, -1 to 1, screen direction (down positive) */
  ny: number
  /** progress of the arrival, 0 to 1 */
  tour: number
  /** false when no pointer is known: the head stays turned but lives again */
  pointer: boolean
}

/**
 * Gaze target. `tour` drives everything: it raises the hold on the pose (`mix`) and melts the
 * travelled turn (`spin`) together. At 0 the state's pose rules alone; at 1 the head is turned and
 * follows the pointer. Nothing here compensates the shown expression: the engine mixes, because
 * only it knows the pose at time t.
 */
export function lookTarget({ nx, ny, tour, pointer }: Aim): Look {
  return {
    yaw: -TURN + nx * YAW_MAX,
    // positive pitch looks up while screen y goes down
    pitch: PITCH - ny * PITCH_MAX,
    mix: tour,
    spin: SPIN * (1 - tour),
    // With no pointer the head stays turned but gets its drift back, or the bot stares at a dead
    // point and keyboard or touch users see a frozen avatar.
    wander: pointer ? 0 : 1,
  };
}
