import { match } from 'ts-pattern';
import IconCloudflare from '~icons/logos/cloudflare-icon';
import IconLinear from '~icons/logos/linear-icon';
import IconNotion from '~icons/logos/notion-icon';
import IconSentry from '~icons/logos/sentry-icon';
import IconServer from '~icons/lucide/server';

interface BotMcpLogoProps {
  name: string
}

export function BotMcpLogo({ name }: BotMcpLogoProps) {
  return match(name)
    .with('cloudflare', () => <IconCloudflare aria-hidden className="size-4 shrink-0" />)
    .with('linear', () => <IconLinear aria-hidden className="size-4 shrink-0 dark:invert" />)
    .with('notion', () => <IconNotion aria-hidden className="size-4 shrink-0 dark:invert" />)
    .with('sentry', () => <IconSentry aria-hidden className="size-4 shrink-0 [&_path]:fill-current" />)
    .otherwise(() => <IconServer aria-hidden className="size-4 shrink-0 text-muted-foreground" />);
}
