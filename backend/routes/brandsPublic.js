const express = require("express");
const { getPublicBrandsForHome } = require("../controllers/admin/brandsController");

const router = express.Router();
router.get("/home", getPublicBrandsForHome);

module.exports = router;
