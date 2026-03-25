const express = require("express");
const { getPublicTopSportsItems } = require("../controllers/admin/topSportsController");

const router = express.Router();
router.get("/", getPublicTopSportsItems);

module.exports = router;
