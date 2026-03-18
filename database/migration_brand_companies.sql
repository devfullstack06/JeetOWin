-- Brand companies (Master/Affiliate) for admin Brands > Master tab.
-- Links a username to a brand with type (master/affiliate), URL, and status.

USE jeetowin;

CREATE TABLE IF NOT EXISTS brand_companies (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(150) NOT NULL,
    brand_id INT NOT NULL,
    type VARCHAR(20) NOT NULL DEFAULT 'master' COMMENT 'master | affiliate',
    website_url VARCHAR(500) NULL COMMENT 'for type=master',
    affiliate_link VARCHAR(1000) NULL COMMENT 'for type=affiliate',
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    notes TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_brand_companies_brand FOREIGN KEY (brand_id) REFERENCES brands(id) ON DELETE CASCADE,
    INDEX idx_brand_companies_username (username),
    INDEX idx_brand_companies_brand_id (brand_id),
    INDEX idx_brand_companies_type (type),
    INDEX idx_brand_companies_active (is_active)
);
