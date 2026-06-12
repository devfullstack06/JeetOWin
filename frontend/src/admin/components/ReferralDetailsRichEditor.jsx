import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import EmojiPicker from "emoji-picker-react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
import { Table } from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import {
  Bold,
  Italic,
  Strikethrough,
  Link as LinkIcon,
  Undo2,
  Redo2,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Code2,
  IndentIncrease,
  Smile,
  IndentDecrease,
} from "lucide-react";
import { FontSize, LineHeight, Indentation, ListStyle } from "./referralEditorExtensions";
import { OrderedListMenu, BulletListMenu, TableMenu } from "./referralEditorToolbarMenus";
import "./AnnouncementRichEditor.css";
import "./ReferralDetailsRichEditor.css";

const FONT_SIZES = ["10pt", "12pt", "14pt", "16pt", "18pt", "24pt", "32pt"];
const LINE_HEIGHTS = [
  { label: "1", value: "1" },
  { label: "1.15", value: "1.15" },
  { label: "1.5", value: "1.5" },
  { label: "2", value: "2" },
];

function normalizeInitialHtml(html) {
  const s = String(html || "").trim();
  if (!s) return "<p></p>";
  if (/<[a-z][\s\S]*>/i.test(s)) return s;
  const escaped = s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return `<p>${escaped.replace(/\n/g, "<br>")}</p>`;
}

function ToolbarButton({ active = false, disabled, onClick, title, children }) {
  return (
    <button
      type="button"
      className={`jw-refRich__tbBtn${active ? " is-active" : ""}`}
      disabled={disabled}
      onClick={onClick}
      title={title}
    >
      {children}
    </button>
  );
}

