-- Affiliate Program module (separate from client referral program).
-- Idempotent where possible. Run after: schema, users, roles, clients, wallet_companies, referral_program_settings.

USE jeetowin;

-- =========================
-- AFFILIATE ROLE
-- =========================
INSERT IGNORE INTO roles (name) VALUES ('affiliate');

-- =========================
-- COMMISSION PLANS
-- =========================
CREATE TABLE IF NOT EXISTS affiliate_commission_plans (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  commission_percent DECIMAL(6,3) NOT NULL DEFAULT 10.000,
  status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_affiliate_plan_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT IGNORE INTO affiliate_commission_plans (id, name, commission_percent, status) VALUES
  (1, 'Standard', 10.000, 'active'),
  (2, 'Silver',   12.500, 'active'),
  (3, 'Gold',     15.000, 'active'),
  (4, 'VIP',      20.000, 'active');

-- =========================
-- AFFILIATE PROFILES
-- =========================
CREATE TABLE IF NOT EXISTS affiliate_profiles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  referral_code VARCHAR(50) NOT NULL,
  name VARCHAR(150) NOT NULL,
  email VARCHAR(255) NULL,
  phone VARCHAR(30) NULL,
  country VARCHAR(100) NULL,
  telegram VARCHAR(100) NULL,
  whatsapp VARCHAR(30) NULL,
  plan_id INT NOT NULL DEFAULT 1,
  commission_maturity_days TINYINT UNSIGNED NOT NULL DEFAULT 30 COMMENT '7, 14, or 30 — days until commission becomes withdrawable after period end',
  status ENUM('active', 'suspended', 'pending') NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_affiliate_user (user_id),
  UNIQUE KEY uq_affiliate_referral_code (referral_code),
  KEY idx_affiliate_plan (plan_id),
  KEY idx_affiliate_status (status),
  CONSTRAINT fk_affiliate_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_affiliate_plan FOREIGN KEY (plan_id) REFERENCES affiliate_commission_plans(id),
  CONSTRAINT chk_affiliate_maturity_days CHECK (commission_maturity_days IN (7, 14, 30))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =========================
-- CAMPAIGN TRACKING LINKS
-- =========================
CREATE TABLE IF NOT EXISTS affiliate_campaigns (
  id INT AUTO_INCREMENT PRIMARY KEY,
  affiliate_id INT NOT NULL,
  campaign_name VARCHAR(150) NOT NULL,
  referral_code VARCHAR(50) NOT NULL,
  campaign_key VARCHAR(100) NOT NULL COMMENT 'URL slug e.g. facebook',
  clicks_count INT UNSIGNED NOT NULL DEFAULT 0,
  registrations_count INT UNSIGNED NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_affiliate_campaign_key (affiliate_id, campaign_key),
  KEY idx_ac_affiliate (affiliate_id),
  CONSTRAINT fk_ac_affiliate FOREIGN KEY (affiliate_id) REFERENCES affiliate_profiles(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =========================
-- REFERRED PLAYERS
-- =========================
CREATE TABLE IF NOT EXISTS affiliate_players (
  id INT AUTO_INCREMENT PRIMARY KEY,
  affiliate_id INT NOT NULL,
  client_id INT NOT NULL,
  user_id INT NOT NULL COMMENT 'users.id — matches transfer_tickets.client_id',
  campaign_id INT NULL,
  registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  first_transfer_in_at DATETIME NULL,
  status ENUM('active', 'inactive', 'suspended') NOT NULL DEFAULT 'active',
  UNIQUE KEY uq_affiliate_player_client (client_id),
  UNIQUE KEY uq_affiliate_player_user (user_id),
  KEY idx_ap_affiliate (affiliate_id),
  KEY idx_ap_campaign (campaign_id),
  KEY idx_ap_registered (registered_at),
  CONSTRAINT fk_ap_affiliate FOREIGN KEY (affiliate_id) REFERENCES affiliate_profiles(id) ON DELETE CASCADE,
  CONSTRAINT fk_ap_client FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
  CONSTRAINT fk_ap_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_ap_campaign FOREIGN KEY (campaign_id) REFERENCES affiliate_campaigns(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =========================
-- CLICK TRACKING
-- =========================
CREATE TABLE IF NOT EXISTS affiliate_clicks (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  affiliate_id INT NOT NULL,
  campaign_id INT NULL,
  referral_code VARCHAR(50) NOT NULL,
  ip_hash VARCHAR(64) NULL,
  user_agent VARCHAR(500) NULL,
  landing_url VARCHAR(1000) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  KEY idx_acl_affiliate (affiliate_id, created_at),
  KEY idx_acl_campaign (campaign_id),
  KEY idx_acl_referral (referral_code),
  CONSTRAINT fk_acl_affiliate FOREIGN KEY (affiliate_id) REFERENCES affiliate_profiles(id) ON DELETE CASCADE,
  CONSTRAINT fk_acl_campaign FOREIGN KEY (campaign_id) REFERENCES affiliate_campaigns(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =========================
-- COMMISSION LEDGER
-- =========================
CREATE TABLE IF NOT EXISTS affiliate_commissions (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  affiliate_id INT NOT NULL,
  player_user_id INT NOT NULL COMMENT 'users.id',
  client_id INT NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  transfer_in_total DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  transfer_out_total DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  bonus_paid_total DECIMAL(15,2) NOT NULL DEFAULT 0.00 COMMENT 'v1: always 0 until bonus tracking added',
  net_amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  commission_percent DECIMAL(6,3) NOT NULL,
  commission_amount DECIMAL(15,2) NOT NULL,
  maturity_at DATETIME NOT NULL COMMENT 'When commission becomes withdrawable after admin approval',
  status ENUM('pending', 'approved', 'rejected', 'paid') NOT NULL DEFAULT 'pending',
  remarks TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_affiliate_commission_period (affiliate_id, player_user_id, period_start, period_end),
  KEY idx_affcom_affiliate (affiliate_id, status),
  KEY idx_affcom_player (player_user_id),
  KEY idx_affcom_maturity (status, maturity_at),
  KEY idx_affcom_period (period_start, period_end),
  CONSTRAINT fk_affcom_affiliate FOREIGN KEY (affiliate_id) REFERENCES affiliate_profiles(id) ON DELETE CASCADE,
  CONSTRAINT fk_affcom_player_user FOREIGN KEY (player_user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_affcom_client FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =========================
-- COMMISSION ADJUSTMENTS (admin manual)
-- =========================
CREATE TABLE IF NOT EXISTS affiliate_commission_adjustments (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  commission_id BIGINT UNSIGNED NOT NULL,
  affiliate_id INT NOT NULL,
  adjustment_amount DECIMAL(15,2) NOT NULL,
  reason TEXT NOT NULL,
  admin_user_id INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  KEY idx_affadj_commission (commission_id),
  KEY idx_affadj_affiliate (affiliate_id),
  CONSTRAINT fk_affadj_commission FOREIGN KEY (commission_id) REFERENCES affiliate_commissions(id) ON DELETE CASCADE,
  CONSTRAINT fk_affadj_affiliate FOREIGN KEY (affiliate_id) REFERENCES affiliate_profiles(id) ON DELETE CASCADE,
  CONSTRAINT fk_affadj_admin FOREIGN KEY (admin_user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =========================
-- AFFILIATE WALLETS (payout accounts)
-- =========================
CREATE TABLE IF NOT EXISTS affiliate_wallets (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  affiliate_id INT NOT NULL,
  wallet_company_id BIGINT UNSIGNED NOT NULL,
  account_title VARCHAR(50) NOT NULL,
  account_number VARCHAR(24) NOT NULL,
  status ENUM('active', 'inactive', 'pending_verification', 'verified', 'rejected') NOT NULL DEFAULT 'pending_verification',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_affiliate_wallet_unique (affiliate_id, wallet_company_id, account_number),
  KEY idx_affw_affiliate (affiliate_id),
  KEY idx_affw_company (wallet_company_id),
  KEY idx_affw_status (status),
  CONSTRAINT fk_affw_affiliate FOREIGN KEY (affiliate_id) REFERENCES affiliate_profiles(id) ON DELETE CASCADE,
  CONSTRAINT fk_affw_company FOREIGN KEY (wallet_company_id) REFERENCES wallet_companies(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- =========================
-- WITHDRAWAL REQUESTS
-- =========================
CREATE TABLE IF NOT EXISTS affiliate_withdrawals (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  affiliate_id INT NOT NULL,
  wallet_id BIGINT UNSIGNED NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  status ENUM('pending', 'approved', 'rejected', 'paid') NOT NULL DEFAULT 'pending',
  remarks TEXT NULL,
  admin_user_id INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  paid_at DATETIME NULL,
  KEY idx_affwd_affiliate (affiliate_id, status),
  KEY idx_affwd_status (status, created_at),
  CONSTRAINT fk_affwd_affiliate FOREIGN KEY (affiliate_id) REFERENCES affiliate_profiles(id) ON DELETE CASCADE,
  CONSTRAINT fk_affwd_wallet FOREIGN KEY (wallet_id) REFERENCES affiliate_wallets(id) ON DELETE RESTRICT,
  CONSTRAINT fk_affwd_admin FOREIGN KEY (admin_user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =========================
-- MARKETING ASSETS
-- =========================
CREATE TABLE IF NOT EXISTS affiliate_assets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  type ENUM(
    'banner', 'logo', 'social_image', 'video', 'brand_asset', 'telegram_graphic', 'promotional_text'
  ) NOT NULL,
  file_url VARCHAR(1000) NULL COMMENT 'Uploaded file path or external URL',
  text_content TEXT NULL COMMENT 'Promotional copy for text-type assets',
  status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_affasset_type_status (type, status, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =========================
-- PROGRAM SETTINGS (key-value)
-- =========================
CREATE TABLE IF NOT EXISTS affiliate_settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  setting_key VARCHAR(100) NOT NULL,
  setting_value TEXT NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_affiliate_setting_key (setting_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT IGNORE INTO affiliate_settings (setting_key, setting_value) VALUES
  ('minimum_withdrawal', '1000'),
  ('cookie_days', '30'),
  ('self_referral_allowed', '0'),
  ('commission_delay_days', '30'),
  ('default_commission_plan_id', '1'),
  ('wallet_verification_required', '1'),
  ('support_telegram', ''),
  ('support_whatsapp', ''),
  ('support_email', '');

-- =========================
-- NOTIFICATIONS: affiliate audience on announcements + inbox
-- =========================
SET @col := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'announcements' AND COLUMN_NAME = 'audience_mode'
    AND COLUMN_TYPE LIKE '%affiliates%');
SET @sql := IF(@col = 0,
  "ALTER TABLE announcements MODIFY COLUMN audience_mode ENUM('all','custom','affiliates') NOT NULL",
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'inbox_messages' AND COLUMN_NAME = 'audience_mode'
    AND COLUMN_TYPE LIKE '%affiliates%');
SET @sql := IF(@col = 0,
  "ALTER TABLE inbox_messages MODIFY COLUMN audience_mode ENUM('all','custom','affiliates') NOT NULL",
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
