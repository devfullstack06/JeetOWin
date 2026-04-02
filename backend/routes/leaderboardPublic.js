const express = require("express");
const { getPublicLeaderboard } = require("../controllers/publicLeaderboardController");

const router = express.Router();

router.get("/public", getPublicLeaderboard);

module.exports = router;
