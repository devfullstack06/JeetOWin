import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import TurndownService from "turndown";
import EmojiPicker from "emoji-picker-react";
import {
  Bold,
  Italic,
  Strikethrough,
  Link as LinkIcon,
  Heading2,
  Quote,
  Code,
  List,
  ListOrdered,
  Undo2,
  Redo2,
  Smile,
} from "lucide-react";
import { markdownToHtml } from "../../utils/simpleMarkdown";
import "./AnnouncementRichEditor.css";

function buildTurndown() {
  const t = new TurndownService({
    headingStyle: "atx",
    bulletListMarker: "-",
    codeBlockStyle: "fenced",
  });
  t.addRule("underline", {
    filter(node) {
      return node.nodeName === "U";
    },
    replacement(content) {
      return `<u>${content}</u>`;
    },
  });
  return t;
}

function htmlToMarkdown(html, turndown) {
  const raw = turndown.turndown(html || "").trim();
  return raw === "<p></p>" || raw === "" ? "" : raw;
}

function ToolbarButton({ active = false, disabled, onClick, title, children }) {
  return (
    <button
      type="button"
      className={`jw-annRich__tbBtn${active ? " is-active" : ""}`}
      disabled={disabled}
      onClick={onClick}
      title={title}
    >
      {children}
    </button>
  );
}

function EditorToolbar({ editor, disabled }) {
  const [emojiOpen, setEmojiOpen] = useState(false);
  const emojiWrapRef = useRef(null);

  const setLink = useCallback(() => {
    if (!editor) return;
    const prev = editor.getAttributes("link").href;
    const url = window.prompt("Link URL", prev || "https://");
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }, [editor]);

  useEffect(() => {
    if (!emojiOpen) return;
    const onDoc = (e) => {
      if (emojiWrapRef.current && !emojiWrapRef.current.contains(e.target)) {
        setEmojiOpen(false);
      }
    };
    const onEsc = (e) => {
      if (e.key === "Escape") setEmojiOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    window.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      window.removeEventListener("keydown", onEsc);
    };
  }, [emojiOpen]);

  if (!editor) return null;

  return (
    <div className="jw-annRich__toolbar" role="toolbar" aria-label="Message formatting">
      <div className="jw-annRich__toolbarGroup">
        <ToolbarButton
          active={editor.isActive("bold")}
          disabled={disabled}
          title="Bold"
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold size={17} strokeWidth={2.25} />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive("italic")}
          disabled={disabled}
          title="Italic"
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <Italic size={17} strokeWidth={2.25} />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive("strike")}
          disabled={disabled}
          title="Strikethrough"
          onClick={() => editor.chain().focus().toggleStrike().run()}
        >
          <Strikethrough size={17} strokeWidth={2.25} />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive("underline")}
          disabled={disabled}
          title="Underline"
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        >
          <span className="jw-annRich__tbU" aria-hidden>
            U
          </span>
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive("link")}
          disabled={disabled}
          title="Link"
          onClick={setLink}
        >
          <LinkIcon size={17} strokeWidth={2.25} />
        </ToolbarButton>
      </div>
      <span className="jw-annRich__sep" aria-hidden />
      <div className="jw-annRich__toolbarGroup">
        <ToolbarButton
          active={editor.isActive("heading", { level: 2 })}
          disabled={disabled}
          title="Heading"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          <Heading2 size={17} strokeWidth={2.25} />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive("blockquote")}
          disabled={disabled}
          title="Quote"
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        >
          <Quote size={17} strokeWidth={2.25} />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive("code")}
          disabled={disabled}
          title="Inline code"
          onClick={() => editor.chain().focus().toggleCode().run()}
        >
          <Code size={17} strokeWidth={2.25} />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive("bulletList")}
          disabled={disabled}
          title="Bullet list"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List size={17} strokeWidth={2.25} />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive("orderedList")}
          disabled={disabled}
          title="Numbered list"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered size={17} strokeWidth={2.25} />
        </ToolbarButton>
      </div>
      <span className="jw-annRich__sep" aria-hidden />
      <div className="jw-annRich__toolbarGroup">
        <ToolbarButton disabled={disabled || !editor.can().undo()} title="Undo" onClick={() => editor.chain().focus().undo().run()}>
          <Undo2 size={17} strokeWidth={2.25} />
        </ToolbarButton>
        <ToolbarButton disabled={disabled || !editor.can().redo()} title="Redo" onClick={() => editor.chain().focus().redo().run()}>
          <Redo2 size={17} strokeWidth={2.25} />
        </ToolbarButton>
      </div>
      <span className="jw-annRich__sep" aria-hidden />
      <div className="jw-annRich__toolbarGroup jw-annRich__toolbarGroup--emoji" ref={emojiWrapRef}>
        <ToolbarButton
          disabled={disabled}
          title="Insert emoji"
          onClick={() => setEmojiOpen((v) => !v)}
        >
          <Smile size={17} strokeWidth={2.25} />
        </ToolbarButton>
        {emojiOpen ? (
          <div className="jw-annRich__emojiPicker">
            <EmojiPicker
              lazyLoadEmojis
              width={320}
              height={380}
              onEmojiClick={(emojiData) => {
                editor.chain().focus().insertContent(emojiData.emoji || "").run();
                setEmojiOpen(false);
              }}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}

/**
 * WYSIWYG body for announcements; stores Markdown in parent via Turndown.
 * Parent should remount with `key` when the modal opens so initial content resets.
 */
export default function AnnouncementRichEditor({ initialMarkdown, onMarkdownChange, disabled }) {
  const turndown = useMemo(() => buildTurndown(), []);

  const initialHtml = useMemo(() => {
    const md = String(initialMarkdown || "").trim();
    if (!md) return "<p></p>";
    return markdownToHtml(md);
  }, [initialMarkdown]);

  const editor = useEditor(
    {
      immediatelyRender: false,
      extensions: [
        StarterKit.configure({
          heading: { levels: [2, 3] },
        }),
        Underline,
        Link.configure({ openOnClick: false, autolink: true, defaultProtocol: "https" }),
        Placeholder.configure({
          placeholder: "Write your announcement…",
        }),
      ],
      content: initialHtml,
      editable: !disabled,
      editorProps: {
        attributes: {
          class: "jw-annRich__editor ProseMirror",
          spellcheck: "true",
        },
      },
      onUpdate: ({ editor: ed }) => {
        const md = htmlToMarkdown(ed.getHTML(), turndown);
        onMarkdownChange(md);
      },
    },
    [],
  );

  useEffect(() => {
    if (editor) editor.setEditable(!disabled);
  }, [editor, disabled]);

  return (
    <div className="jw-annRich">
      <EditorToolbar editor={editor} disabled={disabled} />
      <div className="jw-annRich__editorWrap">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
