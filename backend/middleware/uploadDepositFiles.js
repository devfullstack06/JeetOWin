/**
 * Optional multer middleware for deposit slip and evidence uploads.
 * Fields: "slip" (image), "evidence" (image). Both optional. Max 10MB each.
 * Saves to uploads/deposit-slips/ and uploads/deposit-evidence/ with unique filenames.
 */
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

const UPLOADS_SLIPS = path.join(__dirname, "..", "uploads", "deposit-slips");
const UPLOADS_EVIDENCE = path.join(__dirname, "..", "uploads", "deposit-evidence");
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

function ensureDir(dir) {
  try {
    fs.mkdirSync(dir, { recursive: true });
    return true;
  } catch (e) {
    console.error("uploadDepositFiles ensureDir:", e.message);
    return false;
  }
}

const storage = multer.diskStorage({
  destination(req, file, cb) {
    const dir = file.fieldname === "evidence" ? UPLOADS_EVIDENCE : UPLOADS_SLIPS;
    ensureDir(dir);
    cb(null, dir);
  },
  filename(req, file, cb) {
    const ext = (file.originalname && path.extname(file.originalname).slice(0, 5)) || ".jpg";
    const safe = /^\.([a-z0-9]+)$/i.test(ext) ? ext : ".jpg";
    const name = `dep-${Date.now()}-${crypto.randomBytes(4).toString("hex")}${safe}`;
    cb(null, name);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_SIZE },
  fileFilter(req, file, cb) {
    const mime = (file.mimetype || "").toLowerCase();
    const ok = mime.startsWith("image/");
    if (!ok) return cb(new Error("Only image files are allowed."));
    cb(null, true);
  },
}).fields([
  { name: "slip", maxCount: 1 },
  { name: "evidence", maxCount: 1 },
]);

function optionalDepositFilesUpload(req, res, next) {
  const contentType = (req.headers["content-type"] || "").toLowerCase();
  if (!contentType.includes("multipart/form-data")) {
    return next();
  }
  ensureDir(UPLOADS_SLIPS);
  ensureDir(UPLOADS_EVIDENCE);
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

/**
 * After upload, req.files.slip[0] and req.files.evidence[0] have .path (full path) and .filename.
 * We store relative path like /uploads/deposit-slips/filename for DB.
 */
function getRelativeSlipPath(file) {
  if (!file || !file.filename) return null;
  return `/uploads/deposit-slips/${file.filename}`;
}

function getRelativeEvidencePath(file) {
  if (!file || !file.filename) return null;
  return `/uploads/deposit-evidence/${file.filename}`;
}

module.exports = {
  optionalDepositFilesUpload,
  getRelativeSlipPath,
  getRelativeEvidencePath,
  UPLOADS_SLIPS,
  UPLOADS_EVIDENCE,
};
