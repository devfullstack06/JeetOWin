-- Mock role, mock_users, and leaderboard_mock_entries (per-transaction lines).
-- Run on jeetowin. Replaces legacy leaderboard_mock_entries if it existed without mock_users.
--
-- After deploy: mock leaderboard data is isolated from users / general_entries.

USE jeetowin;

-- 1) Role for mock user records (not used for login; FK on mock_users)
INSERT IGNORE INTO roles (name) VALUES ('mock');

-- 2) mock_users: reserved mock identities (signup blocks same username as users)
CREATE TABLE IF NOT EXISTS mock_users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(150) NOT NULL COMMENT 'Trimmed; unique case-insensitive via collation',
  role_id INT NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_mock_users_username (username),
  KEY idx_mock_users_active (is_active),
  CONSTRAINT fk_mock_users_role FOREIGN KEY (role_id) REFERENCES roles(id)
) ENGINE=InnoDB;

-- Bind mock_users.role_id to roles.name = 'mock'
SET @mock_role_id = (SELECT id FROM roles WHERE name = 'mock' LIMIT 1);

-- 3) Replace old leaderboard_mock_entries if present (dev / single-node)
DROP TABLE IF EXISTS leaderboard_mock_entries;

CREATE TABLE leaderboard_mock_entries (
  id INT AUTO_INCREMENT PRIMARY KEY,
  mock_user_id INT NOT NULL,
  is_mock TINYINT(1) NOT NULL DEFAULT 1 COMMENT 'Manual mock rows are always 1',
  entry_type ENUM('deposit', 'transfer_out') NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  balance_after DECIMAL(15,2) NOT NULL,
  entry_date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_lbe_mock_user (mock_user_id),
  KEY idx_lbe_entry_date (entry_date),
  KEY idx_lbe_type (entry_type),
  CONSTRAINT fk_lbe_mock_user FOREIGN KEY (mock_user_id) REFERENCES mock_users(id) ON DELETE RESTRICT
) ENGINE=InnoDB;
