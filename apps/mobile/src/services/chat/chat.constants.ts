export const CHAT_TYPING = {
  dot: {
    animationName: {
      '0%': { opacity: 0.35 },
      '40%': { opacity: 1 },
      '80%': { opacity: 0.35 },
      '100%': { opacity: 0.35 },
    },
    animationDuration: '1.4s',
    animationIterationCount: 'infinite',
    animationTimingFunction: 'ease-in-out',
  },
  label: {
    animationName: {
      '0%': { opacity: 0.5 },
      '50%': { opacity: 1 },
      '100%': { opacity: 0.5 },
    },
    animationDuration: '1.8s',
    animationIterationCount: 'infinite',
    animationTimingFunction: 'ease-in-out',
  },
  dotDelayMs: 160,
} as const;

export const CHAT_PANE = { barHeight: 56 } as const;

export const CHAT_MEDIA = { seekStepSeconds: 5, closeDragPx: 120, maxZoom: 4, playbackEvent: 'chat.playback' } as const;
