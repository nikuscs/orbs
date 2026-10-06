import { DEFAULT_EXPRESSION, EXPRESSION_BY_ID } from '@orbs/avatar-blobs/expressions';
import { AvatarPlayer, avatarStill, avatarSvg } from '@orbs/avatar-blobs/player';
import { BODY_BY_ID, COLOR_BY_ID, COLORS, DEFAULT_BODY, DEFAULT_COLOR, INVERT_ON_DARK, INVERT_ON_LIGHT } from '@orbs/avatar-blobs/skins';
import { HALF_VIEWBOX } from '@orbs/avatar-blobs/viewbox';
import { createElement, Fragment, useEffect, useId, useRef, useState, useSyncExternalStore } from 'react';
import { cn } from '@/lib/cn';
import type { ExpressionId } from '@orbs/avatar-blobs/expressions';
import type { AvatarSvgNode } from '@orbs/avatar-blobs/player';
import type { BodyId, ColorId } from '@orbs/avatar-blobs/skins';
import type { StateId } from '@orbs/avatar-blobs/states';
import type { ReactElement } from 'react';

const REDUCED_MOTION = '(prefers-reduced-motion: reduce)';

function useReducedMotion() {
  return useSyncExternalStore(
    (onStoreChange) => {
      const mediaQuery = window.matchMedia(REDUCED_MOTION);
      mediaQuery.addEventListener('change', onStoreChange);

      return () => mediaQuery.removeEventListener('change', onStoreChange);
    },
    () => window.matchMedia(REDUCED_MOTION).matches,
    () => false,
  );
}

interface AvatarBlobProps {
  body?: BodyId
  color?: ColorId
  expression?: ExpressionId
  state?: StateId
  size?: number
  animate?: boolean
  follow?: boolean
  fps?: number
  label?: string
  className?: string
}

export function AvatarBlob({ body = DEFAULT_BODY, color = DEFAULT_COLOR, expression = DEFAULT_EXPRESSION, state = 'idle', size = 320, animate = true, follow = false, fps = 0, label, className }: AvatarBlobProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const playerRef = useRef<AvatarPlayer>(null);
  const uid = `avatar-${useId().replaceAll(/[^\w-]/g, '')}`;
  const reducedMotion = useReducedMotion();
  const moving = animate && !reducedMotion;
  const radii = BODY_BY_ID.get(body)?.radii ?? null;
  const mood = EXPRESSION_BY_ID.get(expression) ?? null;
  const ink = (COLOR_BY_ID.get(color) ?? COLORS[0]).hex;

  const still = avatarSvg(avatarStill({
    state,
    radii,
    expression: mood,
  }), ink, uid);

  const [lookWhenMotionStarted, setLookWhenMotionStarted] = useState({ moving, nodes: still });

  if (lookWhenMotionStarted.moving !== moving) {
    setLookWhenMotionStarted({ moving, nodes: still });
  }

  const toElement = (node: AvatarSvgNode): ReactElement => createElement(
    node.tag,
    Object.fromEntries(Object.entries(node.attrs).map(([name, value]) => [name.replaceAll(/-([a-z])/g, (_, letter: string) => letter.toUpperCase()), value])),
    ...node.children.map(toElement),
  );

  useEffect(() => {
    const svg = svgRef.current;

    if (!moving || !svg) {
      return;
    }

    const player = new AvatarPlayer(svg, uid);
    playerRef.current = player;

    return () => {
      player.destroy();
      playerRef.current = null;
    };
  }, [moving, uid]);

  useEffect(() => {
    playerRef.current?.update({
      state,
      radii,
      expression: mood,
      ink,
      fps,
    });
  }, [moving, state, radii, mood, ink, fps]);

  useEffect(() => {
    playerRef.current?.setFollow(follow);
  }, [moving, follow]);

  return (
    <svg
      aria-hidden={label ? undefined : true}
      aria-label={label}
      className={cn(INVERT_ON_DARK.includes(color) && 'dark:invert', INVERT_ON_LIGHT.includes(color) && 'invert dark:invert-0', className)}
      height={size}
      key={moving ? 'moving' : 'still'}
      ref={svgRef}
      role={label ? 'img' : undefined}
      viewBox={`${-HALF_VIEWBOX} ${-HALF_VIEWBOX} ${HALF_VIEWBOX * 2} ${HALF_VIEWBOX * 2}`}
      width={size}
    >
      {createElement(Fragment, null, ...(moving ? lookWhenMotionStarted.nodes : still).map(toElement))}
    </svg>
  );
}
