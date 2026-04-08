const express = require("express");
const { getPublicChatWidgetSettings } = require("../controllers/admin/chatWidgetSettingsController");

const router = express.Router();

router.get("/settings", getPublicChatWidgetSettings);

module.exports = router;
