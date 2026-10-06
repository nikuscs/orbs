import { NOTIF_BLUE } from './decor';
import { BotEngine } from './engine';
import { lookTarget, TURN_TIME } from './gaze';
import { clamp, easings } from './math';
import { mixHex } from './skins';
import { POSES, stateDef } from './states';
import { HALF_VIEWBOX, RADIUS } from './viewbox';
import type { ArcRender } from './decor';
import type { BotFrame } from './engine';
import type { BotExpression } from './expressions';
import type { StateId } from './states';

/*
 * Draws a `BotEngine` frame into an <svg> with plain DOM calls, framework-free. The layers are bloub's
 * BloubBot output, in its order: defs (eye mask, arc gradients), back arcs, dots when behind,
 * body, dots when in front, notification dot, front arcs. The eyes are holes in the mask, not
 * shapes on top, which is what clips them against the silhouette.
 */

const SVG_NS = 'http://www.w3.org/2000/svg';
const PAPER = '#f9f9f9';
const BOX = HALF_VIEWBOX * 2;
const FRAME_BOX = { x: -HALF_VIEWBOX, y: -HALF_VIEWBOX, width: BOX, height: BOX };
const ARC_GROUP = { fill: 'none', 'stroke-linecap': 'round' };

type Attrs = Record<string, string | number>;

/** One SVG element of a frame: what the painter syncs into the DOM and what a server renders as markup. */
export interface AvatarSvgNode {
  tag: string
  attrs: Attrs
  children: AvatarSvgNode[]
}

function svgNode(tag: string, attrs: Attrs = {}, children: AvatarSvgNode[] = []): AvatarSvgNode {
  return { tag, attrs, children };
}

/** A frame as an SVG tree, pure, so a server can render the first frame before any script runs. */
export function avatarSvg(frame: BotFrame, ink: string, uid: string): AvatarSvgNode[] {
  const maskId = `${uid}-mask`;
  const stroke = (arc: ArcRender): Attrs => ({ stroke: `url(#${uid}-${arc.id})`, 'stroke-width': arc.width, opacity: arc.opacity });

  const mask = svgNode('mask', {
    id: maskId,
    maskUnits: 'userSpaceOnUse',
    ...FRAME_BOX,
  }, [
    svgNode('path', { fill: '#fff', d: frame.bodyPath }),
    ...frame.eyes.map((eye) => svgNode('path', {
      d: eye.d,
      transform: eye.matrix,
      opacity: eye.alpha,
      fill: '#000',
    })),
    ...(frame.notch ? [svgNode('circle', {
      fill: '#000',
      cx: frame.notch.x,
      cy: frame.notch.y,
      r: frame.notch.r,
    })] : []),
  ]);

  const gradients = frame.arcs.map((arc) => svgNode(
    'linearGradient',
    {
      id: `${uid}-${arc.id}`,
      gradientUnits: 'userSpaceOnUse',
      x1: arc.grad.x1,
      y1: arc.grad.y1,
      x2: arc.grad.x2,
      y2: arc.grad.y2,
    },
    arc.grad.stops.map((color, stop) => svgNode('stop', { offset: stop / (arc.grad.stops.length - 1), 'stop-color': color })),
  ));

  const dots = svgNode('g', {}, frame.dots.map((dot) => {
    const fill = dot.color ?? (dot.depth === undefined ? ink : mixHex(PAPER, ink, dot.depth));
    const placed: Attrs = dot.d ? { d: dot.d, transform: `translate(${dot.x} ${dot.y}) rotate(${dot.rot ?? 0}) scale(${RADIUS})` } : { cx: dot.x, cy: dot.y, r: dot.r };

    return svgNode(dot.d ? 'path' : 'circle', {
      fill,
      opacity: dot.opacity,
      ...placed,
    });
  }));

  const body = svgNode('g', { opacity: frame.bodyAlpha }, [
    svgNode('path', { fill: PAPER, d: frame.bodyPath }),
    svgNode('g', { mask: `url(#${maskId})` }, [svgNode('rect', { ...FRAME_BOX, fill: ink })]),
  ]);

  return [
    svgNode('defs', {}, [mask, ...gradients]),
    svgNode('g', ARC_GROUP, frame.arcs.map((arc) => svgNode('path', { d: arc.back, ...stroke(arc) }))),
    ...(frame.dotsBehind ? [dots, body] : [body, dots]),
    ...(frame.notif ? [svgNode('circle', {
      fill: NOTIF_BLUE,
      cx: frame.notif.x,
      cy: frame.notif.y,
      r: frame.notif.r,
    })] : []),
    svgNode('g', ARC_GROUP, frame.arcs.map((arc) => svgNode('path', { d: arc.front, ...stroke(arc) }))),
  ];
}

/** The readable pose of a look, as reduced motion and the first paint show it. */
export function avatarStill(look: Pick<AvatarLook, 'state' | 'radii' | 'expression'>): BotFrame {
  return new BotEngine(RADIUS, look.state, look.radii, look.expression).sample(POSES[look.state]);
}

function syncAttrs(node: Element, attrs: Attrs) {
  for (const [name, value] of Object.entries(attrs)) {
    const text = String(value);

    if (node.getAttribute(name) !== text) {
      node.setAttribute(name, text);
    }
  }

  // A node reused for another layer (the dots and the body swap places) must not keep the old layer's attributes.
  for (const name of node.getAttributeNames()) {
    if (!(name in attrs)) {
      node.removeAttribute(name);
    }
  }
}

/**
 * Nodes are matched by POSITION: `sample()` returns fresh arrays every frame, so matching by identity
 * recreated every SVG node at the screen's rate. Here nodes live and only attributes move, and the
 * nodes a server rendered for the first frame are adopted, not redrawn.
 */
