import { m } from '@orbs/i18n/client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { MemoryForm } from '@/components/memory/memory-form';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { FormErrors } from '@/components/ui/forms/form';
import { rpc } from '@/services/rpc/rpc.client';
import IconBot from '~icons/lucide/bot';
import IconChevronDown from '~icons/lucide/chevron-down';
import IconEllipsis from '~icons/lucide/ellipsis';
import IconFileText from '~icons/lucide/file-text';
import IconPencil from '~icons/lucide/pencil';
import IconShare from '~icons/lucide/share-2';
import IconTrash from '~icons/lucide/trash-2';
import type { MemoryFact } from '@/types/memory.types';
import type { MemoryScope } from '@orbs/server/client';

export function MemoryItem({
  fact,
  scope,
}: {
  fact: MemoryFact;
  scope: MemoryScope;
}) {
  const [editing, setEditing] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const queryClient = useQueryClient();

  const bots = useQuery({
    ...rpc.bots.list.queryOptions(),
    enabled: menuOpen && scope.scope === 'room',
  });

  const mutate = useMutation(
    rpc.memory.mutate.mutationOptions({
      onSettled: () =>
        queryClient.invalidateQueries({ queryKey: rpc.memory.key() }),
    }),
  );

  const input = {
    id: fact.id,
    scope,
    expectedRevision: fact.revision,
    operationId: crypto.randomUUID(),
  };

  return (
    <li className="flex min-w-0 flex-col gap-2">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm wrap-anywhere whitespace-pre-wrap">
            {fact.text}
          </p>
          <p className="text-xs text-muted-foreground">
            {fact.subjectName ?? m.memory_subject_unknown()} ·{' '}
            {fact.origin === 'manual'
              ? m.memory_manual()
              : m.memory_automatic()}
          </p>
        </div>
        <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
          <DropdownMenuTrigger asChild>
            <Button
              aria-label={m.memory_actions()}
              disabled={mutate.isPending}
              size="icon-xs"
              title={m.memory_actions()}
              type="button"
              variant="ghost"
            >
              <IconEllipsis />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => setEditing(!editing)}>
              <IconPencil />
              {m.memory_edit()}
            </DropdownMenuItem>
            {scope.scope !== 'global' ? (
              <DropdownMenuItem
                onSelect={() =>
                  mutate.mutate({
                    action: 'share',
                    input: {
                      ...input,
                      destination: { scope: 'global', ownerId: '' },
                    },
                  })}
              >
                <IconShare />
                {m.memory_share()}
              </DropdownMenuItem>
            ) : null}
            {scope.scope === 'room' ? (
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <IconBot />
                  {m.memory_share_bot()}
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  {bots.data?.map((bot) => (
                    <DropdownMenuItem
                      key={bot.id}
                      onSelect={() =>
                        mutate.mutate({
                          action: 'share',
                          input: {
                            ...input,
                            destination: { scope: 'bot', ownerId: bot.id },
                          },
                        })}
                    >
                      <IconBot />
                      {bot.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            ) : null}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onSelect={() => mutate.mutate({ action: 'forget', input })}
            >
              <IconTrash />
              {m.memory_forget()}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {editing ? (
        <>
          <MemoryForm
            fact={fact}
            scope={scope}
            onSaved={() => setEditing(false)}
          />
          <Button
            className="self-start"
            size="xs"
            type="button"
            variant="link-muted"
            onClick={() => setEditing(false)}
          >
            {m.memory_cancel()}
          </Button>
        </>
      ) : null}
      {fact.sources.length ? (
        <Collapsible>
          <CollapsibleTrigger asChild>
            <Button
              className="group self-start"
              size="xs"
              type="button"
              variant="link-muted"
            >
              <IconFileText />
              {m.memory_sources()}
              <IconChevronDown className="group-data-[state=open]:rotate-180" />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="flex flex-col gap-2">
              {fact.sources.map((source) => (
                <div key={source.messageId}>
                  <p className="text-xs text-muted-foreground">
                    {source.text === null
                      ? m.memory_source_unavailable()
                      : m.memory_source_author({
                        name: source.authorName ?? m.memory_subject_unknown(),
                      })}
                  </p>
                  {source.text === null ? null : (
                    <p className="text-sm wrap-anywhere whitespace-pre-wrap">
                      {source.text}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      ) : null}
      <FormErrors error={mutate.isError ? m.memory_error() : null} />
    </li>
  );
}
