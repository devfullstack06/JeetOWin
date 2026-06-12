-- Client referral program (3-tier, TRI/TRO basis). Idempotent where possible.
USE jeetowin;

-- =========================
-- CLIENT REFERRAL COLUMNS
-- =========================
SET @col := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'clients' AND COLUMN_NAME = 'referred_by_client_id');
SET @sql := IF(@col = 0,
  'ALTER TABLE clients ADD COLUMN referred_by_client_id INT NULL AFTER partner_id,
   ADD INDEX idx_clients_referred_by (referred_by_client_id)',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'clients' AND COLUMN_NAME = 'referral_code');
SET @sql := IF(@col = 0,
  'ALTER TABLE clients ADD COLUMN referral_code VARCHAR(50) NULL AFTER referred_by_client_id',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'clients' AND COLUMN_NAME = 'referrer_status');
SET @sql := IF(@col = 0,
  "ALTER TABLE clients ADD COLUMN referrer_status ENUM('active','disabled') NOT NULL DEFAULT 'active' AFTER referral_code",
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'clients' AND COLUMN_NAME = 'referrer_stop_accruals');
SET @sql := IF(@col = 0,
  'ALTER TABLE clients ADD COLUMN referrer_stop_accruals TINYINT(1) NOT NULL DEFAULT 0 COMMENT ''1=stop new accruals when disabled'' AFTER referrer_status',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'clients' AND COLUMN_NAME = 'referrer_tier1_rate');
SET @sql := IF(@col = 0,
  'ALTER TABLE clients ADD COLUMN referrer_tier1_rate DECIMAL(6,3) NULL AFTER referrer_stop_accruals,
   ADD COLUMN referrer_tier2_rate DECIMAL(6,3) NULL AFTER referrer_tier1_rate,
   ADD COLUMN referrer_tier3_rate DECIMAL(6,3) NULL AFTER referrer_tier2_rate',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @idx := (SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'clients' AND INDEX_NAME = 'uq_clients_referral_code');
SET @sql := IF(@idx = 0,
  'ALTER TABLE clients ADD UNIQUE INDEX uq_clients_referral_code (referral_code)',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- FK for referred_by (optional — skip if fails on existing bad data)
-- ALTER TABLE clients ADD CONSTRAINT fk_clients_referred_by FOREIGN KEY (referred_by_client_id) REFERENCES clients(id);

-- =========================
-- PROGRAM SETTINGS (singleton)
-- =========================
CREATE TABLE IF NOT EXISTS referral_program_settings (
  id INT NOT NULL PRIMARY KEY DEFAULT 1,
  is_enabled TINYINT(1) NOT NULL DEFAULT 0,
  tier1_rate DECIMAL(6,3) NOT NULL DEFAULT 2.000,
  tier2_rate DECIMAL(6,3) NOT NULL DEFAULT 0.700,
  tier3_rate DECIMAL(6,3) NOT NULL DEFAULT 0.300,
  negative_release_mode ENUM('deduct_wallet','postpone') NOT NULL DEFAULT 'postpone',
  allow_negative_deduct_wallet TINYINT(1) NOT NULL DEFAULT 1,
  allow_negative_postpone TINYINT(1) NOT NULL DEFAULT 1,
  share_url_template VARCHAR(500) NOT NULL DEFAULT 'https://www.jeetowin.com/signup?ref={code}',
  accrual_start_month CHAR(7) NULL COMMENT 'YYYY-MM Karachi; first month eligible for accrual',
  overview_lead VARCHAR(500) NOT NULL DEFAULT 'Invite friends and earn lifetime rewards.',
  overview_info TEXT NULL,
  details_modal_title VARCHAR(255) NOT NULL DEFAULT 'Referral program details',
  details_modal_body TEXT NULL,
  step1_title VARCHAR(255) NOT NULL DEFAULT 'Send an invitation',
  step1_subtitle VARCHAR(255) NOT NULL DEFAULT 'to start your referral journey',
  step2_title VARCHAR(255) NOT NULL DEFAULT 'Let friend register',
  step2_subtitle VARCHAR(255) NOT NULL DEFAULT 'then transfer to brands',
  step3_title VARCHAR(255) NOT NULL DEFAULT 'Start earning for lifetime',
  step3_subtitle VARCHAR(255) NOT NULL DEFAULT 'without doing a thing',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT chk_referral_settings_singleton CHECK (id = 1)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT IGNORE INTO referral_program_settings (id) VALUES (1);

-- =========================
-- BRAND INCLUDE / EXCLUDE RULES
-- =========================
CREATE TABLE IF NOT EXISTS referral_brand_rules (
  id INT AUTO_INCREMENT PRIMARY KEY,
  scope ENUM('global','client') NOT NULL,
  client_id INT NULL,
  brand_id INT NOT NULL,
  is_included TINYINT(1) NOT NULL,
  effective_from DATETIME NOT NULL,
  created_by_user_id INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  KEY idx_rbr_scope_brand (scope, brand_id, effective_from),
  KEY idx_rbr_client_brand (client_id, brand_id, effective_from),
  CONSTRAINT fk_rbr_client FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
  CONSTRAINT fk_rbr_brand FOREIGN KEY (brand_id) REFERENCES brands(id) ON DELETE CASCADE,
  CONSTRAINT fk_rbr_admin FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =========================
-- MONTHLY ACCRUALS
-- =========================
CREATE TABLE IF NOT EXISTS referral_accruals (
  id INT AUTO_INCREMENT PRIMARY KEY,
  earner_client_id INT NOT NULL,
  source_client_id INT NOT NULL,
  tier TINYINT NOT NULL,
  accrual_month CHAR(7) NOT NULL COMMENT 'YYYY-MM Karachi',
  transfer_in_total DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  transfer_out_total DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  net_base DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  rate_applied DECIMAL(6,3) NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  status ENUM('pending','released','void') NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_referral_accrual (earner_client_id, source_client_id, tier, accrual_month),
  KEY idx_ra_earner_month (earner_client_id, accrual_month),
  KEY idx_ra_source_month (source_client_id, accrual_month),
  CONSTRAINT fk_ra_earner FOREIGN KEY (earner_client_id) REFERENCES clients(id),
  CONSTRAINT fk_ra_source FOREIGN KEY (source_client_id) REFERENCES clients(id),
  CONSTRAINT chk_ra_tier CHECK (tier BETWEEN 1 AND 3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =========================
-- COMMISSION RELEASES (wallet credit)
-- =========================
CREATE TABLE IF NOT EXISTS referral_releases (
  id INT AUTO_INCREMENT PRIMARY KEY,
  earner_client_id INT NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  negative_handling ENUM('none','deduct_wallet','postpone_offset') NULL,
  note TEXT NULL,
  released_by_user_id INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  KEY idx_rr_earner (earner_client_id, created_at),
  CONSTRAINT fk_rr_earner FOREIGN KEY (earner_client_id) REFERENCES clients(id),
  CONSTRAINT fk_rr_admin FOREIGN KEY (released_by_user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =========================
-- ACCRUAL JOB RUN LOG
-- =========================
CREATE TABLE IF NOT EXISTS referral_accrual_runs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  accrual_month CHAR(7) NOT NULL,
  status ENUM('running','completed','failed') NOT NULL,
  rows_written INT NOT NULL DEFAULT 0,
  error_message TEXT NULL,
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  finished_at TIMESTAMP NULL,
  UNIQUE KEY uq_accrual_run_month (accrual_month)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =========================
-- BACKFILL: partner -> client referrer (Q1=A)
-- =========================
UPDATE clients c
INNER JOIN partners p ON p.id = c.partner_id
INNER JOIN clients c_ref ON c_ref.user_id = p.user_id
SET c.referred_by_client_id = c_ref.id
WHERE c.referred_by_client_id IS NULL
  AND c.id <> c_ref.id;

-- =========================
-- BACKFILL: referral codes for existing clients
-- (JW-USERNAME pattern; collisions get numeric suffix in app on register)
-- =========================
UPDATE clients c
INNER JOIN users u ON u.id = c.user_id
SET c.referral_code = CONCAT('JW-', UPPER(u.username), '-', c.id)
WHERE c.referral_code IS NULL OR TRIM(c.referral_code) = '';
