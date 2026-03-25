const multer = require("multer");
const path = require("path");
const fs = require("fs");

const UPLOADS_TRENDING_GAMES = path.join(__dirname, "..", "uploads", "trending-games");
const MAX_SIZE = 3 * 1024 * 1024;
const ALLOWED_MIMES = new Set(["image/jpeg", "image/png", "image/webp"]);

function ensureUploadsTrendingGamesDir() {
  try {
    fs.mkdirSync(UPLOADS_TRENDING_GAMES, { recursive: true });
    return true;
  } catch (e) {
    console.error("uploadTrendingGamesImage ensure dir:", e.message);
    return false;
  }
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_SIZE },
  fileFilter(req, file, cb) {
    const mime = (file.mimetype || "").toLowerCase();
    if (!ALLOWED_MIMES.has(mime)) {
      return cb(new Error("Only JPEG, PNG, or WebP images are allowed."));
    }
    cb(null, true);
  },
}).single("image");

function optionalTrendingGamesImageUpload(req, res, next) {
  const contentType = (req.headers["content-type"] || "").toLowerCase();
  if (!contentType.includes("multipart/form-data")) return next();
  if (!ensureUploadsTrendingGamesDir()) {
    return res.status(500).json({ message: "Failed to prepare uploads directory." });
  }
  upload(req, res, (err) => {
    if (err) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({ message: "Image must be 3MB or smaller." });
      }
      return res.status(400).json({ message: err.message || "Invalid image upload." });
    }
    next();
  });
}

module.exports = {
  optionalTrendingGamesImageUpload,
  UPLOADS_TRENDING_GAMES,
};
