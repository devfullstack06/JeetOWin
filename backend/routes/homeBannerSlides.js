const express = require("express");
const { getPublicHomeBannerSlides, getPublicLoginBanners } = require("../controllers/admin/homeBannerSlidesController");

const router = express.Router();
router.get("/", getPublicHomeBannerSlides);
router.get("/login-banners", getPublicLoginBanners);

module.exports = router;
