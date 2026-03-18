-- Brands table for admin CRUD (Website tab) and client accounts dropdown.
-- Run if brands does not exist or to add new columns.

USE jeetowin;

CREATE TABLE IF NOT EXISTS brands (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL UNIQUE,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    available_accounts TINYINT(1) NOT NULL DEFAULT 1 COMMENT 'Show in Accounts dropdown',
    available_home TINYINT(1) NOT NULL DEFAULT 1 COMMENT 'Show on Home',
    sort_order INT NOT NULL DEFAULT 0,
    icon_path VARCHAR(500) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- If table already existed without created_at/updated_at, run:
ALTER TABLE brands ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP AFTER icon_path;
ALTER TABLE brands ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at;

-- If table already existed without other columns, run (skip any that already exist):
ALTER TABLE brands ADD COLUMN available_accounts TINYINT(1) NOT NULL DEFAULT 1 AFTER is_active;
ALTER TABLE brands ADD COLUMN available_home TINYINT(1) NOT NULL DEFAULT 1 AFTER available_accounts;
ALTER TABLE brands ADD COLUMN sort_order INT NOT NULL DEFAULT 0 AFTER available_home;
ALTER TABLE brands ADD COLUMN icon_path VARCHAR(500) NULL AFTER sort_order;

-- ============================================================
-- Delete all brands (run when you want to clear the table)
-- ============================================================
-- USE jeetowin;
-- DELETE FROM brands;
-- ALTER TABLE brands AUTO_INCREMENT = 1;

-- ============================================================
-- Truncate brands table (run when you want to clear the table)
-- ============================================================
-- USE jeetowin;
-- TRUNCATE TABLE brands;

-- ============================================================
-- Drop brands table (run when you want to drop the table)
-- ============================================================
-- USE jeetowin;
-- DROP TABLE brands;