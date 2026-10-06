import { createCn } from 'cn/config';

const tailwindMergeConfig = {
  theme: {
    screens: ['xs', 'xxs'],
  },
  extend: {
    classGroups: {
      'font-size': ['text-xxs'],
      screens: ['xs', 'xxs'],
    },
  },
  override: {
    theme: {
      animate: ['spin', 'ping', 'pulse', 'bounce'],
    },
  },
};

export const cn = createCn(tailwindMergeConfig);
