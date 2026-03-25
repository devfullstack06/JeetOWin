/**
 * Optional multer for home banner slides: fields imageDesktop, imageMobile (JPEG/PNG/WebP, 3MB each).
 */
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const UPLOADS_HOME_BANNERS = path.join(__dirname, "..", "uploads", "home-banners");
const MAX_SIZE = 3 * 1024 * 1024;

const ALLOWED_MIMES = new Set(["image/jpeg", "image/png", "image/webp"]);
const ALLOWED_LOGIN_BANNER_MIMES = new Set(["image/jpeg", "image/jpg", "image/pjpeg"]);

function ensureUploadsHomeBannersDir() {
  try {
    fs.mkdirSync(UPLOADS_HOME_BANNERS, { recursive: true });
    return true;
  } catch (e) {
    console.error("uploadHomeBannerImages ensure dir:", e.message);
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
      return cb(new Error("Only JPEG, PNG, or WebP images are allowed."));
    }
    cb(null, true);
  },
}).fields([
  { name: "imageDesktop", maxCount: 1 },
  { name: "imageMobile", maxCount: 1 },
]);

function optionalHomeBannerImagesUpload(req, res, next) {
  const contentType = (req.headers["content-type"] || "").toLowerCase();
  if (!contentType.includes("multipart/form-data")) {
    return next();
  }
  if (!ensureUploadsHomeBannersDir()) {
    return res.status(500).json({ message: "Failed to prepare uploads directory." });
  }
  upload(req, res, (err) => {
    if (err) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({ message: "Each image must be 3MB or smaller." });
      }
      return res.status(400).json({ message: err.message || "Invalid image upload." });
    }
    next();
  });
}

module.exports = {
  optionalHomeBannerImagesUpload,
  UPLOADS_HOME_BANNERS,
};

const uploadLoginBanners = multer({
  storage,
  limits: { fileSize: MAX_SIZE },
  fileFilter(req, file, cb) {
    const mime = (file.mimetype || "").toLowerCase();
    if (!ALLOWED_LOGIN_BANNER_MIMES.has(mime)) {
      return cb(new Error("Login banners must be JPEG/JPG images."));
    }
    cb(null, true);
  },
}).fields([
  { name: "loginDesktop", maxCount: 1 },
  { name: "loginMobile", maxCount: 1 },
]);

function optionalLoginBannerImagesUpload(req, res, next) {
  const contentType = (req.headers["content-type"] || "").toLowerCase();
  if (!contentType.includes("multipart/form-data")) return next();
  uploadLoginBanners(req, res, (err) => {
    if (err) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({ message: "Each image must be 3MB or smaller." });
      }
      return res.status(400).json({ message: err.message || "Invalid login banner upload." });
    }
    next();
  });
}

module.exports.optionalLoginBannerImagesUpload = optionalLoginBannerImagesUpload;
