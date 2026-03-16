/**
 * Optimize SVG with SVGO: multipass, remove metadata/comments/unused/hidden,
 * preserve vector path data and visual quality.
 */
const { optimize } = require("svgo");

const SVGO_CONFIG = {
  multipass: true,
  plugins: [
    "removeDoctype",
    "removeXMLProcInst",
    "removeComments",
    "removeMetadata",
    "removeEditorsNSData",
    "cleanupAttrs",
    "mergeStyles",
    "inlineStyles",
    { name: "removeUnusedNS" },
    { name: "removeHiddenElems", params: { displayNone: true, opacity0: true } },
    "removeEmptyAttrs",
    "removeEmptyContainers",
    "removeEmptyText",
    "minifyStyles",
    "cleanupIds",
    "convertColors",
    "convertPathData",
    "convertTransform",
    "removeUnknownsAndDefaults",
    "removeNonInheritableGroupAttrs",
    "removeUselessStrokeAndFill",
    "cleanupNumericValues",
    "moveGroupAttrsToElems",
    "collapseGroups",
    "mergePaths",
    "convertShapeToPath",
    "sortAttrs",
  ].map((p) => (typeof p === "string" ? { name: p } : p)),
};

/**
 * @param {string} svgString
 * @returns {string} Optimized SVG string
 */
function optimizeSvg(svgString) {
  const result = optimize(svgString, SVGO_CONFIG);
  return result?.data ?? svgString;
}

module.exports = { optimizeSvg };
