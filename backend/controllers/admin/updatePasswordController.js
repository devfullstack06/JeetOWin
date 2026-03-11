const bcrypt = require("bcryptjs");
const { pool } = require("../../config/database");

function validateNewPassword(password) {
  if (!password || typeof password !== "string") {
    return "New password is required.";
  }

  if (password.length < 6) {
    return "New password must be at least 6 characters.";
  }

  if (!/[A-Z]/.test(password)) {
    return "New password must contain at least 1 uppercase letter.";
  }

  if (!/[a-z]/.test(password)) {
    return "New password must contain at least 1 lowercase letter.";
  }

  if (!/[0-9]/.test(password)) {
    return "New password must contain at least 1 number.";
  }

  return "";
}

exports.updateAdminPassword = async (req, res) => {
  try {
    const adminId = req.authUser?.id;
    const currentPassword = String(req.body?.currentPassword || "");
    const newPassword = String(req.body?.newPassword || "");

    if (!adminId) {
      return res.status(401).json({
        message: "Unauthorized. Admin not identified.",
      });
    }

    if (!currentPassword) {
      return res.status(400).json({
        message: "Current password is required.",
      });
    }

    const passwordError = validateNewPassword(newPassword);
    if (passwordError) {
      return res.status(400).json({
        message: passwordError,
      });
    }

    if (currentPassword === newPassword) {
      return res.status(400).json({
        message: "New password must be different from current password.",
      });
    }

    const selectSql = `
      SELECT
        u.id,
        u.username,
        u.email,
        u.password_hash,
        u.status,
        r.name AS role_name
      FROM users u
      INNER JOIN roles r ON r.id = u.role_id
      WHERE u.id = ?
      LIMIT 1
    `;

    const [rows] = await pool.query(selectSql, [adminId]);

    if (!rows || rows.length === 0) {
      return res.status(404).json({
        message: "Admin account not found.",
      });
    }

    const admin = rows[0];

    if (admin.role_name !== "admin") {
      return res.status(403).json({
        message: "Forbidden. Admin account required.",
      });
    }

    if (admin.status !== "active") {
      return res.status(403).json({
        message: "Your account is not active.",
      });
    }

    const storedHash = admin.password_hash || "";
    const isCurrentPasswordValid = await bcrypt.compare(
      currentPassword,
      storedHash
    );

    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        message: "Current password is incorrect.",
      });
    }

    const newHash = await bcrypt.hash(newPassword, 10);

    const updateSql = `
      UPDATE users
      SET password_hash = ?
      WHERE id = ?
      LIMIT 1
    `;

    await pool.query(updateSql, [newHash, adminId]);

    return res.status(200).json({
      message: "Password updated successfully.",
    });
  } catch (err) {
    console.error("updateAdminPassword error:", err);
    return res.status(500).json({
      message: "Something went wrong while updating password.",
    });
  }
};