/**
 * Optional multer middleware for wallet company icon upload.
 * Only runs when Content-Type is multipart/form-data (file field name: "icon").
 * Restrictions: MIME image/svg+xml, max 200KB, unique filename in memory.
 */
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

const UPLOADS_WALLETS = path.join(__dirname, "..", "uploads", "wallets");
const MAX_SIZE = 2048 * 1024; // 200KB

function ensureUploadsWalletsDir() {
  try {
    fs.mkdirSync(UPLOADS_WALLETS, { recursive: true });
    return true;
  } catch (e) {
    console.error("uploadWalletIcon ensureUploadsWalletsDir:", e.message);
    return false;
  }
}

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: MAX_SIZE },
  fileFilter(req, file, cb) {
    const mime = (file.mimetype || "").toLowerCase();
    if (mime !== "image/svg+xml") {
      return cb(new Error("Only image/svg+xml is allowed."));
    }
    cb(null, true);
  },
}).single("icon");

/**
 * Run multer only for multipart/form-data; otherwise next() so JSON body works.
 */
function optionalWalletIconUpload(req, res, next) {
  const contentType = (req.headers["content-type"] || "").toLowerCase();
  if (!contentType.includes("multipart/form-data")) {
    return next();
  }
  ensureUploadsWalletsDir();
  upload(req, res, (err) => {
    if (err) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({ message: "Icon file must be 200KB or smaller." });
      }
      return res.status(400).json({ message: err.message || "Invalid icon upload." });
    }
    next();
  });
}

/**
 * Generate a unique filename for wallet icon (without path).
 */
function uniqueWalletIconFilename(prefix = "icon") {
  const slug = String(prefix).replace(/[^a-z0-9-]/gi, "-").replace(/-+/g, "-").slice(0, 24) || "icon";
  const hex = crypto.randomBytes(4).toString("hex");
  return `${slug}-${Date.now()}-${hex}.svg`;
}

module.exports = {
  optionalWalletIconUpload,
  uniqueWalletIconFilename,
  UPLOADS_WALLETS,
};
