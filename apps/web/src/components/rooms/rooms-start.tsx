import { useIsMobile } from '@repo/client/web';
import { m } from '@repo/i18n/client';
import { PromptInput, PromptInputActionMenu, PromptInputActionMenuTrigger, PromptInputSubmit } from '@repo/ui/ai/prompt-input';
import { BotAvatar } from '@repo/ui/bots/bot-avatar';
import { Button } from '@repo/ui/button';
import { Command, CommandGroup, CommandItem, CommandList } from '@repo/ui/command';
import { InputGroupAddon } from '@repo/ui/input-group';
import { useSuspenseQuery } from '@tanstack/react-query';
import { useCanGoBack, useNavigate, useRouter, useSearch } from '@tanstack/react-router';
import { lazy, useEffect, useId, useRef, useState } from 'react';
import { rpc } from '@/services/rpc/rpc.client';
import IconFolderPlus from '~icons/lucide/folder-plus';
import IconPlus from '~icons/lucide/plus';
import IconX from '~icons/lucide/x';
import type { FocusEvent, KeyboardEvent, ReactNode } from 'react';

const PromptInputEditor = lazy(() => import('@repo/ui/ai/prompt-input-editor').then((module) => ({ default: module.PromptInputEditor })));

interface RoomsStartIconProps {
  children: ReactNode
}

function RoomsStartIcon({ children }: RoomsStartIconProps) {
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
      variant="ghost"
      onBlur={closeOnBlurOutside}
      onKeyDown={closeOnEscape}
      onValueChange={setSelected}
    >
      <div className="relative z-20 flex h-12 shrink-0 cursor-default items-center gap-2 border-b pr-2 pl-14 electrobun-webkit-app-region-drag md:pl-4">
        <label className="text-sm text-muted-foreground" htmlFor={inputId}>{m.rooms_start_to()}</label>
        <input
          autoComplete="off"
          className="h-full min-w-0 flex-1 bg-transparent text-base electrobun-webkit-app-region-no-drag outline-none placeholder:text-muted-foreground md:text-sm"
          id={inputId}
          placeholder={m.rooms_start_placeholder()}
          ref={inputRef}
          value={query}
          onChange={(event) => search(event.target.value)}
          onClick={openList}
          onFocus={openList}
        />
        {canGoBack ? (
          <span className="electrobun-webkit-app-region-no-drag">
            <Button
              aria-label={m.rooms_start_close()}
              size="icon-sm"
              title={m.rooms_start_close()}
              variant="ghost"
              onClick={() => router.history.back()}
            >
              <IconX className="size-4" />
            </Button>
          </span>
        ) : null}
      </div>
      {open ? (
        <div className="relative">
          <div className="absolute inset-x-2 top-2 z-10 rounded-xl border bg-popover p-1 shadow-sm md:right-auto md:left-4 md:w-full md:max-w-xl">
            <CommandList onMouseDown={(event) => event.preventDefault()}>
              <CommandGroup>
                <CommandItem value="create-bot" onSelect={() => void navigate({ to: '/bots/create' })}>
                  <RoomsStartIcon><IconPlus /></RoomsStartIcon>
                  {m.rooms_bot_title()}
                </CommandItem>
                <CommandItem value="create-section" onSelect={() => void navigate({ to: '/rooms', search: { section: 'create' } })}>
                  <RoomsStartIcon><IconFolderPlus /></RoomsStartIcon>
                  {m.rooms_section_new()}
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
      <div className="mx-auto mt-auto w-full max-w-3xl shrink-0 px-4 pb-4">
        <PromptInput onSubmit={() => false}>
          <InputGroupAddon align="inline-start">
            <PromptInputActionMenu>
              <PromptInputActionMenuTrigger
                disabled
                aria-label={m.rooms_chat_attach()}
                title={m.rooms_chat_attach()}
                variant="secondary"
              />
            </PromptInputActionMenu>
          </InputGroupAddon>
          <PromptInputEditor
            disabled
            aria-label={m.rooms_start_composer()}
            placeholder={m.rooms_start_composer()}
            renderItem={() => null}
            renderMention={() => null}
            triggers={[]}
          />
          <InputGroupAddon align="inline-end">
            <PromptInputSubmit
              disabled
              aria-label={m.rooms_chat_send()}
              title={m.rooms_chat_send()}
            />
          </InputGroupAddon>
        </PromptInput>
      </div>
    </Command>
  );
}
