import { m } from '@orbs/i18n/client';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { MemoryCapture } from '@/components/memory/memory-capture';
import { MemoryForm } from '@/components/memory/memory-form';
import { MemoryItem } from '@/components/memory/memory-item';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Empty, EmptyDescription, EmptyHeader } from '@/components/ui/empty';
import { FormErrors } from '@/components/ui/forms/form';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { memoryExport } from '@/services/memory/memory.client';
import { MEMORY_SCOPE_LABELS } from '@/services/memory/memory.constants';
import { rpc } from '@/services/rpc/rpc.client';
import IconBrain from '~icons/lucide/brain';
import IconChevronDown from '~icons/lucide/chevron-down';
import IconDownload from '~icons/lucide/download';
import IconPlus from '~icons/lucide/plus';
import type { MemoryScope } from '@orbs/server/client';

export function MemoryPanel({ scope }: { scope: MemoryScope }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [cursors, setCursors] = useState<string[]>([]);
  const [adding, setAdding] = useState(false);
  const exportMemories = useMutation({ mutationFn: memoryExport });
  const viewport = useRef<HTMLElement>(null);
  const session = useQuery(rpc.auth.session.queryOptions());

  const list = useQuery(
    rpc.memory.list.queryOptions({
      input: { scope, query, before: cursors.at(-1), limit: 30 },
      enabled: open,
    }),
  );

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="flex justify-center">
        <CollapsibleTrigger asChild>
          <Button
            className="group"
            size="xs"
            type="button"
            variant="link-muted"
          >
            <IconBrain />
            {m.memory_title()}
            <IconChevronDown className="group-data-[state=open]:rotate-180" />
          </Button>
        </CollapsibleTrigger>
      </div>
      <div className="-mx-1">
        <CollapsibleContent>
          <div className="flex min-w-0 flex-col gap-4 px-1 py-4">
            <p className="text-sm text-muted-foreground">
              {MEMORY_SCOPE_LABELS[scope.scope]()}
            </p>
            <div className="flex items-center gap-2">
              <Input
                aria-label={m.memory_search()}
                placeholder={m.memory_search()}
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setCursors([]);
                  viewport.current?.scrollTo({ top: 0 });
                }}
              />
              <Button
                aria-label={adding ? m.memory_cancel() : m.memory_add()}
                size="icon-sm"
                title={m.memory_add()}
                type="button"
                variant="ghost"
                onClick={() => setAdding(!adding)}
              >
                <IconPlus />
              </Button>
            </div>
            {adding && session.data ? (
              <MemoryForm
                scope={scope}
                onSaved={() => {
                  setAdding(false);
                  setCursors([]);
                }}
              />
            ) : null}
            {list.data?.pending ? (
              <p className="text-sm text-muted-foreground">
                {m.memory_refresh_pending()}
              </p>
            ) : null}
            <FormErrors error={list.isError ? m.memory_error() : null} />
            <section
              aria-label={m.memory_title()}
              className="-mx-1 max-h-80 overflow-y-auto p-1"
              ref={viewport}
            >
              {list.isPending ? (
                <div className="flex flex-col gap-4">
                  {[0, 1, 2].map((key) => (
                    <div className="flex flex-col gap-2" key={key}>
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  ))}
                </div>
              ) : null}
              {list.data?.items.length === 0 ? (
                <Empty size="sm">
                  <EmptyHeader>
                    <EmptyDescription>
                      {query ? m.memory_no_matches() : m.memory_empty()}
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              ) : null}
              <ul className="flex flex-col gap-5">
                {list.data?.items.map((fact) => (
                  <MemoryItem
                    fact={fact}
                    key={`${fact.id}:${fact.revision}`}
                    scope={scope}
                  />
                ))}
              </ul>
            </section>
            {cursors.length || list.data?.next ? (
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Button
                  disabled={!cursors.length || list.isFetching}
                  size="xs"
                  type="button"
                  variant="quiet"
                  onClick={() => {
                    setCursors(cursors.slice(0, -1));
                    viewport.current?.scrollTo({ top: 0 });
                  }}
                >
                  {m.memory_previous()}
                </Button>
                <span className="text-xs text-muted-foreground">
                  {m.memory_page({ page: cursors.length + 1 })}
                </span>
                <Button
                  disabled={!list.data?.next || list.isFetching}
                  size="xs"
                  type="button"
                  variant="quiet"
                  onClick={() => {
                    if (list.data?.next) {
                      setCursors([...cursors, list.data.next]);
                    }
                    viewport.current?.scrollTo({ top: 0 });
                  }}
                >
                  {m.memory_more()}
                </Button>
              </div>
            ) : null}
            {scope.scope === 'room' ? (
              <MemoryCapture roomId={scope.ownerId} />
            ) : null}
            <p className="text-xs text-muted-foreground">{m.memory_hint()}</p>
            {scope.scope === 'global' ? (
              <>
                <Button
                  className="self-start"
                  disabled={exportMemories.isPending}
                  size="xs"
                  type="button"
                  variant="link-muted"
                  onClick={() => exportMemories.mutate()}
                >
                  <IconDownload />
                  {m.memory_export()}
                </Button>
                <FormErrors
                  error={exportMemories.isError ? m.memory_export_error() : null}
                />
              </>
            ) : null}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
