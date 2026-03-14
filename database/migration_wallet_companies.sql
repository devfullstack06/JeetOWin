-- Wallet companies table for admin CRUD (Companies tab)
-- Run if wallet_companies does not exist yet.

USE jeetowin;

CREATE TABLE IF NOT EXISTS wallet_companies (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL UNIQUE,
    code VARCHAR(50) NULL,
    icon_key VARCHAR(500) NULL,
    icon_svg MEDIUMTEXT NULL COMMENT 'Inline SVG markup',
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- If table already existed without icon_svg, run manually: ALTER TABLE wallet_companies ADD COLUMN icon_svg MEDIUMTEXT NULL AFTER icon_key;
