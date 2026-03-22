/**
 * Multer middleware for withdraw ticket uploads.
 * - optionalWithdrawEvidenceUpload: "evidence" (image) for reject. Optional. Max 10MB.
 * - optionalWithdrawApproveFilesUpload: "slip" and "evidence" for approve. Slip optional, evidence required.
 */
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

const UPLOADS_EVIDENCE = path.join(__dirname, "..", "uploads", "withdraw-evidence");
const UPLOADS_SLIPS = path.join(__dirname, "..", "uploads", "withdraw-slips");
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

function ensureDir(dir) {
  try {
    fs.mkdirSync(dir, { recursive: true });
    return true;
  } catch (e) {
    console.error("uploadWithdrawEvidence ensureDir:", e.message);
    return false;
  }
}

function makeStorage(dir) {
  return multer.diskStorage({
    destination(_req, _file, cb) {
      ensureDir(dir);
      cb(null, dir);
    },
    filename(_req, file, cb) {
      const ext = (file.originalname && path.extname(file.originalname).slice(0, 5)) || ".jpg";
      const safe = /^\.([a-z0-9]+)$/i.test(ext) ? ext : ".jpg";
      const name = `wd-${Date.now()}-${crypto.randomBytes(4).toString("hex")}${safe}`;
      cb(null, name);
    },
  });
}

const fileFilter = (_req, file, cb) => {
  const mime = (file.mimetype || "").toLowerCase();
  const ok = mime.startsWith("image/");
  if (!ok) return cb(new Error("Only image files are allowed."));
  cb(null, true);
};

const uploadSingleEvidence = multer({
  storage: makeStorage(UPLOADS_EVIDENCE),
  limits: { fileSize: MAX_SIZE },
  fileFilter,
}).single("evidence");

const uploadApproveFiles = multer({
  storage: multer.diskStorage({
    destination(_req, file, cb) {
      const dir = file.fieldname === "evidence" ? UPLOADS_EVIDENCE : UPLOADS_SLIPS;
      ensureDir(dir);
      cb(null, dir);
    },
    filename(_req, file, cb) {
      const ext = (file.originalname && path.extname(file.originalname).slice(0, 5)) || ".jpg";
      const safe = /^\.([a-z0-9]+)$/i.test(ext) ? ext : ".jpg";
      const name = `wd-${Date.now()}-${crypto.randomBytes(4).toString("hex")}${safe}`;
      cb(null, name);
    },
  }),
  limits: { fileSize: MAX_SIZE },
  fileFilter,
}).fields([
  { name: "slip", maxCount: 1 },
  { name: "evidence", maxCount: 1 },
]);

function optionalWithdrawEvidenceUpload(req, res, next) {
  const contentType = (req.headers["content-type"] || "").toLowerCase();
  if (!contentType.includes("multipart/form-data")) {
    return next();
  }
  ensureDir(UPLOADS_EVIDENCE);
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

function getRelativeEvidencePath(file) {
  if (!file || !file.filename) return null;
  return `/uploads/withdraw-evidence/${file.filename}`;
}

function getRelativeSlipPath(file) {
  if (!file || !file.filename) return null;
  return `/uploads/withdraw-slips/${file.filename}`;
}

function optionalWithdrawApproveFilesUpload(req, res, next) {
  const contentType = (req.headers["content-type"] || "").toLowerCase();
  if (!contentType.includes("multipart/form-data")) {
    return next();
  }
  ensureDir(UPLOADS_SLIPS);
  ensureDir(UPLOADS_EVIDENCE);
  uploadApproveFiles(req, res, (err) => {
    if (err) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({ message: "File must be 10MB or smaller." });
      }
      return res.status(400).json({ message: err.message || "Invalid file upload." });
    }
    next();
  });
}

module.exports = {
  optionalWithdrawEvidenceUpload,
  optionalWithdrawApproveFilesUpload,
  getRelativeEvidencePath,
  getRelativeSlipPath,
  UPLOADS_EVIDENCE,
  UPLOADS_SLIPS,
};
