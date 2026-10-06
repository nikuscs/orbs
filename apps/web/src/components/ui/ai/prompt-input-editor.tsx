import { Extension } from '@tiptap/core';
import { Document } from '@tiptap/extension-document';
import { Mention } from '@tiptap/extension-mention';
import { Paragraph } from '@tiptap/extension-paragraph';
import { Text } from '@tiptap/extension-text';
import { Placeholder } from '@tiptap/extensions';
import { PluginKey } from '@tiptap/pm/state';
import { EditorContent, NodeViewWrapper, ReactNodeViewRenderer, useEditor } from '@tiptap/react';
import { exitSuggestion } from '@tiptap/suggestion';
import { createContext, use, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { cn } from '@/lib/cn';
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

/** A character that opens a list of things to insert as pills; `items` may load them, `empty` shows when none match. */
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

// Pills render through portals inside `EditorContent` and the list through the drawer's, so both read the caller's renderers from here.
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

  // A new query brings new items; the highlight starts over at the first.
  if (shown !== items) {
    setShown(items);
    setActive(0);
  }

  // The drawer scrolls, so arrowing past its edge brings the highlight along.
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
    <div className="flex flex-col" ref={list}>
      {items.length === 0 ? <div className="px-2 py-1.5 text-sm text-muted-foreground">{empty}</div> : items.map((item, index) => (
        // The caret stays in the field: the keys above move the highlight, and a click must not take focus.
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

// The editor is built once; triggers and placeholder change with the caller, so they live in this storage.
// Mention runs first (priority 101), so Enter picks from an open list; otherwise it sends like the submit button would.
const PromptInputEditorKit = Extension.create<object, PromptInputEditorState>({
  name: 'promptInputEditor',
  addStorage() {
    return { triggers: [], placeholder: '' };
  },
  addCommands() {
    return {
      setPromptInputEditorState: (state) => () => {
        this.storage.triggers = state.triggers;
        this.storage.placeholder = state.placeholder;

        return true;
      },
    };
  },
  addKeyboardShortcuts() {
    return {
      Enter: ({ editor }) => {
        const form = editor.view.dom.closest('form');
        const submit = form?.querySelector('button[type=submit]');

        if (!(submit instanceof HTMLButtonElement && submit.disabled)) {
          form?.requestSubmit();
        }

        return true;
      },
      'Shift-Enter': ({ editor }) => editor.commands.splitBlock(),
    };
  },
});

/**
 * The composer's field: plain text plus pills. Each trigger character opens a list; a picked item becomes a pill that
 * deletes as one unit and is written into the text as the markdown link `[label](href)`. The text sits in a hidden
 * `message` input for `PromptInput`, and the field empties when the form resets after a send.
 */
export function PromptInputEditor({
  triggers,
  renderMention,
  renderItem,
  placeholder,
  disabled = false,
  focusOnMount = false,
  onTextChange,
  className,
  ...props
}: PromptInputEditorRender & {
  triggers: PromptInputEditorTrigger[]
  placeholder: string
  disabled?: boolean
  focusOnMount?: boolean
  onTextChange?: (text: string) => void
  'aria-label': string
  className?: string
}) {
  const [text, setText] = useState('');
  const [open, setOpen] = useState<PromptInputEditorListProps | null>(null);
  const list = useRef<PromptInputEditorListHandle>(null);

  const editor = useEditor({
    immediatelyRender: false,
    autofocus: focusOnMount ? 'end' : false,
    extensions: [
      Document,
      Paragraph,
      Text,
      Placeholder.configure({ placeholder: ({ editor: current }) => current.storage.promptInputEditor.placeholder }),
      PromptInputEditorKit,
      PromptInputEditorPillNode.configure({
        deleteTriggerWithBackspace: true,
        renderText: ({ node }) => `[${String(node.attrs.label).replaceAll(/[[\]]/g, '')}](${String(node.attrs.id)})`,
        suggestions: triggers.map(({ char }, index) => {
          const pluginKey = new PluginKey(`promptInputEditor${index}`);
          // The editor is built once, so each lookup reads the caller's current triggers from storage.
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
        class: 'max-h-48 overflow-y-auto px-2 py-2.5 text-base outline-none md:py-3 md:text-sm',
        role: 'textbox',
      },
    },
    onUpdate: ({ editor: current }) => {
      const next = current.getText({ blockSeparator: '\n' });
      setText(next);
      onTextChange?.(next);
    },
  });

  useEffect(() => {
    editor?.setEditable(!disabled);
  }, [editor, disabled]);

  // A command dispatches a transaction, which also redraws the placeholder decoration.
  useEffect(() => {
    editor?.commands.setPromptInputEditorState({ triggers, placeholder });
  }, [editor, triggers, placeholder]);

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
          'min-w-0 flex-1 [&_p.is-editor-empty:first-child]:before:pointer-events-none [&_p.is-editor-empty:first-child]:before:float-left [&_p.is-editor-empty:first-child]:before:h-0',
          '[&_p.is-editor-empty:first-child]:before:text-muted-foreground/60 [&_p.is-editor-empty:first-child]:before:content-[attr(data-placeholder)]',
          className,
        )}
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
