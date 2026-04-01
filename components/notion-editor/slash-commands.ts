import { Extension } from '@tiptap/core'
import Suggestion from '@tiptap/suggestion'
import type { Editor } from '@tiptap/core'
import type { SuggestionProps, SuggestionKeyDownProps } from '@tiptap/suggestion'

export interface SlashCommand {
  title: string
  description: string
  icon: string
  command: (editor: Editor) => void
}

export const SLASH_COMMANDS: SlashCommand[] = [
  {
    title: 'Heading 1',
    description: 'Large section heading',
    icon: 'H1',
    command: (editor) => editor.chain().focus().toggleHeading({ level: 1 }).run(),
  },
  {
    title: 'Heading 2',
    description: 'Medium section heading',
    icon: 'H2',
    command: (editor) => editor.chain().focus().toggleHeading({ level: 2 }).run(),
  },
  {
    title: 'Heading 3',
    description: 'Small section heading',
    icon: 'H3',
    command: (editor) => editor.chain().focus().toggleHeading({ level: 3 }).run(),
  },
  {
    title: 'Bullet List',
    description: 'Simple unordered list',
    icon: '•',
    command: (editor) => editor.chain().focus().toggleBulletList().run(),
  },
  {
    title: 'Numbered List',
    description: 'Ordered numbered list',
    icon: '1.',
    command: (editor) => editor.chain().focus().toggleOrderedList().run(),
  },
  {
    title: 'To-do List',
    description: 'Checklist with checkboxes',
    icon: '☑',
    command: (editor) => editor.chain().focus().toggleTaskList().run(),
  },
  {
    title: 'Quote',
    description: 'Capture a quote',
    icon: '"',
    command: (editor) => editor.chain().focus().toggleBlockquote().run(),
  },
  {
    title: 'Code Block',
    description: 'Monospaced code block',
    icon: '</>',
    command: (editor) => editor.chain().focus().toggleCodeBlock().run(),
  },
  {
    title: 'Divider',
    description: 'Horizontal separator line',
    icon: '—',
    command: (editor) => editor.chain().focus().setHorizontalRule().run(),
  },
]

export function createSlashExtension(onOpen: (props: SuggestionProps) => void, onClose: () => void, onKeyDown: (props: SuggestionKeyDownProps) => boolean) {
  return Extension.create({
    name: 'slash',
    addOptions() {
      return { suggestion: {} }
    },
    addProseMirrorPlugins() {
      return [
        Suggestion({
          editor: this.editor,
          char: '/',
          allowSpaces: false,
          startOfLine: false,
          command: ({ editor, range, props }) => {
            editor.chain().focus().deleteRange(range).run()
            ;(props as SlashCommand).command(editor)
          },
          items: ({ query }: { query: string }) => {
            return SLASH_COMMANDS.filter(cmd =>
              cmd.title.toLowerCase().includes(query.toLowerCase())
            )
          },
          render: () => ({
            onStart: onOpen,
            onUpdate: onOpen,
            onExit: onClose,
            onKeyDown,
          }),
        }),
      ]
    },
  })
}
