-- Admin announcements + client inbox (full stack).
-- Run after: users, roles, brands, wallet_companies, notification_groups, notification_group_members,
-- client_accounts, clients, client_wallets, general_entry_sequences.
-- Adds ANM… public ids (same counter pattern as PWT/DP).

USE jeetowin;

INSERT IGNORE INTO general_entry_sequences (series, last_number) VALUES
  ('ANM', 569000);

CREATE TABLE IF NOT EXISTS announcements (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  public_id VARCHAR(32) NOT NULL COMMENT 'ANM + sequence, unique display id',
  title VARCHAR(500) NOT NULL,
  body_markdown MEDIUMTEXT NOT NULL,
  audience_mode ENUM('all','custom') NOT NULL,
  status ENUM('scheduled','sent') NOT NULL,
  timezone VARCHAR(100) NOT NULL DEFAULT 'Asia/Karachi',
  scheduled_at_utc DATETIME NULL COMMENT 'UTC wall time when message becomes sendable; NULL if sent on create',
  sent_at DATETIME NULL,
  audience_count INT UNSIGNED NOT NULL DEFAULT 0,
  created_by_user_id INT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_announcements_public_id (public_id),
  KEY idx_announcements_status (status),
  KEY idx_announcements_scheduled (status, scheduled_at_utc),
  KEY idx_announcements_sent_at (sent_at),
  CONSTRAINT fk_ann_created_by FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS announcement_audience_rows (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  announcement_id BIGINT UNSIGNED NOT NULL,
  band ENUM('brand','wallet','member') NOT NULL,
  group_id BIGINT UNSIGNED NOT NULL COMMENT 'brands.id | wallet_companies.id | notification_groups.id by band',
  KEY idx_aar_ann (announcement_id),
  CONSTRAINT fk_aar_ann FOREIGN KEY (announcement_id) REFERENCES announcements(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS announcement_excluded_users (
  announcement_id BIGINT UNSIGNED NOT NULL,
  user_id INT NOT NULL,
  PRIMARY KEY (announcement_id, user_id),
  KEY idx_aeu_user (user_id),
  CONSTRAINT fk_aeu_ann FOREIGN KEY (announcement_id) REFERENCES announcements(id) ON DELETE CASCADE,
  CONSTRAINT fk_aeu_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS announcement_images (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  announcement_id BIGINT UNSIGNED NOT NULL,
  sort_order SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  path VARCHAR(500) NOT NULL COMMENT 'URL path e.g. /uploads/announcements/…',
  original_name VARCHAR(255) NULL,
  mime VARCHAR(120) NULL,
  size_bytes INT UNSIGNED NULL,
  KEY idx_ai_ann (announcement_id),
  CONSTRAINT fk_ai_ann FOREIGN KEY (announcement_id) REFERENCES announcements(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS announcement_recipients (
  announcement_id BIGINT UNSIGNED NOT NULL,
  user_id INT NOT NULL,
  PRIMARY KEY (announcement_id, user_id),
  KEY idx_ar_user (user_id),
  CONSTRAINT fk_ar_ann FOREIGN KEY (announcement_id) REFERENCES announcements(id) ON DELETE CASCADE,
  CONSTRAINT fk_ar_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS announcement_reads (
  announcement_id BIGINT UNSIGNED NOT NULL,
  user_id INT NOT NULL,
  read_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (announcement_id, user_id),
  KEY idx_areads_user (user_id),
  CONSTRAINT fk_areads_ann FOREIGN KEY (announcement_id) REFERENCES announcements(id) ON DELETE CASCADE,
  CONSTRAINT fk_areads_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
