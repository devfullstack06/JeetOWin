const express = require("express");
const requireAdminAuth = require("../middleware/requireAdminAuth");
const {
  updateAdminPassword,
} = require("../controllers/admin/updatePasswordController");
const {
  getAdminUsers,
  updateAdminUser,
} = require("../controllers/admin/usersController");

const router = express.Router();

router.post("/update-password", requireAdminAuth, updateAdminPassword);
router.get("/users", requireAdminAuth, getAdminUsers);
router.patch("/users/:id", requireAdminAuth, updateAdminUser);

module.exports = router;