import { standardSchemaResolver } from '@hookform/resolvers/standard-schema';
import { m } from '@orbs/i18n/client';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { RoomsBotPicker } from '@/components/rooms/rooms-bot-picker';
import { RoomsSendModeSelect } from '@/components/rooms/rooms-send-mode-select';
import { RoutingDriverSelect } from '@/components/routing/routing-driver-select';
import { ButtonLoading } from '@/components/ui/button-loading';
import { Form, FormControl, FormErrors, FormErrorsAndHint, FormField, FormItem, FormLabel } from '@/components/ui/forms/form';
import { FormInput } from '@/components/ui/forms/form-input';
import { Textarea } from '@/components/ui/textarea';
import { useRoomUpdateMutation } from '@/hooks/use-room-update';
import { useRoomsRefresh } from '@/hooks/use-rooms-refresh';
import { roomsLeaderFirst } from '@/services/rooms/rooms.client';
import { rpc } from '@/services/rpc/rpc.client';
import { roomInputCreate } from '@orbs/server/client';
import type { Bot, TenantRoomSummary } from '@orbs/server/client';

export function RoomsForm({ bots, room, onSaved }: { bots: Bot[]; room?: TenantRoomSummary; onSaved?: (room: TenantRoomSummary) => void }) {
  const { data: settings } = useQuery(rpc.organization.settings.queryOptions());
  const refresh = useRoomsRefresh();
  const update = useRoomUpdateMutation();
  const group = room?.kind !== 'direct';
  const judge = settings?.routing.judge;
  const judgeHint = judge ? m.routing_judge_uses({ model: `${judge.modelProvider}/${judge.modelId}` }) : m.routing_judge_missing();

  const create = useMutation(rpc.rooms.create.mutationOptions({
    onSuccess: async (created) => {
      await refresh();
      onSaved?.(created);
    },
  }));

  const pending = create.isPending || update.isPending;
  const failed = create.isError || update.isError;
  const failure = room ? m.rooms_update_failed() : m.rooms_create_error();

  const form = useForm({
    resolver: standardSchemaResolver(roomInputCreate),
    defaultValues: {
      name: room?.name ?? '',
      botIds: room ? roomsLeaderFirst(room) : [],
      description: room?.description ?? '',
      driver: room?.driver ?? null,
      sendMode: room?.sendMode ?? 'queue',
    },
  });

  return (
    <Form {...form}>
      <form
        className="flex flex-col gap-3"
        onSubmit={form.handleSubmit((values) => {
          if (!room) {
            create.mutate(values);

            return;
          }

          update.mutate(
            group ? { roomId: room.id, ...values } : { roomId: room.id, description: values.description, sendMode: values.sendMode },
            { onSuccess: onSaved },
          );
        })}
      >
        <fieldset className="contents" disabled={pending}>
          {group ? (
            <FormInput
              required
              label={m.rooms_create_name()}
              maxLength={80}
              name="name"
            />
          ) : null}
          {group ? (
            <FormField
              control={form.control}
              name="botIds"
              render={({ field }) => (
                <FormItem>
                  <RoomsBotPicker
                    withLeader
                    bots={bots}
                    value={field.value}
                    onChange={field.onChange}
                  />
                  <FormErrorsAndHint />
                </FormItem>
              )}
            />
          ) : null}
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{m.rooms_description_label()}</FormLabel>
                <FormControl><Textarea
                  className="min-h-20"
                  maxLength={2000}
                  placeholder={m.rooms_description_placeholder()}
                  {...field}
                /></FormControl>
                <FormErrorsAndHint />
              </FormItem>
            )}
          />
          {group ? (
            <FormField
              control={form.control}
              name="driver"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{m.routing_driver()}</FormLabel>
                  <RoutingDriverSelect
                    disabled={pending}
                    inherited={settings?.routing.driver}
                    value={field.value}
                    onChange={field.onChange}
                  />
                  <FormErrorsAndHint hint={(field.value ?? settings?.routing.driver) === 'judge' ? judgeHint : undefined} />
                </FormItem>
              )}
            />
          ) : null}
          <FormField
            control={form.control}
            name="sendMode"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{m.rooms_send_mode()}</FormLabel>
                <RoomsSendModeSelect
                  disabled={pending}
                  value={field.value}
                  onChange={field.onChange}
                />
              </FormItem>
            )}
          />
          <FormErrors error={failed ? failure : null} />
          <ButtonLoading
            disabled={pending}
            loading={pending}
            type="submit"
          >{room ? m.rooms_settings_save() : m.rooms_create_submit()}</ButtonLoading>
        </fieldset>
      </form>
    </Form>
  );
}
