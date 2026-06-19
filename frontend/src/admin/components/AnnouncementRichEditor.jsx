import React, { useEffect, useMemo, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import TurndownService from "turndown";
import { markdownToHtml } from "../../utils/simpleMarkdown";
import AdminRichEditorToolbar from "./AdminRichEditorToolbar";
import { buildAdminRichEditorExtensions } from "./adminRichEditorExtensions";
import "./ReferralDetailsRichEditor.css";

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
  t.addRule("coloredSpan", {
    filter(node) {
      return node.nodeName === "SPAN" && node.getAttribute("style")?.includes("color");
    },
    replacement(content, node) {
      const style = node.getAttribute("style") || "";
      return `<span style="${style}">${content}</span>`;
    },
  });
  t.addRule("highlightMark", {
    filter(node) {
      return node.nodeName === "MARK";
    },
    replacement(content, node) {
      const style = node.getAttribute("style") || "";
      return style ? `<mark style="${style}">${content}</mark>` : `<mark>${content}</mark>`;
    },
  });
  return t;
}

function htmlToMarkdown(html, turndown) {
  const raw = turndown.turndown(html || "").trim();
  return raw === "<p></p>" || raw === "" ? "" : raw;
}

/**
 * WYSIWYG body for announcements and promos; stores Markdown in parent via Turndown.
 * Parent should remount with `key` when the modal opens so initial content resets.
 */
export default function AnnouncementRichEditor({ initialMarkdown, onMarkdownChange, disabled }) {
  const [sourceMode, setSourceMode] = useState(false);
  const [sourceHtml, setSourceHtml] = useState("");
  const turndown = useMemo(() => buildTurndown(), []);

  const initialHtml = useMemo(() => {
    const md = String(initialMarkdown || "").trim();
    if (!md) return "<p></p>";
    return markdownToHtml(md);
  }, [initialMarkdown]);

  const emitMarkdown = (html) => {
    onMarkdownChange(htmlToMarkdown(html, turndown));
  };

  const editor = useEditor(
    {
      immediatelyRender: false,
      extensions: buildAdminRichEditorExtensions({
        placeholder: "Write your announcement…",
      }),
      content: initialHtml,
      editable: !disabled,
      editorProps: {
        attributes: {
          class: "jw-refRich__editor ProseMirror",
          spellcheck: "true",
        },
      },
      onUpdate: ({ editor: ed }) => {
        if (!sourceMode) emitMarkdown(ed.getHTML());
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
      setSourceHtml(editor.getHTML());
      setSourceMode(true);
      return;
    }
    try {
      editor.commands.setContent(sourceHtml || "<p></p>", false);
      emitMarkdown(editor.getHTML());
    } catch {
      window.alert("Invalid HTML. Please fix the source and try again.");
      return;
    }
    setSourceMode(false);
  };

  return (
    <div className="jw-refRich">
      <AdminRichEditorToolbar
        editor={editor}
        disabled={disabled}
        sourceMode={sourceMode}
        onToggleSource={toggleSource}
        ariaLabel="Message formatting"
      />
      {sourceMode ? (
        <textarea
          className="jw-refRich__source"
          value={sourceHtml}
          disabled={disabled}
          onChange={(e) => {
            setSourceHtml(e.target.value);
            emitMarkdown(e.target.value);
          }}
          spellCheck
        />
      ) : (
        <div className="jw-refRich__editorWrap">
          <EditorContent editor={editor} />
        </div>
      )}
    </div>
  );
}
