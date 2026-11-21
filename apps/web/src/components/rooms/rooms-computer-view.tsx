import { useComputerLabel, useComputerViewer } from '@repo/client/react';
import { m } from '@repo/i18n/client';
import { ButtonLoading } from '@repo/ui/button-loading';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@repo/ui/dialog';
import { FormErrors } from '@repo/ui/forms/form';
import { StatusDot } from '@repo/ui/status-dot';
import { match } from 'ts-pattern';
import { RoomsComputerActions } from '@/components/rooms/rooms-computer-actions';
import { RoomsComputerScreen } from '@/components/rooms/rooms-computer-screen';
import IconHand from '~icons/lucide/hand';
import IconMousePointerClick from '~icons/lucide/mouse-pointer-click';
import type { Bot } from '@repo/contracts/universal';

interface RoomsComputerViewProps {
  bot: Bot
  onOpenChange: (open: boolean) => void
}

export function RoomsComputerView({ bot, onOpenChange }: RoomsComputerViewProps) {
  const { computer, url, isControlling, takeOver, finish } = useComputerViewer(bot.id);
  const { label, tone } = useComputerLabel(computer.status, isControlling);
  const state = computer.status?.state ?? 'off';

  const error = match({ isError: computer.isError, hasViewerFailed: computer.hasViewerFailed })
    .with({ isError: true }, { hasViewerFailed: true }, () => m.rooms_computer_error())
    .otherwise(() => computer.actionError);

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent
        flush
        className="w-[min(96vw,calc((100dvh-9rem)*1.6))] max-w-none overflow-hidden"
      >
        <div className="flex flex-col gap-0.5 border-b border-border/50 px-4 py-3 pr-12">
          <DialogTitle className="truncate">{m.rooms_computer_view_title({ bot: bot.name })}</DialogTitle>
          <div className="flex items-center gap-2">
            <StatusDot label={label} variant={tone} />
            <DialogDescription className="truncate">{isControlling ? m.rooms_computer_controlling() : label}</DialogDescription>
          </div>
        </div>
        <div className="relative aspect-[16/10] w-full bg-black">
          {url && state === 'running' ? (
            <iframe
              allowFullScreen
              allow="fullscreen; clipboard-read; clipboard-write"
              className="size-full border-0"
              key={url}
              referrerPolicy="no-referrer"
              sandbox="allow-scripts allow-forms allow-pointer-lock allow-popups"
              src={url}
              title={m.rooms_computer_view_title({ bot: bot.name })}
            />
          ) : (
            <div className="absolute inset-0 p-4">
              <RoomsComputerScreen
                isDimmed
                label={state === 'running' ? m.rooms_computer_connecting() : label}
                thumbnail={computer.thumbnail}
              />
            </div>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2 border-t border-border/50 px-4 py-3">
          {state === 'running' && url ? (
            <RoomsComputerViewControl
              isBusy={computer.isBusy}
              isControlling={isControlling}
              onDone={() => void finish()}
              onTakeOver={() => void takeOver()}
            />
          ) : null}
          <RoomsComputerActions
            isInView
            computer={computer}
            handle={bot.handle}
          />
          <FormErrors className="ml-auto" error={error} />
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface RoomsComputerViewControlProps {
  isBusy: boolean
  isControlling: boolean
  onDone: () => void
  onTakeOver: () => void
}

function RoomsComputerViewControl({ isBusy, isControlling, onDone, onTakeOver }: RoomsComputerViewControlProps) {
  return isControlling ? (
    <ButtonLoading
      loading={isBusy}
      size="sm"
      onClick={onDone}
    >
      <IconHand className="size-3.5" />
      {m.rooms_computer_done()}
    </ButtonLoading>
  ) : (
    <ButtonLoading
      loading={isBusy}
      size="sm"
      variant="outline"
      onClick={onTakeOver}
    >
      <IconMousePointerClick className="size-3.5" />
      {m.rooms_computer_take_over()}
    </ButtonLoading>
  );
}
