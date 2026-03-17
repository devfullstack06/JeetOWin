-- Social links for footer and contact us (jw-footerSocial, jw-contactList).
-- Admin manages name, url, availability, sort order, icon.

USE jeetowin;

CREATE TABLE IF NOT EXISTS social_links (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  url VARCHAR(500) NOT NULL DEFAULT '',
  available_footer TINYINT(1) NOT NULL DEFAULT 1,
  available_contact_us TINYINT(1) NOT NULL DEFAULT 1,
  sort_order INT NOT NULL DEFAULT 0,
  icon_path VARCHAR(255) NULL COMMENT 'e.g. /uploads/social/facebook.svg',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
