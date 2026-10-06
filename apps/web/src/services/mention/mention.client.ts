import { visit } from 'unist-util-visit';
import { ROOM, roomMentionHandle, roomMentionHref, roomMentionTarget } from '@orbs/server/client';
import type { MentionRemarkParams } from '@/types/mention.types';
import type { Html, Root, Text } from 'mdast';

export function mentionRemark({ bots }: MentionRemarkParams) {
  function mentionElement(href: string, label: string): Html {
    const safe = label.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');

    return { type: 'html', value: `<mention data-href="${href}" data-label="${safe}"></mention>` };
  }

  const hrefs = new Map<string, string>([
    ...bots.map((bot): [string, string] => [bot.handle, roomMentionHref({ kind: 'bot', id: bot.id })]),
    ...[...ROOM.everyoneHandles].map((handle): [string, string] => [handle, roomMentionHref({ kind: 'everyone', id: handle })]),
  ]);

  const handles = new RegExp(roomMentionHandle(`(?:${[...hrefs.keys()].join('|')})`).source, 'giu');

  return () => (tree: Root) => {
    visit(tree, 'link', (node, index, parent) => {
      if (index === undefined || !parent || !roomMentionTarget(node.url)) {
        return;
      }

      parent.children.splice(index, 1, mentionElement(node.url, node.children.map((child) => (child.type === 'text' ? child.value : '')).join('')));
    });

    visit(tree, 'text', (node: Text, index, parent) => {
      if (index === undefined || !parent) {
        return;
      }

      const nodes: (Text | Html)[] = [];
      let last = 0;

      for (const match of node.value.matchAll(handles)) {
        const href = hrefs.get(match[0].slice(1).toLowerCase());

        if (href) {
          nodes.push({ type: 'text', value: node.value.slice(last, match.index) }, mentionElement(href, match[0]));
          last = match.index + match[0].length;
        }
      }

      if (last === 0) {
        return;
      }

      nodes.push({ type: 'text', value: node.value.slice(last) });
      parent.children.splice(index, 1, ...nodes);

      return index + nodes.length;
    });
  };
}
