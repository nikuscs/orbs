import { m } from '@orbs/i18n/client';
import type { ExpressionId } from '@orbs/avatar-blobs/expressions';
import type { BodyId, ColorId } from '@orbs/avatar-blobs/skins';

export const AVATAR_BODY_LABELS = {
  circle: m.avatars_body_circle,
  pebble: m.avatars_body_pebble,
  squircle: m.avatars_body_squircle,
  capsule: m.avatars_body_capsule,
  triangle: m.avatars_body_triangle,
  hexagon: m.avatars_body_hexagon,
  cloud: m.avatars_body_cloud,
  droplet: m.avatars_body_droplet,
} satisfies Record<BodyId, () => string>;

export const AVATAR_COLOR_LABELS = {
  ink: m.avatars_color_ink,
  cream: m.avatars_color_cream,
  brown: m.avatars_color_brown,
  red: m.avatars_color_red,
  orange: m.avatars_color_orange,
  amber: m.avatars_color_amber,
  green: m.avatars_color_green,
  turquoise: m.avatars_color_turquoise,
  blue: m.avatars_color_blue,
  violet: m.avatars_color_violet,
  pink: m.avatars_color_pink,
  grey: m.avatars_color_grey,
} satisfies Record<ColorId, () => string>;

export const AVATAR_EXPRESSION_LABELS = {
  neutral: m.avatars_expression_neutral,
  attentive: m.avatars_expression_attentive,
  surprised: m.avatars_expression_surprised,
  excited: m.avatars_expression_excited,
  happy: m.avatars_expression_happy,
  laughing: m.avatars_expression_laughing,
  angry: m.avatars_expression_angry,
  sad: m.avatars_expression_sad,
  scared: m.avatars_expression_scared,
  suspicious: m.avatars_expression_suspicious,
  confused: m.avatars_expression_confused,
  curious: m.avatars_expression_curious,
  proud: m.avatars_expression_proud,
  shy: m.avatars_expression_shy,
  bored: m.avatars_expression_bored,
  sleepy: m.avatars_expression_sleepy,
} satisfies Record<ExpressionId, () => string>;
