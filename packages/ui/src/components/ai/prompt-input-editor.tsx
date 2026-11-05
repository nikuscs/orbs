import { Extension } from '@tiptap/core';
import { Document } from '@tiptap/extension-document';
import { Mention } from '@tiptap/extension-mention';
import { Paragraph } from '@tiptap/extension-paragraph';
import { Text } from '@tiptap/extension-text';
import { Placeholder } from '@tiptap/extensions';
import { PluginKey } from '@tiptap/pm/state';
import { EditorContent, NodeViewWrapper, ReactNodeViewRenderer, useEditor } from '@tiptap/react';
import { exitSuggestion } from '@tiptap/suggestion';
import { createContext, use, useEffect, useImperativeHandle, useLayoutEffect, useRef, useState } from 'react';
import { cn } from '../../lib/cn';
import { PromptInputDrawer } from './prompt-input';
import type { Editor } from '@tiptap/core';
import type { MentionNodeAttrs } from '@tiptap/extension-mention';
import type { NodeViewProps } from '@tiptap/react';
import type { SuggestionProps } from '@tiptap/suggestion';
import type { ReactNode, Ref } from 'react';

export interface PromptInputEditorItem {
  href: string
  label: string
}

export type PromptInputEditorSegment = { kind: 'text', text: string } | { kind: 'pill', item: PromptInputEditorItem };

export interface PromptInputEditorHandle {
  insert: (items: PromptInputEditorItem[]) => void
  restore: (segments: PromptInputEditorSegment[]) => void
  focus: () => void
}

export interface PromptInputEditorTrigger {
  char: string
  items: (query: string) => PromptInputEditorItem[] | Promise<PromptInputEditorItem[]>
  empty: ReactNode
}

interface PromptInputEditorRender {
  renderMention: (item: PromptInputEditorItem) => ReactNode
  renderItem: (item: PromptInputEditorItem) => ReactNode
}

interface PromptInputEditorListHandle {
  onKeyDown: (event: KeyboardEvent) => boolean
}

interface PromptInputEditorListProps {
  items: PromptInputEditorItem[]
  empty: ReactNode
  onSelect: (item: PromptInputEditorItem) => void
}

interface PromptInputEditorState {
  triggers: PromptInputEditorTrigger[]
  placeholder: string
  recall?: () => PromptInputEditorSegment[] | null
  enterSends: boolean
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    promptInputEditor: {
      setPromptInputEditorState: (state: PromptInputEditorState) => ReturnType
    }
  }

  interface Storage {
    promptInputEditor: PromptInputEditorState
  }
}

const PromptInputEditorContext = createContext<PromptInputEditorRender>({
  renderMention: (item) => item.label,
  renderItem: (item) => item.label,
});

function PromptInputEditorPill({ node }: NodeViewProps) {
  const { renderMention } = use(PromptInputEditorContext);
  return (
    <NodeViewWrapper as="span">
      {renderMention({ href: String(node.attrs.id), label: String(node.attrs.label) })}
    </NodeViewWrapper>
  );
}

