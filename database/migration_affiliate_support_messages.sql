-- Affiliate support messages (inbound from affiliates → admin)
CREATE TABLE IF NOT EXISTS affiliate_support_messages (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  affiliate_id INT NOT NULL,
  user_id INT NOT NULL,
  message TEXT NOT NULL,
  status ENUM('open', 'replied', 'closed') NOT NULL DEFAULT 'open',
  admin_reply TEXT NULL,
  replied_by_user_id INT NULL,
  replied_at DATETIME NULL,
  inbox_message_id BIGINT UNSIGNED NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_asm_affiliate (affiliate_id),
  KEY idx_asm_status (status),
  KEY idx_asm_created (created_at),
  CONSTRAINT fk_asm_affiliate FOREIGN KEY (affiliate_id) REFERENCES affiliate_profiles(id) ON DELETE CASCADE,
  CONSTRAINT fk_asm_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
