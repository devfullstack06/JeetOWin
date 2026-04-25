-- Admin notification groups: broadcast segments with client membership.
-- Run against your JeetOWin database (same as other migration_*.sql files).

USE jeetowin;

CREATE TABLE IF NOT EXISTS notification_groups (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_notification_groups_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS notification_group_members (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  group_id INT UNSIGNED NOT NULL,
  user_id INT NOT NULL COMMENT 'users.id (client role); must match users.id signed INT',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_group_member (group_id, user_id),
  KEY idx_ngm_user (user_id),
  KEY idx_ngm_group (group_id),
  CONSTRAINT fk_ngm_group FOREIGN KEY (group_id) REFERENCES notification_groups (id) ON DELETE CASCADE,
  CONSTRAINT fk_ngm_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
