/**
 * Generate PNG fallback from SVG buffer (e.g. 80x80 or 100x100).
 */
const sharp = require("sharp");
const path = require("path");
const fs = require("fs");

const PNG_SIZE = 100;

/**
 * Write a PNG file next to the SVG path.
 * @param {string} svgFilePath - Full path to the .svg file (e.g. .../uploads/wallets/name.svg)
 * @param {Buffer} [svgBuffer] - Optional SVG buffer if file not yet written
 * @returns {Promise<string|null>} Path to written PNG or null
 */
async function generatePngFromSvg(svgFilePath, svgBuffer) {
  const pngPath = path.join(path.dirname(svgFilePath), path.basename(svgFilePath, ".svg") + ".png");
  const input = svgBuffer || fs.readFileSync(svgFilePath);

  try {
    await sharp(input)
      .resize(PNG_SIZE, PNG_SIZE)
      .png()
      .toFile(pngPath);
    return pngPath;
  } catch (err) {
    console.error("svgToPng generatePngFromSvg error:", err?.message);
    return null;
  }
}

module.exports = { generatePngFromSvg, PNG_SIZE };
