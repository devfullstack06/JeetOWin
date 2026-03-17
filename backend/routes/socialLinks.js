const express = require("express");
const { getPublicSocialLinks } = require("../controllers/admin/socialLinksController");

const router = express.Router();
router.get("/", getPublicSocialLinks);

module.exports = router;
