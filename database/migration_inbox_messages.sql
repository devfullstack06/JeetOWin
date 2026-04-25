-- Admin inbox messages + client inbox tab (parallel to announcements; separate tables).
-- Run after: migration_announcements.sql (or same deps: users, roles, notification_groups, general_entry_sequences).
-- Public ids: first sent message is IBX569000 (last_number increments before read).

USE jeetowin;

INSERT IGNORE INTO general_entry_sequences (series, last_number) VALUES
  ('IBX', 568999);

CREATE TABLE IF NOT EXISTS inbox_messages (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  public_id VARCHAR(32) NOT NULL COMMENT 'IBX + sequence',
  title VARCHAR(500) NOT NULL,
  body_markdown MEDIUMTEXT NOT NULL,
  audience_mode ENUM('all','custom') NOT NULL,
  status ENUM('scheduled','sent') NOT NULL,
  timezone VARCHAR(100) NOT NULL DEFAULT 'Asia/Karachi',
  scheduled_at_utc DATETIME NULL,
  sent_at DATETIME NULL,
  audience_count INT UNSIGNED NOT NULL DEFAULT 0,
  created_by_user_id INT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_inbox_messages_public_id (public_id),
  KEY idx_inbox_messages_status (status),
  KEY idx_inbox_messages_scheduled (status, scheduled_at_utc),
  KEY idx_inbox_messages_sent_at (sent_at),
  CONSTRAINT fk_inbox_msg_created_by FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS inbox_audience_rows (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  inbox_message_id BIGINT UNSIGNED NOT NULL,
  band ENUM('brand','wallet','member') NOT NULL,
  group_id BIGINT UNSIGNED NOT NULL,
  KEY idx_iar_msg (inbox_message_id),
  CONSTRAINT fk_iar_msg FOREIGN KEY (inbox_message_id) REFERENCES inbox_messages(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS inbox_excluded_users (
  inbox_message_id BIGINT UNSIGNED NOT NULL,
  user_id INT NOT NULL,
  PRIMARY KEY (inbox_message_id, user_id),
  KEY idx_ieu_user (user_id),
  CONSTRAINT fk_ieu_msg FOREIGN KEY (inbox_message_id) REFERENCES inbox_messages(id) ON DELETE CASCADE,
  CONSTRAINT fk_ieu_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS inbox_images (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  inbox_message_id BIGINT UNSIGNED NOT NULL,
  sort_order SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  path VARCHAR(500) NOT NULL,
  original_name VARCHAR(255) NULL,
  mime VARCHAR(120) NULL,
  size_bytes INT UNSIGNED NULL,
  KEY idx_ii_msg (inbox_message_id),
  CONSTRAINT fk_ii_msg FOREIGN KEY (inbox_message_id) REFERENCES inbox_messages(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS inbox_recipients (
  inbox_message_id BIGINT UNSIGNED NOT NULL,
  user_id INT NOT NULL,
  PRIMARY KEY (inbox_message_id, user_id),
  KEY idx_ir_user (user_id),
  CONSTRAINT fk_ir_msg FOREIGN KEY (inbox_message_id) REFERENCES inbox_messages(id) ON DELETE CASCADE,
  CONSTRAINT fk_ir_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS inbox_reads (
  inbox_message_id BIGINT UNSIGNED NOT NULL,
  user_id INT NOT NULL,
  read_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (inbox_message_id, user_id),
  KEY idx_ireads_user (user_id),
  CONSTRAINT fk_ireads_msg FOREIGN KEY (inbox_message_id) REFERENCES inbox_messages(id) ON DELETE CASCADE,
  CONSTRAINT fk_ireads_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
