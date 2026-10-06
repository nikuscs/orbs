/**
 * Resting radius of the ball, in viewBox units: the `scale` given to `BotEngine`. Chosen, not
 * measured. Everything else in this package is a fraction of it, which keeps the values measured
 * on the video independent of the display size.
 */
export const RADIUS = 100;

/**
 * Half side of the viewBox. The margin past the radius holds the rings: the orbit rings and the
 * comet swoosh reach 1.4 times the radius (140), and nothing bounds them at runtime. Only the
 * hand-tuned `RINGS` and `SWOOSH` tables in `decor.ts` keep them under 158.
 */
export const HALF_VIEWBOX = 158;
