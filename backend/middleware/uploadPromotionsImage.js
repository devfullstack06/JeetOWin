const multer = require("multer");
const path = require("path");
const fs = require("fs");
const sharp = require("sharp");

const UPLOADS_PROMOTIONS = path.join(__dirname, "..", "uploads", "promotions");
const MAX_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_MIMES = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);

function ensureUploadsPromotionsDir() {
  try {
    fs.mkdirSync(UPLOADS_PROMOTIONS, { recursive: true });
    return true;
  } catch (e) {
    console.error("uploadPromotionsImage ensure dir:", e.message);
    return false;
  }
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_SIZE },
  fileFilter(req, file, cb) {
    const mime = String(file.mimetype || "").toLowerCase();
    if (!ALLOWED_MIMES.has(mime)) {
      return cb(new Error("Only JPEG, PNG, WebP, or AVIF images are allowed."));
    }
    cb(null, true);
  },
}).single("image");

async function validatePromotionImageAspect(file) {
  if (!file || !file.buffer || !Buffer.isBuffer(file.buffer)) {
    return { ok: false, message: "Image file is required." };
  }
  try {
    const meta = await sharp(file.buffer).metadata();
    const w = Number(meta.width || 0);
    const h = Number(meta.height || 0);
    if (!w || !h) return { ok: false, message: "Invalid image dimensions." };
    if (w !== h) {
      return { ok: false, message: "Image must be 1:1 aspect ratio (square)." };
    }
    return { ok: true, width: w, height: h };
  } catch {
    return { ok: false, message: "Failed to read image dimensions." };
  }
}

function optionalPromotionImageUpload(req, res, next) {
  const contentType = String(req.headers["content-type"] || "").toLowerCase();
  if (!contentType.includes("multipart/form-data")) return next();
  if (!ensureUploadsPromotionsDir()) {
    return res.status(500).json({ message: "Failed to prepare uploads directory." });
  }
  upload(req, res, async (err) => {
    if (err) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({ message: "Image must be 2MB or smaller." });
      }
      return res.status(400).json({ message: err.message || "Invalid image upload." });
    }
    if (req.file) {
      const check = await validatePromotionImageAspect(req.file);
      if (!check.ok) return res.status(400).json({ message: check.message });
    }
    next();
  });
}

module.exports = {
  optionalPromotionImageUpload,
  validatePromotionImageAspect,
  UPLOADS_PROMOTIONS,
};
