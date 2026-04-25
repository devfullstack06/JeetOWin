const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

const UPLOADS_ANNOUNCEMENTS = path.join(__dirname, "..", "uploads", "announcements");
/** Per-image cap (announcements create modal: max 10 images, 25MB combined). */
const MAX_FILE_SIZE = Math.floor(2.5 * 1024 * 1024);

function ensureDir() {
  try {
    fs.mkdirSync(UPLOADS_ANNOUNCEMENTS, { recursive: true });
  } catch (e) {
    console.error("ensure announcements upload dir:", e.message);
  }
}

const storage = multer.diskStorage({
  destination(req, file, cb) {
    ensureDir();
    cb(null, UPLOADS_ANNOUNCEMENTS);
  },
  filename(req, file, cb) {
    const ext = (path.extname(file.originalname || "").toLowerCase() || ".jpg").slice(0, 8);
    const safeExt = /^\.([a-z0-9]+)$/i.test(ext) ? ext : ".jpg";
    cb(null, `ann-${Date.now()}-${crypto.randomBytes(4).toString("hex")}${safeExt}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE, files: 10 },
  fileFilter(req, file, cb) {
    const mime = String(file.mimetype || "").toLowerCase();
    if (!mime.startsWith("image/")) return cb(new Error("Only image files are allowed."));
    cb(null, true);
  },
}).array("images", 10);

function uploadAnnouncementImages(req, res, next) {
  const contentType = String(req.headers["content-type"] || "").toLowerCase();
  if (!contentType.includes("multipart/form-data")) {
    return res.status(400).json({ message: "Use multipart/form-data to upload images." });
  }
  upload(req, res, (err) => {
    if (err) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({ message: "Each image must be 2.5MB or smaller." });
      }
      return res.status(400).json({ message: err.message || "Invalid upload." });
    }
    next();
  });
}

module.exports = {
  uploadAnnouncementImages,
  UPLOADS_ANNOUNCEMENTS,
};
