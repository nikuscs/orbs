import { useMutation, useQueryClient } from '@tanstack/react-query';
import { generateId } from 'ai';
import { RoomsChatMessage } from '@/components/rooms/rooms-chat-message';
import { RoomsChatReactions } from '@/components/rooms/rooms-chat-reactions';
import { rpc } from '@/services/rpc/rpc.client';
import type { RoomReactionGroup, RoomReactions } from '@orbs/server/client';
import type { ComponentProps } from 'react';

export function RoomsChatReply({ roomId, groups, ...props }: Omit<ComponentProps<typeof RoomsChatMessage>, 'reacting' | 'onReact'> & { roomId: string; groups: RoomReactionGroup[] }) {
  const queryClient = useQueryClient();
  const queryKey = rpc.rooms.reactions.key({ input: { roomId } });
  const messageId = props.message.id;

  const toggle = useMutation({
    mutationFn: ({ emoji, reactionId, add }: { emoji: string; reactionId: string; add: boolean }) => (add
      ? rpc.rooms.addReaction.call({
        roomId,
        messageId,
        reactionId,
        emoji,
      })
      : rpc.rooms.removeReaction.call({ roomId, reactionId })),
    onSuccess: (result) => queryClient.setQueriesData<RoomReactions>({ queryKey }, (current) => current && { ...current, [result.messageId]: result.groups }),
    onError: () => queryClient.invalidateQueries({ queryKey }),
  });

  const react = (emoji: string) => {
    const mine = groups.find((group) => group.emoji === emoji)?.mine;

    toggle.mutate({
      emoji,
      reactionId: mine ?? generateId(),
      add: !mine,
    });
  };

  return (
    <>
      <RoomsChatMessage
        {...props}
        reacting={toggle.isPending}
        onReact={react}
      />
      <RoomsChatReactions
        disabled={toggle.isPending}
        failed={toggle.isError}
        groups={groups}
        onToggle={react}
      />
    </>
  );
}
