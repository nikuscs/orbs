import { cn } from '@/lib/cn';
import IconPi from '~icons/brands/pi';
import IconClaudeCode from '~icons/logos/claude-code';
import IconClaude from '~icons/logos/claude-icon';
import IconCodex from '~icons/logos/codex';
import IconDeepseek from '~icons/logos/deepseek-icon';
import IconGemini from '~icons/logos/google-gemini-icon';
import IconGrok from '~icons/logos/grok-icon';
import IconMeta from '~icons/logos/meta-icon';
import IconMistral from '~icons/logos/mistral-ai-icon';
import IconOpenai from '~icons/logos/openai-icon';
import IconPerplexity from '~icons/logos/perplexity-icon';
import IconQwen from '~icons/logos/qwen-icon';
import IconBox from '~icons/lucide/box';
import type { BotBrand } from '@/types/bot.types';
import type { ComponentType, SVGProps } from 'react';

const brandLogos = {
  pi: { Icon: IconPi },
  'claude-code': { Icon: IconClaudeCode },
  codex: { Icon: IconCodex, className: 'dark:invert' },
  anthropic: { Icon: IconClaude },
  openai: { Icon: IconOpenai, className: 'fill-current' },
  xai: { Icon: IconGrok, className: 'fill-current' },
  google: { Icon: IconGemini },
  deepseek: { Icon: IconDeepseek },
  mistral: { Icon: IconMistral },
  qwen: { Icon: IconQwen },
  meta: { Icon: IconMeta },
  perplexity: { Icon: IconPerplexity },
} satisfies Record<BotBrand, BotBrandLogoEntry>;

interface BotBrandLogoEntry {
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
  className?: string;
}

interface BotBrandLogoProps {
  brand: BotBrand | null
  className?: string
}

export function BotBrandLogo({ brand, className }: BotBrandLogoProps) {
  if (!brand) {
    return <IconBox aria-hidden className={cn('size-4 text-muted-foreground', className)} />;
  }

  const { Icon, className: brandClassName }: BotBrandLogoEntry = brandLogos[brand];

  return <Icon aria-hidden className={cn('size-4', brandClassName, className)} />;
}
