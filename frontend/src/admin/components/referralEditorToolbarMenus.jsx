import React, { useEffect, useRef, useState } from "react";
import { findParentNode } from "@tiptap/core";
import {
  ChevronDown,
  ChevronRight,
  Table as TableIcon,
  Trash2,
  Scissors,
  Copy,
  ClipboardPaste,
  Rows3,
  Columns3,
  Grid2x2,
  Merge,
  SplitSquareHorizontal,
  Settings2,
} from "lucide-react";

const ORDERED_STYLES = [
  { value: "decimal", markers: ["1.", "2.", "3."] },
  { value: "lower-alpha", markers: ["a.", "b.", "c."] },
  { value: "lower-greek", markers: ["α.", "β.", "γ."] },
  { value: "lower-roman", markers: ["i.", "ii.", "iii."] },
  { value: "upper-alpha", markers: ["A.", "B.", "C."] },
  { value: "upper-roman", markers: ["I.", "II.", "III."] },
];

const BULLET_STYLES = [
  { value: "disc", kind: "disc" },
  { value: "circle", kind: "circle" },
  { value: "square", kind: "square" },
];

let tableClipboard = null;

function useClickOutside(ref, open, onClose) {
  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    const onEsc = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", onDoc);
    window.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      window.removeEventListener("keydown", onEsc);
    };
  }, [open, onClose, ref]);
}

function getTableContext(editor) {
  const row = findParentNode((n) => n.type.name === "tableRow")(editor.state.selection);
  const table = findParentNode((n) => n.type.name === "table")(editor.state.selection);
  const cell = findParentNode(
    (n) => n.type.name === "tableCell" || n.type.name === "tableHeader",
  )(editor.state.selection);
  return { row, table, cell };
}

function serializeRow(rowNode) {
  const cells = [];
  rowNode.forEach((cell) => {
    cells.push(cell.textContent || "");
  });
  return cells;
}

function serializeColumn(tableNode, colIndex) {
  const cells = [];
  tableNode.forEach((row) => {
    const cell = row.child(colIndex);
    if (cell) cells.push(cell.textContent || "");
  });
  return cells;
}

function getColumnIndex(editor) {
  const { cell, row } = getTableContext(editor);
  if (!cell || !row) return -1;
  let found = -1;
  row.node.forEach((child, _offset, i) => {
    if (child === cell.node) found = i;
  });
  return found;
}

function fillCurrentRow(editor, values) {
  const { row } = getTableContext(editor);
  if (!row) return;
  let i = 0;
  editor.state.doc.nodesBetween(row.pos, row.pos + row.node.nodeSize, (node, pos) => {
    if (node.type.name !== "tableCell" && node.type.name !== "tableHeader") return;
    const text = values[i++];
    if (text) {
      editor
        .chain()
        .focus()
        .setTextSelection(pos + 1)
        .insertContent(`<p>${text}</p>`)
        .run();
    }
  });
}

function fillCurrentColumn(editor, values) {
  const colIndex = getColumnIndex(editor);
  const { table } = getTableContext(editor);
  if (colIndex < 0 || !table) return;
  let rowIdx = 0;
  table.node.forEach((row, rowOffset) => {
    const cell = row.child(colIndex);
    if (!cell) return;
    const text = values[rowIdx++];
    if (!text) return;
    const cellPos = table.pos + 1 + rowOffset + 1;
    editor
      .chain()
      .focus()
      .setTextSelection(cellPos + 1)
      .insertContent(`<p>${text}</p>`)
      .run();
  });
}

function ToolbarSplitButton({ active, disabled, title, icon, onMainClick, children, menuClassName }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  useClickOutside(wrapRef, open, () => setOpen(false));

  return (
    <div
      className={`jw-refRich__splitBtn${active ? " is-active" : ""}${open ? " is-open" : ""}`}
      ref={wrapRef}
    >
      <button
        type="button"
        className="jw-refRich__tbBtn jw-refRich__tbBtn--main"
        disabled={disabled}
        title={title}
        onClick={onMainClick}
      >
        {icon}
      </button>
      <button
        type="button"
        className="jw-refRich__tbBtn jw-refRich__tbBtn--chev"
        disabled={disabled}
        title={`${title} options`}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <ChevronDown size={13} strokeWidth={2.5} />
      </button>
      {open ? (
        <div
          className={`jw-refRich__menu ${menuClassName || ""}`.trim()}
          onMouseDown={(e) => e.preventDefault()}
        >
          {typeof children === "function" ? children(() => setOpen(false)) : children}
        </div>
      ) : null}
    </div>
  );
}

