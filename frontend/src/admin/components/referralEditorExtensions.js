import { Extension } from "@tiptap/core";

export const FontSize = Extension.create({
  name: "fontSize",
  addGlobalAttributes() {
    return [
      {
        types: ["textStyle"],
        attributes: {
          fontSize: {
            default: null,
            parseHTML: (el) => el.style.fontSize || null,
            renderHTML: (attrs) =>
              attrs.fontSize ? { style: `font-size: ${attrs.fontSize}` } : {},
          },
        },
      },
    ];
  },
  addCommands() {
    return {
      setFontSize:
        (fontSize) =>
        ({ chain }) =>
          chain().setMark("textStyle", { fontSize }).run(),
      unsetFontSize:
        () =>
        ({ chain }) =>
          chain().setMark("textStyle", { fontSize: null }).removeEmptyTextStyle().run(),
    };
  },
});

export const LineHeight = Extension.create({
  name: "lineHeight",
  addGlobalAttributes() {
    return [
      {
        types: ["paragraph", "heading"],
        attributes: {
          lineHeight: {
            default: null,
            parseHTML: (el) => el.style.lineHeight || null,
            renderHTML: (attrs) =>
              attrs.lineHeight ? { style: `line-height: ${attrs.lineHeight}` } : {},
          },
        },
      },
    ];
  },
  addCommands() {
    return {
      setLineHeight:
        (lineHeight) =>
        ({ editor, commands }) => {
          if (editor.isActive("heading")) {
            return commands.updateAttributes("heading", { lineHeight });
          }
          return commands.updateAttributes("paragraph", { lineHeight });
        },
    };
  },
});

export const ListStyle = Extension.create({
  name: "listStyle",
  addGlobalAttributes() {
    const listStyleAttr = (defaultType) => ({
      listStyleType: {
        default: defaultType,
        parseHTML: (el) => el.style.listStyleType || el.getAttribute("data-list-style") || defaultType,
        renderHTML: (attrs) => {
          const type = attrs.listStyleType || defaultType;
          if (type === defaultType) return {};
          return {
            style: `list-style-type: ${type}`,
            "data-list-style": type,
          };
        },
      },
    });
    return [
      { types: ["orderedList"], attributes: listStyleAttr("decimal") },
      { types: ["bulletList"], attributes: listStyleAttr("disc") },
    ];
  },
  addCommands() {
    return {
      setOrderedListStyle:
        (listStyleType) =>
        ({ editor, chain }) => {
          if (editor.isActive("orderedList")) {
            return chain().focus().updateAttributes("orderedList", { listStyleType }).run();
          }
          return chain().focus().toggleOrderedList().updateAttributes("orderedList", { listStyleType }).run();
        },
      setBulletListStyle:
        (listStyleType) =>
        ({ editor, chain }) => {
          if (editor.isActive("bulletList")) {
            return chain().focus().updateAttributes("bulletList", { listStyleType }).run();
          }
          return chain().focus().toggleBulletList().updateAttributes("bulletList", { listStyleType }).run();
        },
    };
  },
});

export const Indentation = Extension.create({
  name: "indentation",
  addGlobalAttributes() {
    return [
      {
        types: ["paragraph", "heading"],
        attributes: {
          indent: {
            default: 0,
            parseHTML: (el) => {
              const ml = parseInt(el.style.marginLeft, 10);
              return Number.isFinite(ml) ? Math.round(ml / 24) : 0;
            },
            renderHTML: (attrs) =>
              attrs.indent ? { style: `margin-left: ${attrs.indent * 24}px` } : {},
          },
        },
      },
    ];
  },
  addCommands() {
    const nodeType = (editor) => (editor.isActive("heading") ? "heading" : "paragraph");
    return {
      indent:
        () =>
        ({ editor, commands }) => {
          const type = nodeType(editor);
          const cur = Number(editor.getAttributes(type).indent || 0);
          return commands.updateAttributes(type, { indent: Math.min(cur + 1, 10) });
        },
      outdent:
        () =>
        ({ editor, commands }) => {
          const type = nodeType(editor);
          const cur = Number(editor.getAttributes(type).indent || 0);
          return commands.updateAttributes(type, { indent: Math.max(cur - 1, 0) });
        },
    };
  },
});
