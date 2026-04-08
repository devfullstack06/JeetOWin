const express = require("express");
const { getPublicChatWidgetSettings } = require("../controllers/admin/chatWidgetSettingsController");
const { captureChatWidgetWebhook } = require("../controllers/admin/chatWidgetEventsController");

const router = express.Router();

router.get("/settings", getPublicChatWidgetSettings);
router.post("/webhook", captureChatWidgetWebhook);

module.exports = router;
