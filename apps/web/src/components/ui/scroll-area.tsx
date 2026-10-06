import { AnimatePresence } from 'motion/react';
import * as motion from 'motion/react-m';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useIsMobile } from '@/hooks/use-is-mobile';
import { cn } from '@/lib/cn';
import { fadeScrollGradient } from '@/lib/fade';
import { Badge } from './badge';
import type { ComponentProps } from 'react';

interface ScrollAreaProps extends Omit<ComponentProps<'div'>, 'onScroll'> {
  enabled?: boolean
  threshold?: number
  maskWidth?: number
  fadeAlpha?: number
  fadeInset?: number
  scrollClickSize?: number
  labelDown?: string
  labelUp?: string
  labelLeft?: string
  labelRight?: string
  orientation?: 'vertical' | 'horizontal' | 'both'
  showScrollIndicators?: boolean
  viewportClassName?: string
  maxHeight?: string
  fullHeight?: boolean
  dashboard?: boolean
  onScroll?: () => void
  onAtTop?: () => void
  onAtBottom?: () => void
  onAtLeft?: () => void
  onAtRight?: () => void
  onAtMiddle?: () => void
}

// Bitmask for badge visibility — primitive state, Object.is() skips re-renders when unchanged
const BADGE_TOP = 1;
const BADGE_BOTTOM = 2;
const BADGE_LEFT = 4;
const BADGE_RIGHT = 8;

const OVERFLOW_CLASSES = {
  vertical: 'overflow-y-auto overflow-x-hidden',
  horizontal: 'overflow-x-auto overflow-y-hidden',
  both: 'overflow-auto',
} as const;

const SCROLLBAR_CLASSES =
  'scrollbar scrollbar-w-1 scrollbar-h-1 scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent scrollbar-thumb-rounded-full [scrollbar-gutter:stable]';

