import { standardSchemaResolver } from '@hookform/resolvers/standard-schema';
import { m } from '@orbs/i18n/client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { ButtonLoading } from '@/components/ui/button-loading';
import { Form, FormControl, FormErrors, FormField, FormItem, FormLabel } from '@/components/ui/forms/form';
import { Textarea } from '@/components/ui/textarea';
import { rpc } from '@/services/rpc/rpc.client';
import { memorySaveInput } from '@orbs/server/client';
import type { MemoryFact } from '@/types/memory.types';
import type { MemoryScope } from '@orbs/server/client';

export function MemoryForm({ scope, fact, onSaved }: { scope: MemoryScope; fact?: MemoryFact; onSaved: () => void }) {
  const queryClient = useQueryClient();
  const session = useQuery(rpc.auth.session.queryOptions());

  const form = useForm({
    resolver: standardSchemaResolver(memorySaveInput),
    defaultValues: {
      scope,
      operationId: crypto.randomUUID(),
      subject: fact ? { kind: fact.subjectKind, id: fact.subjectId } : { kind: 'user' as const, id: session.data?.user.id ?? '' },
      text: fact?.text ?? '',
      sourceMessageIds: [],
    },
  });

  const save = useMutation(
    rpc.memory.mutate.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({ queryKey: rpc.memory.key() });
        onSaved();
      },
    }),
  );

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit((input) =>
          save.mutate(
            fact
              ? { action: 'update', input: { ...input, id: fact.id, expectedRevision: fact.revision } }
              : { action: 'save', input: { ...input, subject: { kind: 'user', id: session.data?.user.id ?? '' } } },
          ),
        )}
      >
        <fieldset className="flex flex-col gap-2" disabled={save.isPending}>
          <FormField
            control={form.control}
            name="text"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{m.memory_text()}</FormLabel>
                <FormControl>
                  <Textarea {...field} maxLength={500} />
                </FormControl>
              </FormItem>
            )}
          />
          <FormErrors error={save.isError ? m.memory_error() : null} />
          <ButtonLoading
            disabled={!session.data?.user}
            loading={save.isPending}
            type="submit"
          >
            {m.memory_save()}
          </ButtonLoading>
        </fieldset>
      </form>
    </Form>
  );
}
