-- Home page main banner carousel (jw-homeBannerCol / HomeBanner).
-- Admin uploads desktop + optional mobile image per slide; title shows in carousel controls.

USE jeetowin;

CREATE TABLE IF NOT EXISTS home_banner_slides (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(200) NOT NULL DEFAULT '',
  image_desktop_path VARCHAR(255) NOT NULL COMMENT 'e.g. /uploads/home-banners/hb-....jpg',
  image_mobile_path VARCHAR(255) NULL COMMENT 'optional; falls back to desktop on client',
  sort_order INT NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