function ScrollArea({
  children,
  enabled: enabledProp,
  threshold = 0.5,
  maskWidth = 7,
  fadeAlpha = 0,
  fadeInset = 0,
  scrollClickSize = 100,
  labelUp = 'More ↑',
  labelDown = 'More ↓',
  labelLeft = 'More ←',
  labelRight = 'More →',
  className,
  orientation = 'vertical',
  showScrollIndicators = true,
  viewportClassName,
  maxHeight,
  fullHeight,
  dashboard = false,
  onScroll,
  onAtTop,
  onAtBottom,
  onAtLeft,
  onAtRight,
  onAtMiddle,
  ...props
}: ScrollAreaProps) {
  const isMobile = useIsMobile();
  const enabled = enabledProp ?? (dashboard ? !isMobile : true);
  const fullHeightValue = fullHeight ?? dashboard;
  const viewportClassNameValue = viewportClassName ?? (dashboard ? 'px-4 py-2' : undefined);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef(0);
  const scrollFlagRef = useRef(false);
  const suppressMiddleRef = useRef(false);
  const [badgeMask, setBadgeMask] = useState(0);

  const callbacksRef = useRef({
    onScroll,
    onAtTop,
    onAtBottom,
    onAtLeft,
    onAtRight,
    onAtMiddle,
  });

  // Keep the latest callbacks without re-subscribing the scroll observers.
  useEffect(() => {
    callbacksRef.current = { onScroll, onAtTop, onAtBottom, onAtLeft, onAtRight, onAtMiddle };
  });

  const prevRef = useRef({
    isAtTop: true,
    isAtBottom: false,
    isAtLeft: true,
    isAtRight: false,
    isAtMiddle: false,
    badges: 0,
  });

  useLayoutEffect(() => {
    if (!enabled) {
      return;
    }

    const scroller = scrollerRef.current;

    if (!scroller) {
      return;
    }

    // Pre-compute values that only change when the effect re-runs
    const hasHorizontal = orientation === 'horizontal' || orientation === 'both';
    const isHorizontal = orientation === 'horizontal';
    const isBoth = orientation === 'both';
    const buttonThreshold = threshold * 100;
    const fadeOptions = { overflow: false, width: maskWidth, alpha: fadeAlpha, inset: fadeInset };

    function recalculate() {
      if (!scroller) {
        return;
      }

      const { scrollTop, scrollHeight, clientHeight, scrollLeft, scrollWidth, clientWidth } = scroller;
      const noVScroll = scrollHeight <= clientHeight;
      const isAtTop = scrollTop <= threshold;
      const isAtBottom = scrollTop + clientHeight >= scrollHeight - threshold || noVScroll;
      const noHScroll = scrollWidth <= clientWidth;
      const isAtLeft = scrollLeft <= threshold;
      const isAtRight = scrollLeft + clientWidth >= scrollWidth - threshold || noHScroll;
      const isAtMiddle = (!isAtTop && !isAtBottom) || (hasHorizontal && !isAtLeft && !isAtRight);
      const showTop = scrollTop > buttonThreshold;
      const showBottom = scrollTop + clientHeight < scrollHeight - buttonThreshold && !noVScroll;
      const showLeft = scrollLeft > buttonThreshold;
      const showRight = scrollLeft + clientWidth < scrollWidth - buttonThreshold && !noHScroll;
      const badges = (showTop ? BADGE_TOP : 0) | (showBottom ? BADGE_BOTTOM : 0) | (showLeft ? BADGE_LEFT : 0) | (showRight ? BADGE_RIGHT : 0);
      const prev = prevRef.current;

      // Fast path — nothing changed, no allocations, no DOM writes, no state updates
      if (
        prev.badges === badges &&
        prev.isAtTop === isAtTop &&
        prev.isAtBottom === isAtBottom &&
        prev.isAtLeft === isAtLeft &&
        prev.isAtRight === isAtRight &&
        prev.isAtMiddle === isAtMiddle
      ) {
        if (scrollFlagRef.current) {
          callbacksRef.current.onScroll?.();
        }
        return;
      }

      // Mask — direct DOM mutation, bypasses React reconciliation entirely
      let verticalMask = 'none';
      let horizontalMask = 'none';

      if (!isHorizontal) {
        verticalMask = fadeScrollGradient('vertical', fadeOptions, showTop, showBottom);
      }

      if (hasHorizontal) {
        horizontalMask = fadeScrollGradient('horizontal', fadeOptions, showLeft, showRight);
      }

      let mask = 'none';

      if (isBoth && verticalMask !== 'none' && horizontalMask !== 'none') {
        mask = `${verticalMask}, ${horizontalMask}`;
      } else if (verticalMask !== 'none') {
        mask = verticalMask;
      } else {
        mask = horizontalMask;
      }

      scroller.style.setProperty('mask-image', mask);
      scroller.style.setProperty('-webkit-mask-image', mask);

      // Badge state — primitive bitmask, React skips re-render when value is identical
      if (prev.badges !== badges) {
        setBadgeMask(badges);
      }

      // Edge callbacks — only fire on transitions
      const cbs = callbacksRef.current;

      if (!prev.isAtTop && isAtTop) {
        suppressMiddleRef.current = true;
        cbs.onAtTop?.();
      }

      if (!prev.isAtBottom && isAtBottom) {
        suppressMiddleRef.current = true;
        cbs.onAtBottom?.();
      }

      if (hasHorizontal && !prev.isAtLeft && isAtLeft) {
        suppressMiddleRef.current = true;
        cbs.onAtLeft?.();
      }

      if (hasHorizontal && !prev.isAtRight && isAtRight) {
        suppressMiddleRef.current = true;
        cbs.onAtRight?.();
      }

      if (!prev.isAtMiddle && isAtMiddle && !suppressMiddleRef.current) {
        cbs.onAtMiddle?.();
      }

      suppressMiddleRef.current = false;

      if (scrollFlagRef.current) {
        cbs.onScroll?.();
      }

      // Mutate prev in place — no allocation
      prev.isAtTop = isAtTop;
      prev.isAtBottom = isAtBottom;
      prev.isAtLeft = isAtLeft;
      prev.isAtRight = isAtRight;
      prev.isAtMiddle = isAtMiddle;
      prev.badges = badges;
    }

    // All event sources funnel into one rAF — scroll, resize, and mutation coalesce into a single frame
    function schedule(fromScroll?: boolean) {
      if (fromScroll) {
        scrollFlagRef.current = true;
      }

      if (!rafRef.current) {
        rafRef.current = requestAnimationFrame(() => {
          rafRef.current = 0;
          recalculate();
          scrollFlagRef.current = false;
        });
      }
    }

    // Initial sync — runs synchronously before browser paint (useLayoutEffect guarantee)
    recalculate();

    // Passive scroll listener — browser doesn't block compositing waiting for JS
    function handleScroll() {
      schedule(true);
    }

    scroller.addEventListener('scroll', handleScroll, { passive: true });

    // Observers batch through the same rAF — multiple mutations/resizes in one frame = one recalculate
    function handleObserver() {
      schedule();
    }

    const resizeObserver = new ResizeObserver(handleObserver);
    resizeObserver.observe(scroller);

    const mutationObserver = new MutationObserver(handleObserver);
    mutationObserver.observe(scroller, { childList: true, subtree: true });

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = 0;
      }

      scroller.removeEventListener('scroll', handleScroll);
      resizeObserver.disconnect();
      mutationObserver.disconnect();
      scroller.style.removeProperty('mask-image');
      scroller.style.removeProperty('-webkit-mask-image');
    };
  }, [enabled, orientation, threshold, maskWidth, fadeAlpha, fadeInset]);

  const overflowClass = OVERFLOW_CLASSES[orientation];

  if (!enabled) {
    return (
      <div className={cn('relative', fullHeightValue && 'h-full', className)} {...props}>
        <div className={cn(SCROLLBAR_CLASSES, fullHeightValue && 'h-full', overflowClass, maxHeight, viewportClassNameValue)}>{children}</div>
      </div>
    );
  }

  const hasHorizontal = orientation === 'horizontal' || orientation === 'both';

  return (
    <div className={cn('relative overflow-hidden', fullHeightValue && 'h-full', className)} {...props}>
      <div
        className={cn('relative max-h-[inherit]', SCROLLBAR_CLASSES, fullHeightValue && 'h-full', overflowClass, maxHeight, viewportClassNameValue)}
        ref={scrollerRef}
      >
        {children}
      </div>

      {showScrollIndicators ? (
        <AnimatePresence>
          {(badgeMask & BADGE_BOTTOM) !== 0 ? (
            <motion.button
              animate={{ opacity: 1, y: 0 }}
              className="absolute inset-x-0 bottom-2 z-10 flex-center cursor-pointer select-none"
              exit={{ opacity: 0, y: 10 }}
              initial={{ opacity: 0, y: 10 }}
              key="bottom"
              tabIndex={-1}
              transition={{ duration: 0.4, ease: 'easeOut' }}
              type="button"
              onClick={() => scrollerRef.current?.scrollBy({ top: scrollClickSize, behavior: 'smooth' })}
            >
              <Badge className="px-1.5 py-1 text-[0.6rem] leading-none select-none" variant="secondary">
                {labelDown}
              </Badge>
            </motion.button>
          ) : null}
          {(badgeMask & BADGE_TOP) !== 0 ? (
            <motion.button
              animate={{ opacity: 1, y: 0 }}
              className="absolute inset-x-0 top-2 z-10 flex-center cursor-pointer select-none"
              exit={{ opacity: 0, y: -10 }}
              initial={{ opacity: 0, y: -10 }}
              key="top"
              tabIndex={-1}
              transition={{ duration: 0.4, ease: 'easeOut' }}
              type="button"
              onClick={() => scrollerRef.current?.scrollBy({ top: -scrollClickSize, behavior: 'smooth' })}
            >
              <Badge className="px-1.5 py-1 text-[0.6rem] leading-none select-none" variant="secondary">
                {labelUp}
              </Badge>
            </motion.button>
          ) : null}
          {hasHorizontal && (badgeMask & BADGE_LEFT) !== 0 ? (
            <motion.button
              animate={{ opacity: 1, x: 0 }}
              className="absolute inset-y-0 left-2 z-10 flex-center cursor-pointer select-none"
              exit={{ opacity: 0, x: -10 }}
              initial={{ opacity: 0, x: -10 }}
              key="left"
              tabIndex={-1}
              transition={{ duration: 0.4, ease: 'easeOut' }}
              type="button"
              onClick={() => scrollerRef.current?.scrollBy({ left: -scrollClickSize, behavior: 'smooth' })}
            >
              <Badge className="px-1.5 py-1 text-[0.6rem] leading-none select-none" variant="secondary">
                {labelLeft}
              </Badge>
            </motion.button>
          ) : null}
          {hasHorizontal && (badgeMask & BADGE_RIGHT) !== 0 ? (
            <motion.button
              animate={{ opacity: 1, x: 0 }}
              className="absolute inset-y-0 right-2 z-10 flex-center cursor-pointer select-none"
              exit={{ opacity: 0, x: 10 }}
              initial={{ opacity: 0, x: 10 }}
              key="right"
              tabIndex={-1}
              transition={{ duration: 0.4, ease: 'easeOut' }}
              type="button"
              onClick={() => scrollerRef.current?.scrollBy({ left: scrollClickSize, behavior: 'smooth' })}
            >
              <Badge className="px-1.5 py-1 text-[0.6rem] leading-none select-none" variant="secondary">
                {labelRight}
              </Badge>
            </motion.button>
          ) : null}
        </AnimatePresence>
      ) : null}
    </div>
  );
}

export { ScrollArea };