function PromptInputEditorList({ items, empty, onSelect, ref }: PromptInputEditorListProps & { ref?: Ref<PromptInputEditorListHandle> }) {
  const { renderItem } = use(PromptInputEditorContext);
  const [active, setActive] = useState(0);
  const [shown, setShown] = useState(items);
  const list = useRef<HTMLDivElement>(null);

  if (shown !== items) {
    setShown(items);
    setActive(0);
  }

  useEffect(() => {
    list.current?.querySelector('[data-active=true]')?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  useImperativeHandle(ref, () => ({
    onKeyDown: (event) => {
      if (items.length === 0) {
        return false;
      }

      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        setActive((index) => (index + (event.key === 'ArrowDown' ? 1 : items.length - 1)) % items.length);

        return true;
      }

      const item = items.at(active);

      if ((event.key === 'Enter' || event.key === 'Tab') && item) {
        onSelect(item);

        return true;
      }

      return false;
    },
  }));

  return (
    <div className="flex flex-col" data-slot="prompt-input-editor-list" ref={list}>
      {items.length === 0 ? <div className="px-2 py-1.5 text-sm text-muted-foreground">{empty}</div> : items.map((item, index) => (
        <button
          className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm outline-none data-[active=true]:bg-accent data-[active=true]:text-accent-foreground"
          data-active={index === active}
          key={item.href}
          tabIndex={-1}
          type="button"
          onClick={() => onSelect(item)}
          onMouseDown={(event) => event.preventDefault()}
          onMouseEnter={() => setActive(index)}
        >
          {renderItem(item)}
        </button>
      ))}
    </div>
  );
}

const PromptInputEditorPillNode = Mention.extend({
  addNodeView() {
    return ReactNodeViewRenderer(PromptInputEditorPill, { as: 'span' });
  },
});

function promptInputEditorDocument(segments: PromptInputEditorSegment[]) {
  const lines: object[][] = [[]];

  for (const segment of segments) {
    if (segment.kind === 'pill') {
      lines.at(-1)?.push({ type: PromptInputEditorPillNode.name, attrs: { id: segment.item.href, label: segment.item.label } });
      continue;
    }

    for (const [index, line] of segment.text.split('\n').entries()) {
      if (index > 0) {
        lines.push([]);
      }

      if (line) {
        lines.at(-1)?.push({ type: 'text', text: line });
      }
    }
  }

  return { type: 'doc', content: lines.map((content) => ({ type: 'paragraph', content })) };
}

const PromptInputEditorKit = Extension.create<object, PromptInputEditorState>({
  name: 'promptInputEditor',
  addStorage() {
    return { triggers: [], placeholder: '', recall: undefined, enterSends: true };
  },
  addCommands() {
    return {
      setPromptInputEditorState: (state) => () => {
        this.storage.triggers = state.triggers;
        this.storage.placeholder = state.placeholder;
        this.storage.recall = state.recall;
        this.storage.enterSends = state.enterSends;

        return true;
      },
    };
  },
  addKeyboardShortcuts() {
    const send = ({ editor }: { editor: Editor }) => {
      const form = editor.view.dom.closest('form');
      const submit = form?.querySelector('button[type=submit]');

      if (!(submit instanceof HTMLButtonElement && submit.disabled)) {
        form?.requestSubmit();
      }

      return true;
    };

    return {
      Enter: ({ editor }) => (this.storage.enterSends ? send({ editor }) : editor.commands.splitBlock()),
      'Mod-Enter': send,
      'Shift-Enter': ({ editor }) => editor.commands.splitBlock(),
      ArrowUp: ({ editor }) => {
        const segments = editor.isEmpty ? this.storage.recall?.() : null;

        return segments ? editor.chain().setContent(promptInputEditorDocument(segments)).focus('end').run() : false;
      },
    };
  },
});

export function PromptInputEditor({
  triggers,
  renderMention,
  renderItem,
  placeholder,
  disabled = false,
  focusOnMount = false,
  recall,
  enterSends = true,
  initialContent,
  onTextChange,
  className,
  ref,
  ...props
}: PromptInputEditorRender & {
  triggers: PromptInputEditorTrigger[]
  placeholder: string
  disabled?: boolean
  focusOnMount?: boolean
  recall?: () => PromptInputEditorSegment[] | null
  enterSends?: boolean
  initialContent?: PromptInputEditorSegment[]
  onTextChange?: (text: string) => void
  ref?: Ref<PromptInputEditorHandle>
  'aria-label': string
  className?: string
}) {
  const [text, setText] = useState('');
  const [open, setOpen] = useState<PromptInputEditorListProps | null>(null);
  const [multiline, setMultiline] = useState(false);
  const list = useRef<PromptInputEditorListHandle>(null);
  const expanded = useRef(false);
  const inlineWidth = useRef(0);
  const groupHeight = useRef<number | null>(null);

  const emit = ({ editor: current }: { editor: Editor }) => {
    const next = current.getText({ blockSeparator: '\n' });
    setText(next);
    onTextChange?.(next);
  };

  const [options] = useState(() => ({
    content: initialContent ? promptInputEditorDocument(initialContent) : undefined,
    extensions: [
      Document,
      Paragraph,
      Text,
      Placeholder.configure({ showOnlyWhenEditable: false, placeholder: ({ editor: current }) => current.storage.promptInputEditor.placeholder }),
      PromptInputEditorKit,
      PromptInputEditorPillNode.configure({
        deleteTriggerWithBackspace: true,
        renderText: ({ node }) => `[${String(node.attrs.label).replaceAll(/[[\]]/g, '')}](${String(node.attrs.id)})`,
        suggestions: triggers.map(({ char }, index) => {
          const pluginKey = new PluginKey(`promptInputEditor${index}`);
          const current = (instance: Editor) => instance.storage.promptInputEditor.triggers.find((trigger) => trigger.char === char);

          return {
            char,
            pluginKey,
            items: async ({ query, editor: instance }) => current(instance)?.items(query) ?? [],
            render: () => {
              const show = (suggestion: SuggestionProps<PromptInputEditorItem, MentionNodeAttrs>) => setOpen({
                items: suggestion.items,
                empty: current(suggestion.editor)?.empty,
                onSelect: (item) => suggestion.command({ id: item.href, label: item.label }),
              });

              return {
                onStart: show,
                onUpdate: show,
                onKeyDown: ({ view, event }) => {
                  if (event.key === 'Escape') {
                    event.stopPropagation();
                    exitSuggestion(view, pluginKey);

                    return true;
                  }

                  return list.current?.onKeyDown(event) ?? false;
                },
                onExit: () => setOpen(null),
              };
            },
          };
        }),
      }),
    ],
    editorProps: {
      attributes: {
        'aria-label': props['aria-label'],
        'aria-multiline': 'true',
        'data-slot': 'input-group-control',
        class: 'scrollbar scrollbar-w-1 scrollbar-h-1 scrollbar-thumb-rounded-full [--scrollbar-thumb:color-mix(in_oklab,var(--muted-foreground)_20%,transparent)] [--scrollbar-track:transparent] max-h-48 overflow-y-auto px-2 py-2.5 text-base outline-none md:py-3 md:text-sm',
        role: 'textbox',
      },
    },
  }));

  const editor = useEditor({
    ...options,
    immediatelyRender: false,
    autofocus: focusOnMount ? 'end' : false,
    onCreate: emit,
    onUpdate: emit,
  });

  useImperativeHandle(ref, () => ({
    insert: (items) => {
      editor?.chain().focus().insertContent(items.flatMap((item) => [{ type: PromptInputEditorPillNode.name, attrs: { id: item.href, label: item.label } }, { type: 'text', text: ' ' }])).run();
    },
    restore: (segments) => {
      if (editor?.isEmpty) {
        editor.chain().setContent(promptInputEditorDocument(segments)).focus('end').run();
      }
    },
    focus: () => {
      editor?.commands.focus('end');
    },
  }), [editor]);

  useEffect(() => {
    editor?.setEditable(!disabled);
  }, [editor, disabled]);

  useEffect(() => {
    editor?.commands.setPromptInputEditorState({
      triggers,
      placeholder,
      recall,
      enterSends,
    });
  }, [editor, triggers, placeholder, recall, enterSends]);

  useEffect(() => {
    const dom = editor?.view.dom;

    if (!editor || !dom) {
      return;
    }

    const measure = () => {
      const style = getComputedStyle(dom);
      const width = dom.clientWidth - Number.parseFloat(style.paddingLeft) - Number.parseFloat(style.paddingRight);
      const paragraph = dom.children.length === 1 ? dom.children.item(0) : null;
      const range = document.createRange();

      if (paragraph) {
        range.selectNodeContents(paragraph);
      }

      const bounds = range.getBoundingClientRect();

      if (!expanded.current) {
        inlineWidth.current = width;
      }

      const next = !paragraph || bounds.height > Number.parseFloat(style.lineHeight) * 1.5 || (expanded.current && bounds.width > inlineWidth.current);

      if (next !== expanded.current) {
        expanded.current = next;
        groupHeight.current = dom.closest<HTMLElement>('[data-slot="input-group"]')?.offsetHeight ?? null;
        setMultiline(next);
      }
    };

    const observer = new ResizeObserver(measure);
    observer.observe(dom);
    editor.on('update', measure);
    measure();

    return () => {
      observer.disconnect();
      editor.off('update', measure);
    };
  }, [editor]);

  useLayoutEffect(() => {
    const group = editor?.view.dom.closest<HTMLElement>('[data-slot="input-group"]');
    const from = groupHeight.current;
    groupHeight.current = null;

    if (!group || from === null || matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    group.animate(
      [{ height: `${from}px` }, { height: `${group.offsetHeight}px` }],
      { duration: 240, easing: getComputedStyle(group).getPropertyValue('--ease-panel').trim() || 'ease-out' },
    );
  }, [editor, multiline]);

  useEffect(() => {
    const form = editor?.view.dom.closest('form');
    const clear = () => editor?.commands.clearContent(true);
    form?.addEventListener('reset', clear);

    return () => form?.removeEventListener('reset', clear);
  }, [editor]);

  return (
    <PromptInputEditorContext value={{ renderMention, renderItem }}>
      <EditorContent
        className={cn(
          'min-w-0 flex-1 data-[multiline=true]:basis-full data-[multiline=true]:px-2 data-[multiline=true]:pt-1 [&_p.is-editor-empty:first-child]:before:pointer-events-none [&_p.is-editor-empty:first-child]:before:float-left [&_p.is-editor-empty:first-child]:before:h-0 [&_p.is-editor-empty:first-child]:before:w-full [&_p.is-editor-empty:first-child]:before:overflow-x-clip [&_p.is-editor-empty:first-child]:before:text-ellipsis [&_p.is-editor-empty:first-child]:before:whitespace-nowrap',
          '[&_p.is-editor-empty:first-child]:before:text-muted-foreground/60 [&_p.is-editor-empty:first-child]:before:content-[attr(data-placeholder)]',
          className,
        )}
        data-multiline={multiline}
        editor={editor}
      />
      {open ? (
        <PromptInputDrawer>
          <PromptInputEditorList ref={list} {...open} />
        </PromptInputDrawer>
      ) : null}
      <input name="message" type="hidden" value={text} />
    </PromptInputEditorContext>
  );
}
