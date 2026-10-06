import { m } from '@orbs/i18n/client';
import { useSuspenseQuery } from '@tanstack/react-query';
import { useCanGoBack, useNavigate, useRouter, useSearch } from '@tanstack/react-router';
import { useEffect, useId, useRef, useState } from 'react';
import { BotAvatar } from '@/components/bots/bot-avatar';
import { Button } from '@/components/ui/button';
import { Command, CommandGroup, CommandItem, CommandList } from '@/components/ui/command';
import { useIsMobile } from '@/hooks/use-is-mobile';
import { rpc } from '@/services/rpc/rpc.client';
import IconPlus from '~icons/lucide/plus';
import IconUsers from '~icons/lucide/users';
import IconX from '~icons/lucide/x';
import type { FocusEvent, KeyboardEvent, ReactNode } from 'react';

function RoomsStartIcon({ children }: { children: ReactNode }) {
  return <span className="flex size-7 items-center justify-center rounded-full bg-muted text-muted-foreground">{children}</span>;
}

export function RoomsStart() {
  const { data: bots } = useSuspenseQuery(rpc.bots.list.queryOptions());
  const { start } = useSearch({ strict: false });
  const navigate = useNavigate();
  const router = useRouter();
  const canGoBack = useCanGoBack();
  const isMobile = useIsMobile();
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState('');
  const open = start === true;
  const botsMatching = (text: string) => bots.filter((bot) => bot.name.toLowerCase().includes(text.trim().toLowerCase()));
  const matches = botsMatching(query);

  const setOpen = (next: boolean) => navigate({
    to: '/rooms',
    search: next ? { start: true } : {},
    replace: true,
  });

  const search = (next: string) => {
    const firstMatch = botsMatching(next).at(0);

    setQuery(next);
    setSelected(next.trim() && firstMatch ? firstMatch.id : '');
  };

  const openList = () => {
    if (!open) {
      void setOpen(true);
    }
  };

  const closeOnEscape = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      void setOpen(false);
    }
  };

  const closeOnBlurOutside = (event: FocusEvent<HTMLDivElement>) => {
    if (open && !event.currentTarget.contains(event.relatedTarget)) {
      void setOpen(false);
    }
  };

  useEffect(() => {
    if (open && !isMobile) {
      inputRef.current?.focus();
    }
  }, [open, isMobile]);

  return (
    <Command
      loop
      shouldFilter={false}
      value={selected}
      onBlur={closeOnBlurOutside}
      onKeyDown={closeOnEscape}
      onValueChange={setSelected}
    >
      <div className="flex h-12 shrink-0 items-center gap-2 border-b pr-2 pl-12 md:pl-4">
        <label className="text-sm text-muted-foreground" htmlFor={inputId}>{m.rooms_start_to()}</label>
        <input
          autoComplete="off"
          className="h-full min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground md:text-sm"
          id={inputId}
          placeholder={m.rooms_start_placeholder()}
          ref={inputRef}
          value={query}
          onChange={(event) => search(event.target.value)}
          onClick={openList}
          onFocus={openList}
        />
        {canGoBack ? (
          <Button
            aria-label={m.rooms_start_close()}
            size="icon-sm"
            title={m.rooms_start_close()}
            variant="ghost"
            onClick={() => router.history.back()}
          >
            <IconX className="size-4" />
          </Button>
        ) : null}
      </div>
      {open ? (
        <div className="relative">
          <div className="absolute inset-x-2 top-2 z-10 rounded-xl border bg-popover p-1 shadow-sm md:right-auto md:left-4 md:w-full md:max-w-xl">
            <CommandList onMouseDown={(event) => event.preventDefault()}>
              <CommandGroup>
                <CommandItem value="create-group" onSelect={() => void navigate({ to: '/rooms/create' })}>
                  <RoomsStartIcon><IconUsers /></RoomsStartIcon>
                  {m.rooms_create_title()}
                </CommandItem>
                <CommandItem value="create-bot" onSelect={() => void navigate({ to: '/bots/create' })}>
                  <RoomsStartIcon><IconPlus /></RoomsStartIcon>
                  {m.rooms_bot_title()}
                </CommandItem>
                {matches.map((bot) => (
                  <CommandItem
                    key={bot.id}
                    value={bot.id}
                    onSelect={() => void navigate({ to: '/rooms/direct/$handle', params: { handle: bot.handle } })}
                  >
                    <BotAvatar
                      animate={false}
                      bot={bot}
                      size={28}
                    />
                    <span className="min-w-0 flex-1 truncate">{bot.name}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </div>
        </div>
      ) : null}
    </Command>
  );
}
