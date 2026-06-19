import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import EmojiPicker from "emoji-picker-react";
import { Smile } from "lucide-react";

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

/**
 * Emoji toolbar control; popover renders in a portal so it stays above overflow parents.
 */
export default function AdminRichEmojiButton({ editor, disabled = false }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(null);
  const anchorRef = useRef(null);

  const updatePosition = () => {
    if (!anchorRef.current) return;
    const rect = anchorRef.current.getBoundingClientRect();
    const pickerWidth = 320;
    setPos({
      top: rect.bottom + 8,
      left: Math.max(8, rect.right - pickerWidth),
    });
  };

  useLayoutEffect(() => {
    if (!open) return;
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => {
      const pop = document.getElementById("jw-adminRichEmojiPicker");
      if (
        anchorRef.current &&
        !anchorRef.current.contains(e.target) &&
        pop &&
        !pop.contains(e.target)
      ) {
        setOpen(false);
      }
    };
    const onEsc = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    window.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      window.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  const popover =
    open && pos && editor
      ? createPortal(
          <div
            id="jw-adminRichEmojiPicker"
            className="jw-refRich__emojiPicker jw-refRich__emojiPicker--portal"
            style={{ top: pos.top, left: pos.left }}
          >
            <EmojiPicker
              lazyLoadEmojis
              width={320}
              height={380}
              onEmojiClick={(emojiData) => {
                editor.chain().focus().insertContent(emojiData.emoji || "").run();
                setOpen(false);
              }}
            />
          </div>,
          document.body,
        )
      : null;

  return (
    <div className="jw-refRich__toolbarGroup jw-refRich__toolbarGroup--emoji" ref={anchorRef}>
      <ToolbarButton
        disabled={disabled}
        title="Insert emoji"
        onClick={() => setOpen((v) => !v)}
      >
        <Smile size={17} strokeWidth={2.25} />
      </ToolbarButton>
      {popover}
    </div>
  );
}
