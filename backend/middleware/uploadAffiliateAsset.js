/**
 * Optional multer for affiliate marketing asset uploads.
 */
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

const UPLOADS_DIR = path.join(__dirname, "..", "uploads", "affiliate-assets");
const MAX_SIZE = 10 * 1024 * 1024;

const ALLOWED_MIMES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/svg+xml",
  "video/mp4",
  "video/webm",
  "application/pdf",
]);

function ensureDir() {
  try {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    return true;
  } catch (e) {
    console.error("uploadAffiliateAsset ensureDir:", e.message);
    return false;
  }
}

const storage = multer.diskStorage({
  destination(req, file, cb) {
    if (!ensureDir()) return cb(new Error("Upload directory unavailable."));
    cb(null, UPLOADS_DIR);
  },
  filename(req, file, cb) {
    const ext = path.extname(file.originalname || "").toLowerCase() || ".bin";
    const hex = crypto.randomBytes(8).toString("hex");
    cb(null, `aff-${Date.now()}-${hex}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_SIZE },
  fileFilter(req, file, cb) {
    const mime = (file.mimetype || "").toLowerCase();
    if (!ALLOWED_MIMES.has(mime)) {
      return cb(new Error("File type not allowed for affiliate assets."));
    }
    cb(null, true);
  },
}).single("file");

function optionalAffiliateAssetUpload(req, res, next) {
  const contentType = (req.headers["content-type"] || "").toLowerCase();
  if (!contentType.includes("multipart/form-data")) return next();
  upload(req, res, (err) => {
    if (err) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({ message: "File must be 10MB or smaller." });
      }
      return res.status(400).json({ message: err.message || "Invalid file upload." });
    }
    next();
  });
}

function publicAssetPath(filename) {
  return `/uploads/affiliate-assets/${filename}`;
}

module.exports = {
  optionalAffiliateAssetUpload,
  publicAssetPath,
  UPLOADS_DIR,
};