function syncChildren(parent: Element, nodes: AvatarSvgNode[]) {
  for (const [index, node] of nodes.entries()) {
    let current = parent.children.item(index);

    if (current?.tagName !== node.tag) {
      const next = document.createElementNS(SVG_NS, node.tag);

      if (current) {
        current.replaceWith(next);
      } else {
        parent.appendChild(next);
      }

      current = next;
    }

    syncAttrs(current, node.attrs);
    syncChildren(current, node.children);
  }

  while (parent.children.length > nodes.length) {
    parent.lastElementChild?.remove();
  }
}

export interface AvatarLook {
  state: StateId
  radii: number[] | null
  expression: BotExpression | null
  ink: string
  /** cap on the drawing rate, never on the clock; 0 draws at the screen's rate */
  fps: number
}

/**
 * One live avatar: its engine, clock, pointer and render loop. A drawn frame costs a style
 * recalculation, a layout and a paint, so the loop only runs while someone can see the bot.
 */
export class AvatarPlayer {
  private readonly svg: SVGSVGElement;
  private readonly uid: string;
  private engine: BotEngine | null = null;
  private look: AvatarLook | null = null;
  private clock = 0;
  private raf = 0;
  private last = 0;
  private drawn = -Infinity;
  private follow = false;
  private onscreen = true;
  private pointer: { x: number; y: number } | null = null;
  private aiming = false;
  private turnSince = 0;
  // IntersectionObserver covers both ways of being unseen: scrolled away, and an unrendered ancestor.
  private readonly observer = new IntersectionObserver((entries) => {
    this.onscreen = entries.at(-1)?.isIntersecting ?? this.onscreen;
    this.wake();
  });

  constructor(svg: SVGSVGElement, uid: string) {
    this.svg = svg;
    this.uid = uid;
    this.observer.observe(svg);
    document.addEventListener('visibilitychange', this.wake);
  }

  /** The first call creates the engine on these settings; later ones morph to them, as the engine does. */
  update(look: AvatarLook) {
    this.look = look;
    this.engine ??= new BotEngine(RADIUS, look.state, look.radii, look.expression);
    this.engine.setState(look.state, this.clock);
    this.engine.setBody(look.radii, this.clock);
    this.engine.setExpression(look.expression, this.clock);
    this.draw();
  }

  /** Still avatars and reduced motion never get a player: they are the `avatarStill` markup alone. */
  setFollow(follow: boolean) {
    this.follow = follow;

    if (this.follow) {
      window.addEventListener('pointermove', this.onPointerMove);
      document.addEventListener('pointerleave', this.onPointerLeave);
    } else {
      this.unfollow();
    }

    this.wake();
  }

  destroy() {
    this.halt();
    this.unfollow();
    this.observer.disconnect();
    document.removeEventListener('visibilitychange', this.wake);
  }

  private draw() {
    if (!this.engine || !this.look) {
      return;
    }

    syncChildren(this.svg, avatarSvg(this.engine.sample(this.clock), this.look.ink, this.uid));
  }

  private wake = () => {
    if (this.onscreen && document.visibilityState !== 'hidden') {
      this.run();
    } else {
      this.halt();
    }
  };

  /** The loop restarts with `last = 0`, so a resume's first frame has dt 0 instead of the jump a stale timestamp would cause. */
  private run() {
    if (this.raf) {
      return;
    }

    this.last = 0;
    this.raf = requestAnimationFrame(this.tick);
  }

  private halt() {
    cancelAnimationFrame(this.raf);
    this.raf = 0;
  }

  /*
   * The clock always advances, the drawing does not: a skipped frame loses no animation time, it
   * only draws less often. The budget compares the bot's clock, not `ms`, so an automatic pause
   * does not count as lag to catch up.
   */
  private tick = (ms: number) => {
    this.raf = requestAnimationFrame(this.tick);
    const dt = this.last ? Math.min((ms - this.last) / 1000, 0.064) : 0;
    this.last = ms;
    this.clock += dt;
    const fps = this.look?.fps ?? 0;

    if (this.clock - this.drawn < (fps > 0 ? 1 / fps : 0)) {
      return;
    }

    this.drawn = this.clock;

    if (this.follow) {
      this.aim();
    }

    this.draw();
  };

  private onPointerMove = (event: PointerEvent) => {
    if (event.pointerType !== 'touch') {
      this.pointer = { x: event.clientX, y: event.clientY };
    }
  };

  private onPointerLeave = () => {
    this.pointer = null;
  };

  private unfollow() {
    window.removeEventListener('pointermove', this.onPointerMove);
    document.removeEventListener('pointerleave', this.onPointerLeave);
    this.release();
  }

  private release() {
    if (!this.aiming) {
      return;
    }

    this.engine?.setLook(null, this.clock, TURN_TIME);
    this.aiming = false;
  }

  private aim() {
    if (!this.engine || !stateDef(this.engine.state).baseFace) {
      this.release();
      return;
    }

    const box = this.svg.getBoundingClientRect();

    if (box.width === 0 || box.height === 0) {
      return;
    }

    if (!this.aiming) {
      this.turnSince = this.clock;
    }

    const halfWidth = Math.max(1, window.innerWidth / 2);
    const halfHeight = Math.max(1, window.innerHeight / 2);
    this.engine.setLook(
      lookTarget({
        nx: this.pointer ? clamp((this.pointer.x - (box.left + box.width / 2)) / halfWidth, -1, 1) : 0,
        ny: this.pointer ? clamp((this.pointer.y - (box.top + box.height / 2)) / halfHeight, -1, 1) : 0,
        tour: easings.easeOutQuint(clamp((this.clock - this.turnSince) / TURN_TIME)),
        pointer: this.pointer !== null,
      }),
      this.clock,
    );
    this.aiming = true;
  }
}