function ToolbarSelect({ value, onChange, disabled, title, options, className = "" }) {
  return (
    <select
      className={`jw-refRich__select ${className}`.trim()}
      value={value}
      disabled={disabled}
      title={title}
      onChange={(e) => onChange(e.target.value)}
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

function EditorToolbar({ editor, disabled, sourceMode, onToggleSource }) {
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

  const blockValue = useMemo(() => {
    if (!editor) return "paragraph";
    if (editor.isActive("heading", { level: 1 })) return "h1";
    if (editor.isActive("heading", { level: 2 })) return "h2";
    if (editor.isActive("heading", { level: 3 })) return "h3";
    return "paragraph";
  }, [editor, editor?.state]);

  const onBlockChange = (value) => {
    if (!editor) return;
    const chain = editor.chain().focus();
    if (value === "paragraph") chain.setParagraph().run();
    else if (value === "h1") chain.toggleHeading({ level: 1 }).run();
    else if (value === "h2") chain.toggleHeading({ level: 2 }).run();
    else if (value === "h3") chain.toggleHeading({ level: 3 }).run();
  };

  const currentFontSize = editor?.getAttributes("textStyle")?.fontSize || "12pt";
  const currentLineHeight =
    editor?.getAttributes("paragraph")?.lineHeight ||
    editor?.getAttributes("heading")?.lineHeight ||
    "1.5";

  if (!editor) return null;

  return (
    <div className="jw-refRich__toolbar" role="toolbar" aria-label="Referral details formatting">
      <div className="jw-refRich__toolbarRow">
        <div className="jw-refRich__toolbarGroup">
          <ToolbarButton
            disabled={disabled || !editor.can().undo()}
            title="Undo"
            onClick={() => editor.chain().focus().undo().run()}
          >
            <Undo2 size={17} strokeWidth={2.25} />
          </ToolbarButton>
          <ToolbarButton
            disabled={disabled || !editor.can().redo()}
            title="Redo"
            onClick={() => editor.chain().focus().redo().run()}
          >
            <Redo2 size={17} strokeWidth={2.25} />
          </ToolbarButton>
        </div>

        <span className="jw-refRich__sep" aria-hidden />

        <ToolbarSelect
          value={blockValue}
          disabled={disabled || sourceMode}
          title="Text style"
          onChange={onBlockChange}
          options={[
            { value: "paragraph", label: "Paragraph" },
            { value: "h1", label: "Heading 1" },
            { value: "h2", label: "Heading 2" },
            { value: "h3", label: "Heading 3" },
          ]}
        />

        <ToolbarSelect
          value={currentFontSize}
          disabled={disabled || sourceMode}
          title="Font size"
          onChange={(v) => {
            if (v === "default") editor.chain().focus().unsetFontSize().run();
            else editor.chain().focus().setFontSize(v).run();
          }}
          options={[
            { value: "default", label: "12pt" },
            ...FONT_SIZES.map((s) => ({ value: s, label: s })),
          ]}
        />

        <label className="jw-refRich__colorWrap" title="Text color">
          <span className="jw-refRich__colorA">A</span>
          <input
            type="color"
            className="jw-refRich__colorInput"
            disabled={disabled || sourceMode}
            defaultValue="#1a2332"
            onChange={(e) => editor.chain().focus().setColor(e.target.value).run()}
          />
        </label>

        <label className="jw-refRich__colorWrap" title="Highlight color">
          <span className="jw-refRich__colorMarker" aria-hidden />
          <input
            type="color"
            className="jw-refRich__colorInput"
            disabled={disabled || sourceMode}
            defaultValue="#fff59d"
            onChange={(e) => editor.chain().focus().toggleHighlight({ color: e.target.value }).run()}
          />
        </label>

        <span className="jw-refRich__sep" aria-hidden />

        <div className="jw-refRich__toolbarGroup">
          <ToolbarButton
            active={editor.isActive("bold")}
            disabled={disabled || sourceMode}
            title="Bold"
            onClick={() => editor.chain().focus().toggleBold().run()}
          >
            <Bold size={17} strokeWidth={2.25} />
          </ToolbarButton>
          <ToolbarButton
            active={editor.isActive("italic")}
            disabled={disabled || sourceMode}
            title="Italic"
            onClick={() => editor.chain().focus().toggleItalic().run()}
          >
            <Italic size={17} strokeWidth={2.25} />
          </ToolbarButton>
          <ToolbarButton
            active={editor.isActive("underline")}
            disabled={disabled || sourceMode}
            title="Underline"
            onClick={() => editor.chain().focus().toggleUnderline().run()}
          >
            <span className="jw-refRich__tbU" aria-hidden>
              U
            </span>
          </ToolbarButton>
          <ToolbarButton
            active={editor.isActive("strike")}
            disabled={disabled || sourceMode}
            title="Strikethrough"
            onClick={() => editor.chain().focus().toggleStrike().run()}
          >
            <Strikethrough size={17} strokeWidth={2.25} />
          </ToolbarButton>
        </div>

        <ToolbarSelect
          value={currentLineHeight}
          disabled={disabled || sourceMode}
          title="Line height"
          onChange={(v) => editor.chain().focus().setLineHeight(v).run()}
          options={LINE_HEIGHTS}
        />

        <span className="jw-refRich__sep" aria-hidden />

        <div className="jw-refRich__toolbarGroup">
          <ToolbarButton
            active={editor.isActive({ textAlign: "left" })}
            disabled={disabled || sourceMode}
            title="Align left"
            onClick={() => editor.chain().focus().setTextAlign("left").run()}
          >
            <AlignLeft size={17} strokeWidth={2.25} />
          </ToolbarButton>
          <ToolbarButton
            active={editor.isActive({ textAlign: "center" })}
            disabled={disabled || sourceMode}
            title="Align center"
            onClick={() => editor.chain().focus().setTextAlign("center").run()}
          >
            <AlignCenter size={17} strokeWidth={2.25} />
          </ToolbarButton>
          <ToolbarButton
            active={editor.isActive({ textAlign: "right" })}
            disabled={disabled || sourceMode}
            title="Align right"
            onClick={() => editor.chain().focus().setTextAlign("right").run()}
          >
            <AlignRight size={17} strokeWidth={2.25} />
          </ToolbarButton>
          <ToolbarButton
            active={editor.isActive({ textAlign: "justify" })}
            disabled={disabled || sourceMode}
            title="Justify"
            onClick={() => editor.chain().focus().setTextAlign("justify").run()}
          >
            <AlignJustify size={17} strokeWidth={2.25} />
          </ToolbarButton>
        </div>

        <span className="jw-refRich__sep" aria-hidden />

        <ToolbarButton
          active={sourceMode}
          disabled={disabled}
          title="Source code"
          onClick={onToggleSource}
        >
          <Code2 size={17} strokeWidth={2.25} />
        </ToolbarButton>

        <span className="jw-refRich__sep" aria-hidden />

        <div className="jw-refRich__toolbarGroup">
          <OrderedListMenu editor={editor} disabled={disabled} sourceMode={sourceMode} />
          <BulletListMenu editor={editor} disabled={disabled} sourceMode={sourceMode} />
          <TableMenu editor={editor} disabled={disabled} sourceMode={sourceMode} />
        </div>
      </div>

      <div className="jw-refRich__toolbarRow">
        <div className="jw-refRich__toolbarGroup">
          <ToolbarButton
            disabled={disabled || sourceMode}
            title="Decrease indent"
            onClick={() => editor.chain().focus().outdent().run()}
          >
            <IndentDecrease size={17} strokeWidth={2.25} />
          </ToolbarButton>
          <ToolbarButton
            disabled={disabled || sourceMode}
            title="Increase indent"
            onClick={() => editor.chain().focus().indent().run()}
          >
            <IndentIncrease size={17} strokeWidth={2.25} />
          </ToolbarButton>
        </div>

        <span className="jw-refRich__sep" aria-hidden />

        <ToolbarButton
          active={editor.isActive("link")}
          disabled={disabled || sourceMode}
          title="Link"
          onClick={setLink}
        >
          <LinkIcon size={17} strokeWidth={2.25} />
        </ToolbarButton>

        <span className="jw-refRich__sep" aria-hidden />

        <div className="jw-refRich__toolbarGroup jw-refRich__toolbarGroup--emoji" ref={emojiWrapRef}>
          <ToolbarButton
            disabled={disabled || sourceMode}
            title="Insert emoji"
            onClick={() => setEmojiOpen((v) => !v)}
          >
            <Smile size={17} strokeWidth={2.25} />
          </ToolbarButton>
          {emojiOpen ? (
            <div className="jw-refRich__emojiPicker">
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
    </div>
  );
}

/**
 * Full WYSIWYG for referral "More details" modal body (stores HTML).
 */
export default function ReferralDetailsRichEditor({
  initialHtml,
  onHtmlChange,
  disabled = false,
  placeholder = "Write referral program details for the client modal…",
  previewTitle = "Referral program details",
}) {
  const [sourceMode, setSourceMode] = useState(false);
  const [sourceHtml, setSourceHtml] = useState("");
  const [previewHtml, setPreviewHtml] = useState(() => normalizeInitialHtml(initialHtml));

  const initialContent = useMemo(() => normalizeInitialHtml(initialHtml), [initialHtml]);

  useEffect(() => {
    setPreviewHtml(normalizeInitialHtml(initialHtml));
  }, [initialHtml]);

  const editor = useEditor(
    {
      immediatelyRender: false,
      extensions: [
        StarterKit.configure({
          heading: { levels: [1, 2, 3] },
        }),
        Underline,
        Link.configure({ openOnClick: false, autolink: true, defaultProtocol: "https" }),
        Placeholder.configure({ placeholder }),
        TextAlign.configure({ types: ["heading", "paragraph"] }),
        TextStyle,
        Color,
        Highlight.configure({ multicolor: true }),
        FontSize,
        LineHeight,
        Indentation,
        ListStyle,
        Table.configure({ resizable: true }),
        TableRow,
        TableHeader,
        TableCell,
      ],
      content: initialContent,
      editable: !disabled,
      editorProps: {
        attributes: {
          class: "jw-refRich__editor ProseMirror",
          spellcheck: "true",
        },
      },
      onUpdate: ({ editor: ed }) => {
        if (!sourceMode) {
          const html = ed.getHTML();
          setPreviewHtml(html);
          onHtmlChange?.(html);
        }
      },
    },
    [],
  );

  useEffect(() => {
    if (editor) editor.setEditable(!disabled && !sourceMode);
  }, [editor, disabled, sourceMode]);

  const toggleSource = () => {
    if (!editor) return;
    if (!sourceMode) {
      const html = editor.getHTML();
      setSourceHtml(html);
      setPreviewHtml(html);
      setSourceMode(true);
      return;
    }
    try {
      editor.commands.setContent(sourceHtml || "<p></p>", false);
      const html = editor.getHTML();
      setPreviewHtml(html);
      onHtmlChange?.(html);
    } catch {
      window.alert("Invalid HTML. Please fix the source and try again.");
      return;
    }
    setSourceMode(false);
  };

  return (
    <div className="jw-refRich">
      <EditorToolbar
        editor={editor}
        disabled={disabled}
        sourceMode={sourceMode}
        onToggleSource={toggleSource}
      />
      {sourceMode ? (
        <textarea
          className="jw-refRich__source"
          value={sourceHtml}
          disabled={disabled}
          onChange={(e) => {
            setSourceHtml(e.target.value);
            setPreviewHtml(e.target.value);
            onHtmlChange?.(e.target.value);
          }}
          spellCheck
        />
      ) : (
        <div className="jw-refRich__editorWrap">
          <EditorContent editor={editor} />
        </div>
      )}

      <div className="jw-adminUsersModal__label jw-adminAnnLivePreviewLabel">Live preview</div>
      <div className="jw-refRich__livePreview">
        <div className="jw-refRich__livePreviewModal">
          <div className="jw-refRich__livePreviewHead">
            <h4 className="jw-refRich__livePreviewTitle">{previewTitle || "More details"}</h4>
          </div>
          <div
            className="jw-refRich__livePreviewBody jw-refDetailsModal__body--rich"
            dangerouslySetInnerHTML={{ __html: previewHtml || "<p></p>" }}
          />
        </div>
      </div>
    </div>
  );
}
