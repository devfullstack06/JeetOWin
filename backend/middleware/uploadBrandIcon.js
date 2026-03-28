/**
 * Optional multer for brand icon upload (admin brands/website).
 * JPEG, PNG, WebP, GIF, SVG (+ common XML MIME for SVG), 2MB max, field name "icon".
 */
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

const UPLOADS_BRANDS = path.join(__dirname, "..", "uploads", "brands");
const MAX_SIZE = 2 * 1024 * 1024; // 2MB

const ALLOWED_MIMES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/pjpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/svg+xml",
  "text/xml",
  "application/xml",
]);

function ensureUploadsBrandsDir() {
  try {
    fs.mkdirSync(UPLOADS_BRANDS, { recursive: true });
    return true;
  } catch (e) {
    console.error("uploadBrandIcon ensureUploadsBrandsDir:", e.message);
    return false;
  }
}

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: MAX_SIZE },
  fileFilter(req, file, cb) {
    const mime = (file.mimetype || "").toLowerCase();
    if (!ALLOWED_MIMES.has(mime)) {
      return cb(new Error("Allowed types: JPEG, PNG, WebP, GIF, SVG (or XML SVG)."));
    }
    cb(null, true);
  },
}).single("icon");

function optionalBrandIconUpload(req, res, next) {
  const contentType = (req.headers["content-type"] || "").toLowerCase();
  if (!contentType.includes("multipart/form-data")) {
    return next();
  }
  ensureUploadsBrandsDir();
  upload(req, res, (err) => {
    if (err) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({ message: "Icon file must be 2MB or smaller." });
      }
      return res.status(400).json({ message: err.message || "Invalid icon upload." });
    }
    next();
  });
}

function uniqueBrandIconFilePrefix(prefix = "brand") {
  const slug = String(prefix).replace(/[^a-z0-9-]/gi, "-").replace(/-+/g, "-").slice(0, 24) || "brand";
  const hex = crypto.randomBytes(4).toString("hex");
  return `${slug}-${Date.now()}-${hex}`;
}

module.exports = {
  optionalBrandIconUpload,
  uniqueBrandIconFilePrefix,
  UPLOADS_BRANDS,
};
