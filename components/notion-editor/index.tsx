'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import { BubbleMenu } from '@tiptap/react/menus'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Link from '@tiptap/extension-link'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import TextAlign from '@tiptap/extension-text-align'
import Underline from '@tiptap/extension-underline'
import Highlight from '@tiptap/extension-highlight'
import { TextStyle } from '@tiptap/extension-text-style'
import { useEffect, useRef, useState } from 'react'
import { createSlashExtension, type SlashCommand } from './slash-commands'
import type { SuggestionProps, SuggestionKeyDownProps } from '@tiptap/suggestion'
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough, Code,
  Link as LinkIcon, Highlighter, AlignLeft, AlignCenter, AlignRight,
  Heading1, Heading2,
} from 'lucide-react'

interface NotionEditorProps {
  content: string
  onChange?: (html: string) => void
  placeholder?: string
  readOnly?: boolean
  minHeight?: string
}

// ─── Bubble Menu (appears on text selection) ──────────────────────────────────

function BubbleToolbar({ editor }: { editor: ReturnType<typeof useEditor> }) {
  if (!editor) return null

  const setLink = () => {
    const prev = editor.getAttributes('link').href
    const url = window.prompt('URL', prev)
    if (url === null) return
    if (!url) { editor.chain().focus().unsetLink().run(); return }
    editor.chain().focus().setLink({ href: url }).run()
  }

  const tools = [
    { icon: Bold,          active: editor.isActive('bold'),           run: () => editor.chain().focus().toggleBold().run(),      title: 'Bold' },
    { icon: Italic,        active: editor.isActive('italic'),         run: () => editor.chain().focus().toggleItalic().run(),    title: 'Italic' },
    { icon: UnderlineIcon, active: editor.isActive('underline'),      run: () => editor.chain().focus().toggleUnderline().run(), title: 'Underline' },
    { icon: Strikethrough, active: editor.isActive('strike'),         run: () => editor.chain().focus().toggleStrike().run(),    title: 'Strike' },
    { icon: Code,          active: editor.isActive('code'),           run: () => editor.chain().focus().toggleCode().run(),      title: 'Code' },
    { icon: Highlighter,   active: editor.isActive('highlight'),      run: () => editor.chain().focus().toggleHighlight().run(), title: 'Highlight' },
    { icon: LinkIcon,      active: editor.isActive('link'),           run: setLink,                                              title: 'Link' },
    { icon: Heading1,      active: editor.isActive('heading',{level:1}), run: () => editor.chain().focus().toggleHeading({level:1}).run(), title: 'H1' },
    { icon: Heading2,      active: editor.isActive('heading',{level:2}), run: () => editor.chain().focus().toggleHeading({level:2}).run(), title: 'H2' },
    { icon: AlignLeft,     active: editor.isActive({textAlign:'left'}),  run: () => editor.chain().focus().setTextAlign('left').run(),   title: 'Left' },
    { icon: AlignCenter,   active: editor.isActive({textAlign:'center'}),run: () => editor.chain().focus().setTextAlign('center').run(), title: 'Center' },
    { icon: AlignRight,    active: editor.isActive({textAlign:'right'}), run: () => editor.chain().focus().setTextAlign('right').run(),  title: 'Right' },
  ]

  return (
    <div className="flex items-center gap-0.5 bg-gray-900 border border-white/15 rounded-lg shadow-xl p-1">
      {tools.map(({ icon: Icon, active, run, title }, i) => (
        <button
          key={i}
          onMouseDown={e => { e.preventDefault(); run() }}
          title={title}
          className={[
            'p-1.5 rounded transition-colors',
            active ? 'bg-white/20 text-white' : 'text-gray-400 hover:text-white hover:bg-white/10',
          ].join(' ')}
        >
          <Icon className="w-3.5 h-3.5" />
        </button>
      ))}
    </div>
  )
}

// ─── Slash Command Menu ────────────────────────────────────────────────────────

