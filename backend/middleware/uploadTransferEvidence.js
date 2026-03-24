/**
 * Multer for transfer ticket evidence.
 * - optionalTransferRejectEvidenceUpload: optional "evidence" on reject.
 * - optionalTransferApproveEvidenceUpload: required "evidence" on approve (validated in controller).
 */
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

const UPLOADS_DIR = path.join(__dirname, "..", "uploads", "transfer-evidence");
const MAX_SIZE = 10 * 1024 * 1024;

function ensureDir(dir) {
  try {
    fs.mkdirSync(dir, { recursive: true });
    return true;
  } catch (e) {
    console.error("uploadTransferEvidence ensureDir:", e.message);
    return false;
  }
}

function makeStorage() {
  return multer.diskStorage({
    destination(_req, _file, cb) {
      ensureDir(UPLOADS_DIR);
      cb(null, UPLOADS_DIR);
    },
    filename(_req, file, cb) {
      const ext = (file.originalname && path.extname(file.originalname).slice(0, 5)) || ".jpg";
      const safe = /^\.([a-z0-9]+)$/i.test(ext) ? ext : ".jpg";
      const name = `tr-${Date.now()}-${crypto.randomBytes(4).toString("hex")}${safe}`;
      cb(null, name);
    },
  });
}

const fileFilter = (_req, file, cb) => {
  const mime = (file.mimetype || "").toLowerCase();
  if (!mime.startsWith("image/")) return cb(new Error("Only image files are allowed."));
  cb(null, true);
};

const uploadSingleEvidence = multer({
  storage: makeStorage(),
  limits: { fileSize: MAX_SIZE },
  fileFilter,
}).single("evidence");

function optionalTransferRejectEvidenceUpload(req, res, next) {
  const contentType = (req.headers["content-type"] || "").toLowerCase();
  if (!contentType.includes("multipart/form-data")) {
    return next();
  }
  ensureDir(UPLOADS_DIR);
  uploadSingleEvidence(req, res, (err) => {
    if (err) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({ message: "File must be 10MB or smaller." });
      }
      return res.status(400).json({ message: err.message || "Invalid file upload." });
    }
    next();
  });
}

function optionalTransferApproveEvidenceUpload(req, res, next) {
  return optionalTransferRejectEvidenceUpload(req, res, next);
}

function getRelativeEvidencePath(file) {
  if (!file || !file.filename) return null;
  return `/uploads/transfer-evidence/${file.filename}`;
}

module.exports = {
  optionalTransferRejectEvidenceUpload,
  optionalTransferApproveEvidenceUpload,
  getRelativeEvidencePath,
  UPLOADS_DIR,
};
