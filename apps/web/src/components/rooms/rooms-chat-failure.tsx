import { m } from '@orbs/i18n/client';
import { match, P } from 'ts-pattern';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import IconInfo from '~icons/lucide/info';
import type { RunRoom } from '@orbs/server/client';

export function RoomsChatFailure({ run }: { run: RunRoom }) {
  const bot = run.botName;

  const reason = match(run.failure)
    .with({ code: 'pi_missing' }, () => m.rooms_chat_failed_pi_missing({ bot }))
    .with({ code: 'pi_outdated' }, ({ version, minimum }) => m.rooms_chat_failed_pi_outdated({
      bot,
      version,
      minimum,
    }))
    .with({ code: 'model_unavailable' }, () => m.rooms_chat_failed_model_unavailable({ bot }))
    .with({ code: 'model_error' }, () => m.rooms_chat_failed_model_error({ bot }))
    .with({ code: 'pi_crashed' }, () => m.rooms_chat_failed_pi_crashed({ bot }))
    .with(P.union({ code: 'turn_error' }, P.nullish), () => m.rooms_chat_failed({ bot }))
    .exhaustive();

  const detail = match(run.failure)
    .with({ detail: P.string }, (failure) => failure.detail)
    .otherwise(() => null);

  return (
    <>
      <span className="text-xs text-muted-foreground">{reason}</span>
      {detail ? (
        <Popover>
          <PopoverTrigger asChild>
            <Button
              aria-label={m.rooms_chat_info()}
              size="icon-xs"
              title={m.rooms_chat_info()}
              variant="quiet"
            >
              <IconInfo className="size-3.5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent
            align="start"
            arrow={false}
            className="w-64 p-3"
          >
            <div className="flex flex-col gap-1.5 text-xs">
              <p className="font-medium">{m.rooms_chat_failed_detail()}</p>
              <p className="max-h-64 overflow-y-auto font-mono text-xxs wrap-break-word whitespace-pre-wrap text-muted-foreground">{detail}</p>
            </div>
          </PopoverContent>
        </Popover>
      ) : null}
    </>
  );
}
