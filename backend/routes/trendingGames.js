const express = require("express");
const { getPublicTrendingGamesItems } = require("../controllers/admin/trendingGamesController");

const router = express.Router();
router.get("/", getPublicTrendingGamesItems);

module.exports = router;
