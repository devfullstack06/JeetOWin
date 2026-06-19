import React, { useEffect, useMemo, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import AdminRichEditorToolbar from "./AdminRichEditorToolbar";
import { buildAdminRichEditorExtensions } from "./adminRichEditorExtensions";
import "./ReferralDetailsRichEditor.css";

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
      extensions: buildAdminRichEditorExtensions({ placeholder }),
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
      <AdminRichEditorToolbar
        editor={editor}
        disabled={disabled}
        sourceMode={sourceMode}
        onToggleSource={toggleSource}
        ariaLabel="Referral details formatting"
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