function ListStylePreview({ markers, bulletKind }) {
  return (
    <div className="jw-refRich__listPreview">
      {[0, 1, 2].map((i) => (
        <div key={i} className="jw-refRich__listPreviewRow">
          {bulletKind ? (
            <span
              className={`jw-refRich__bulletMarker is-${bulletKind}`}
              aria-hidden
            />
          ) : (
            <span className="jw-refRich__listPreviewMarker">{markers[i]}</span>
          )}
          <span className="jw-refRich__listPreviewLine" aria-hidden />
        </div>
      ))}
    </div>
  );
}

export function OrderedListMenu({ editor, disabled, sourceMode }) {
  const isDisabled = disabled || sourceMode || !editor;
  const active = editor?.isActive("orderedList");
  const current =
    editor?.getAttributes("orderedList")?.listStyleType || "decimal";

  return (
    <ToolbarSplitButton
      active={active}
      disabled={isDisabled}
      title="Numbered list"
      icon={<span className="jw-refRich__listIcon is-ordered" aria-hidden />}
      onMainClick={() => editor?.chain().focus().toggleOrderedList().run()}
      menuClassName="jw-refRich__menu--listGrid"
    >
      {(close) => (
        <div className="jw-refRich__listGrid">
          {ORDERED_STYLES.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={`jw-refRich__listGridItem${current === opt.value ? " is-selected" : ""}`}
              title={opt.value}
              onClick={() => {
                editor?.chain().focus().setOrderedListStyle(opt.value).run();
                close();
              }}
            >
              <ListStylePreview markers={opt.markers} />
            </button>
          ))}
        </div>
      )}
    </ToolbarSplitButton>
  );
}

export function BulletListMenu({ editor, disabled, sourceMode }) {
  const isDisabled = disabled || sourceMode || !editor;
  const active = editor?.isActive("bulletList");
  const current = editor?.getAttributes("bulletList")?.listStyleType || "disc";

  return (
    <ToolbarSplitButton
      active={active}
      disabled={isDisabled}
      title="Bullet list"
      icon={<span className="jw-refRich__listIcon is-bullet" aria-hidden />}
      onMainClick={() => editor?.chain().focus().toggleBulletList().run()}
      menuClassName="jw-refRich__menu--listGrid jw-refRich__menu--bulletGrid"
    >
      {(close) => (
        <div className="jw-refRich__listGrid jw-refRich__listGrid--bullet">
          {BULLET_STYLES.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={`jw-refRich__listGridItem${current === opt.value ? " is-selected" : ""}`}
              title={opt.value}
              onClick={() => {
                editor?.chain().focus().setBulletListStyle(opt.value).run();
                close();
              }}
            >
              <ListStylePreview bulletKind={opt.kind} />
            </button>
          ))}
        </div>
      )}
    </ToolbarSplitButton>
  );
}

function TableGridPicker({ editor, onPick }) {
  const [hover, setHover] = useState({ rows: 0, cols: 0 });
  const max = 8;

  return (
    <div className="jw-refRich__tableGridWrap">
      <div className="jw-refRich__tableGrid" onMouseLeave={() => setHover({ rows: 0, cols: 0 })}>
        {Array.from({ length: max }, (_, r) =>
          Array.from({ length: max }, (_, c) => {
            const row = r + 1;
            const col = c + 1;
            const lit = row <= hover.rows && col <= hover.cols;
            return (
              <button
                key={`${row}-${col}`}
                type="button"
                className={`jw-refRich__tableGridCell${lit ? " is-lit" : ""}`}
                onMouseEnter={() => setHover({ rows: row, cols: col })}
                onClick={() => {
                  editor
                    ?.chain()
                    .focus()
                    .insertTable({ rows: row, cols: col, withHeaderRow: row > 1 })
                    .run();
                  onPick?.();
                }}
              />
            );
          }),
        )}
      </div>
      <div className="jw-refRich__tableGridSize">
        {hover.rows || 0}x{hover.cols || 0}
      </div>
    </div>
  );
}