function SlashMenu({ items, selectedIndex, onSelect }: {
  items: SlashCommand[]
  selectedIndex: number
  onSelect: (cmd: SlashCommand) => void
}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current?.children[selectedIndex] as HTMLElement
    el?.scrollIntoView({ block: 'nearest' })
  }, [selectedIndex])

  if (!items.length) return null

  return (
    <div
      ref={ref}
      className="bg-gray-900 border border-white/15 rounded-xl shadow-2xl overflow-hidden w-64 py-1"
    >
      <div className="px-3 py-1.5 text-[10px] font-semibold text-gray-600 uppercase tracking-widest">
        Blocks
      </div>
      {items.map((cmd, i) => (
        <button
          key={cmd.title}
          onMouseDown={e => { e.preventDefault(); onSelect(cmd) }}
          className={[
            'flex items-center gap-3 w-full px-3 py-2 text-left transition-colors',
            i === selectedIndex ? 'bg-white/8 text-white' : 'text-gray-300 hover:bg-white/5',
          ].join(' ')}
        >
          <div className="w-8 h-8 rounded-lg bg-gray-800 border border-white/10 flex items-center justify-center flex-shrink-0 font-mono text-xs font-bold text-gray-300">
            {cmd.icon}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium leading-tight">{cmd.title}</p>
            <p className="text-xs text-gray-600 leading-tight truncate">{cmd.description}</p>
          </div>
        </button>
      ))}
    </div>
  )
}

// ─── Main Editor ──────────────────────────────────────────────────────────────

export function NotionEditor({
  content,
  onChange,
  placeholder = "Type '/' for commands…",
  readOnly = false,
  minHeight = '200px',
}: NotionEditorProps) {
  // Slash menu state
  const [slashProps, setSlashProps]         = useState<SuggestionProps | null>(null)
  const [slashIndex, setSlashIndex]         = useState(0)
  const keyDownHandlerRef                   = useRef<((p: SuggestionKeyDownProps) => boolean) | null>(null)

  const slashExtension = createSlashExtension(
    (props) => { setSlashProps(props); setSlashIndex(0) },
    ()      => setSlashProps(null),
    (props) => keyDownHandlerRef.current ? keyDownHandlerRef.current(props) : false,
  )

  // Wire keyboard nav into slash menu
  keyDownHandlerRef.current = (props) => {
    const items = slashProps?.items as SlashCommand[] | undefined
    if (!items?.length) return false
    if (props.event.key === 'ArrowDown') { setSlashIndex(i => (i + 1) % items.length); return true }
    if (props.event.key === 'ArrowUp')   { setSlashIndex(i => (i - 1 + items.length) % items.length); return true }
    if (props.event.key === 'Enter') {
      const cmd = items[slashIndex]
      if (cmd && slashProps) {
        editor?.chain().focus().deleteRange(slashProps.range).run()
        cmd.command(editor!)
        setSlashProps(null)
      }
      return true
    }
    if (props.event.key === 'Escape') { setSlashProps(null); return true }
    return false
  }

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        codeBlock: { HTMLAttributes: { class: 'notion-code-block' } },
      }),
      Placeholder.configure({
        placeholder,
        emptyEditorClass: 'is-editor-empty',
        emptyNodeClass: 'is-empty',
      }),
      Link.configure({ openOnClick: readOnly, HTMLAttributes: { class: 'notion-link' } }),
      TaskList,
      TaskItem.configure({ nested: true }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Underline,
      Highlight.configure({ multicolor: false }),
      TextStyle,
      ...(readOnly ? [] : [slashExtension]),
    ],
    content,
    editable: !readOnly,
    editorProps: {
      attributes: {
        class: 'notion-prose focus:outline-none',
        style: `min-height: ${minHeight}`,
      },
    },
    onUpdate({ editor }) {
      onChange?.(editor.getHTML())
    },
  })

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content || '')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content])

  if (!editor) return null

  // Slash menu position
  const slashItems = (slashProps?.items as SlashCommand[]) || []
  const slashClientRect = slashProps?.clientRect

  return (
    <div className="relative notion-editor-root">
      {/* Bubble menu on selection */}
      {!readOnly && editor && (
        <BubbleMenu editor={editor as never}>
          <BubbleToolbar editor={editor} />
        </BubbleMenu>
      )}

      {/* Slash command dropdown — portal-positioned */}
      {slashProps && slashItems.length > 0 && slashClientRect && (() => {
        const rect = slashClientRect()
        if (!rect) return null
        return (
          <div
            style={{
              position: 'fixed',
              top: rect.bottom + 8,
              left: rect.left,
              zIndex: 9999,
            }}
          >
            <SlashMenu
              items={slashItems}
              selectedIndex={slashIndex}
              onSelect={(cmd) => {
                editor.chain().focus().deleteRange(slashProps.range).run()
                cmd.command(editor)
                setSlashProps(null)
              }}
            />
          </div>
        )
      })()}

      {/* Editor */}
      <EditorContent editor={editor} />
    </div>
  )
}
