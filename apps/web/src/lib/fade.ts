import type { FadeOptions } from '@/types/fade.types';

function fadeAxisGradient(orientation: 'horizontal' | 'vertical' | undefined, fadeOptions: FadeOptions) {
  const isHorizontal = orientation === 'horizontal';
  const fadeDirection = isHorizontal ? 'to right' : 'to bottom';
  const fadeWidthStart = fadeOptions.width / 2;
  const fadeWidthEnd = 100 - fadeOptions.width / 2;
  const fadeInsetStart = Math.max(0, Math.min(fadeOptions.inset, fadeWidthStart));
  const fadeInsetEnd = 100 - fadeOptions.inset;
  return `linear-gradient(${fadeDirection}, rgba(0, 0, 0, ${fadeOptions.alpha}) ${fadeInsetStart}%, rgba(0, 0, 0, 1) ${fadeWidthStart}%, rgba(0, 0, 0, 1) ${fadeWidthEnd}%, rgba(0, 0, 0, ${fadeOptions.alpha}) ${fadeInsetEnd}%)`;
}

function fadeEdgeGradient(orientation: 'top' | 'bottom' | 'left' | 'right', fadeOptions: FadeOptions) {
  const directionMap = { top: 'to bottom', bottom: 'to top', left: 'to right', right: 'to left' } as const;
  const fadeDirection = directionMap[orientation];
  return `linear-gradient(${fadeDirection}, rgba(0, 0, 0, ${fadeOptions.alpha}) ${fadeOptions.inset}%, rgba(0, 0, 0, 1) ${fadeOptions.width}%, rgba(0, 0, 0, 1) 100%)`;
}

export function fadeScrollGradient(
  orientation: 'horizontal' | 'vertical' | undefined,
  fadeOptions: FadeOptions,
  canScrollPrev: boolean,
  canScrollNext: boolean,
  scrollProgress?: { current: number; total: number },
) {
  const isHorizontal = orientation === 'horizontal';

  if (scrollProgress) {
    const { current, total } = scrollProgress;
    const isAtStart = current <= 0.05;
    const isAtEnd = current >= total - 0.05;

    if (isHorizontal) {
      if (!isAtStart && !isAtEnd) {
        return fadeAxisGradient(orientation, fadeOptions);
      }

      if (!isAtStart && isAtEnd) {
        return fadeEdgeGradient('left', fadeOptions);
      }

      if (isAtStart && !isAtEnd) {
        return fadeEdgeGradient('right', fadeOptions);
      }
    } else {
      if (!isAtStart && !isAtEnd) {
        return fadeAxisGradient(orientation, fadeOptions);
      }

      if (!isAtStart && isAtEnd) {
        return fadeEdgeGradient('top', fadeOptions);
      }

      if (isAtStart && !isAtEnd) {
        return fadeEdgeGradient('bottom', fadeOptions);
      }
    }

    return 'none';
  }

  if (isHorizontal) {
    if (canScrollPrev && canScrollNext) {
      return fadeAxisGradient(orientation, fadeOptions);
    }

    if (canScrollPrev) {
      return fadeEdgeGradient('left', fadeOptions);
    }

    if (canScrollNext) {
      return fadeEdgeGradient('right', fadeOptions);
    }
  } else {
    if (canScrollPrev && canScrollNext) {
      return fadeAxisGradient(orientation, fadeOptions);
    }

    if (canScrollPrev) {
      return fadeEdgeGradient('top', fadeOptions);
    }

    if (canScrollNext) {
      return fadeEdgeGradient('bottom', fadeOptions);
    }
  }

  return 'none';
}
