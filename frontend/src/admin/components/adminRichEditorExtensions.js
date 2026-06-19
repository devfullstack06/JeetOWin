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
import { FontSize, LineHeight, Indentation, ListStyle } from "./referralEditorExtensions";

export function buildAdminRichEditorExtensions({
  placeholder = "Write your message…",
  headingLevels = [1, 2, 3],
}) {
  return [
    StarterKit.configure({
      heading: { levels: headingLevels },
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
  ];
}