function SubMenuItem({ label, icon, disabled, onClick, submenu }) {
  const [hover, setHover] = useState(false);
  const showSub = hover && submenu && !disabled;

  return (
    <div
      className="jw-refRich__subMenuWrap"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <button
        type="button"
        className={`jw-refRich__menuItem${disabled ? " is-disabled" : ""}${hover && submenu ? " is-active" : ""}`}
        disabled={disabled}
        onClick={disabled ? undefined : onClick}
      >
        {icon ? <span className="jw-refRich__menuItemIcon">{icon}</span> : null}
        <span className="jw-refRich__menuItemLabel">{label}</span>
        {submenu ? <ChevronRight size={14} className="jw-refRich__menuItemChev" /> : null}
      </button>
      {showSub ? <div className="jw-refRich__subMenu">{submenu}</div> : null}
    </div>
  );
}

function MenuAction({ label, icon, disabled, onClick }) {
  return (
    <button
      type="button"
      className={`jw-refRich__menuItem${disabled ? " is-disabled" : ""}`}
      disabled={disabled}
      onClick={onClick}
    >
      {icon ? <span className="jw-refRich__menuItemIcon">{icon}</span> : null}
      <span className="jw-refRich__menuItemLabel">{label}</span>
    </button>
  );
}

export function TableMenu({ editor, disabled, sourceMode }) {
  const isDisabled = disabled || sourceMode || !editor;
  const inTable = editor?.isActive("table");

  const run = (fn) => () => {
    fn();
  };

  const copyRow = () => {
    const { row } = getTableContext(editor);
    if (!row) return;
    tableClipboard = { kind: "row", values: serializeRow(row.node) };
  };

  const cutRow = () => {
    copyRow();
    editor?.chain().focus().deleteRow().run();
  };

  const pasteRow = (before) => {
    if (!tableClipboard || tableClipboard.kind !== "row") return;
    const chain = editor.chain().focus();
    if (before) chain.addRowBefore();
    else chain.addRowAfter();
    chain.run();
    fillCurrentRow(editor, tableClipboard.values);
  };

  const copyCol = () => {
    const { table } = getTableContext(editor);
    const colIndex = getColumnIndex(editor);
    if (!table || colIndex < 0) return;
    tableClipboard = {
      kind: "column",
      values: serializeColumn(table.node, colIndex),
    };
  };

  const cutCol = () => {
    copyCol();
    editor?.chain().focus().deleteColumn().run();
  };

  const pasteCol = (before) => {
    if (!tableClipboard || tableClipboard.kind !== "column") return;
    const chain = editor.chain().focus();
    if (before) chain.addColumnBefore();
    else chain.addColumnAfter();
    chain.run();
    fillCurrentColumn(editor, tableClipboard.values);
  };

  const cellSubmenu = (
    <>
      <MenuAction label="Cell properties" icon={<Settings2 size={15} />} disabled />
      <MenuAction
        label="Merge cells"
        icon={<Merge size={15} />}
        disabled={!inTable}
        onClick={run(() => editor?.chain().focus().mergeCells().run())}
      />
      <MenuAction
        label="Split cell"
        icon={<SplitSquareHorizontal size={15} />}
        disabled={!inTable}
        onClick={run(() => editor?.chain().focus().splitCell().run())}
      />
    </>
  );

  const rowSubmenu = (
    <>
      <MenuAction
        label="Insert row before"
        icon={<Rows3 size={15} />}
        disabled={!inTable}
        onClick={run(() => editor?.chain().focus().addRowBefore().run())}
      />
      <MenuAction
        label="Insert row after"
        icon={<Rows3 size={15} />}
        disabled={!inTable}
        onClick={run(() => editor?.chain().focus().addRowAfter().run())}
      />
      <MenuAction
        label="Delete row"
        icon={<Trash2 size={15} />}
        disabled={!inTable}
        onClick={run(() => editor?.chain().focus().deleteRow().run())}
      />
      <MenuAction label="Row properties" icon={<Settings2 size={15} />} disabled />
      <div className="jw-refRich__menuSep" />
      <MenuAction
        label="Cut row"
        icon={<Scissors size={15} />}
        disabled={!inTable}
        onClick={run(cutRow)}
      />
      <MenuAction
        label="Copy row"
        icon={<Copy size={15} />}
        disabled={!inTable}
        onClick={run(copyRow)}
      />
      <MenuAction
        label="Paste row before"
        icon={<ClipboardPaste size={15} />}
        disabled={!inTable || !tableClipboard || tableClipboard.kind !== "row"}
        onClick={run(() => pasteRow(true))}
      />
      <MenuAction
        label="Paste row after"
        icon={<ClipboardPaste size={15} />}
        disabled={!inTable || !tableClipboard || tableClipboard.kind !== "row"}
        onClick={run(() => pasteRow(false))}
      />
    </>
  );

  const colSubmenu = (
    <>
      <MenuAction
        label="Insert column before"
        icon={<Columns3 size={15} />}
        disabled={!inTable}
        onClick={run(() => editor?.chain().focus().addColumnBefore().run())}
      />
      <MenuAction
        label="Insert column after"
        icon={<Columns3 size={15} />}
        disabled={!inTable}
        onClick={run(() => editor?.chain().focus().addColumnAfter().run())}
      />
      <MenuAction
        label="Delete column"
        icon={<Trash2 size={15} />}
        disabled={!inTable}
        onClick={run(() => editor?.chain().focus().deleteColumn().run())}
      />
      <div className="jw-refRich__menuSep" />
      <MenuAction
        label="Cut column"
        icon={<Scissors size={15} />}
        disabled={!inTable}
        onClick={run(cutCol)}
      />
      <MenuAction
        label="Copy column"
        icon={<Copy size={15} />}
        disabled={!inTable}
        onClick={run(copyCol)}
      />
      <MenuAction
        label="Paste column before"
        icon={<ClipboardPaste size={15} />}
        disabled={!inTable || !tableClipboard || tableClipboard.kind !== "column"}
        onClick={run(() => pasteCol(true))}
      />
      <MenuAction
        label="Paste column after"
        icon={<ClipboardPaste size={15} />}
        disabled={!inTable || !tableClipboard || tableClipboard.kind !== "column"}
        onClick={run(() => pasteCol(false))}
      />
    </>
  );

  return (
    <ToolbarSplitButton
      active={inTable}
      disabled={isDisabled}
      title="Insert table"
      icon={<TableIcon size={17} strokeWidth={2.25} />}
      onMainClick={() =>
        editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
      }
      menuClassName="jw-refRich__menu--table"
    >
      {(close) => (
        <div className="jw-refRich__tableMenu">
          <TableGridPicker editor={editor} onPick={close} />
          <div className="jw-refRich__tableMenuSide">
            <SubMenuItem
              label="Table"
              icon={<Grid2x2 size={15} />}
              submenu={<TableGridPicker editor={editor} onPick={close} />}
            />
            <SubMenuItem label="Cell" submenu={cellSubmenu} disabled={!inTable} />
            <SubMenuItem label="Row" submenu={rowSubmenu} disabled={!inTable} />
            <SubMenuItem label="Column" submenu={colSubmenu} disabled={!inTable} />
            <div className="jw-refRich__menuSep" />
            <MenuAction label="Table properties" icon={<Settings2 size={15} />} disabled={!inTable} />
            <MenuAction
              label="Delete table"
              icon={<Trash2 size={15} />}
              disabled={!inTable}
              onClick={() => {
                editor?.chain().focus().deleteTable().run();
                close();
              }}
            />
          </div>
        </div>
      )}
    </ToolbarSplitButton>
  );
}
