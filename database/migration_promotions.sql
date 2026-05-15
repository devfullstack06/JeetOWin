-- Promotions + click analytics
-- Status lifecycle: draft, scheduled, active, ended (computed from schedule; Asia/Karachi DATETIME)
-- Visibility flags: is_paused, is_archived (separate from status)

USE jeetowin;

CREATE TABLE IF NOT EXISTS promotions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  title VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  tag VARCHAR(80) NULL,
  image_url VARCHAR(255) NOT NULL,
  button_label VARCHAR(80) NOT NULL DEFAULT 'Read More',
  cta_link VARCHAR(500) NOT NULL,
  open_in_new_tab TINYINT(1) NOT NULL DEFAULT 0,
  cta_mode ENUM('link','popup') NOT NULL DEFAULT 'link',
  details_markdown TEXT NULL,
  placement VARCHAR(50) NOT NULL DEFAULT 'home_rail',
  sort_order INT NOT NULL DEFAULT 0,
  status ENUM('draft','scheduled','active','ended') NOT NULL DEFAULT 'draft',
  is_paused TINYINT(1) NOT NULL DEFAULT 0,
  is_archived TINYINT(1) NOT NULL DEFAULT 0,
  starts_at DATETIME NULL,
  ends_at DATETIME NULL,
  locale VARCHAR(10) NOT NULL DEFAULT 'en',
  created_by_admin_id BIGINT UNSIGNED NULL,
  updated_by_admin_id BIGINT UNSIGNED NULL,
  archived_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_promotions_status (status),
  KEY idx_promotions_placement_status_sort (placement, status, sort_order, id),
  KEY idx_promotions_schedule (starts_at, ends_at),
  KEY idx_promotions_created_by (created_by_admin_id),
  KEY idx_promotions_updated_by (updated_by_admin_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS promotion_click_events (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  promotion_id BIGINT UNSIGNED NOT NULL,
  source VARCHAR(50) NOT NULL DEFAULT 'unknown',
  client_user_id BIGINT UNSIGNED NULL,
  session_id VARCHAR(128) NULL,
  user_agent VARCHAR(255) NULL,
  ip_hash VARCHAR(128) NULL,
  clicked_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_promo_click_events_promotion_clicked (promotion_id, clicked_at),
  KEY idx_promo_click_events_source_clicked (source, clicked_at),
  KEY idx_promo_click_events_client_clicked (client_user_id, clicked_at),
  CONSTRAINT fk_promo_click_events_promotion
    FOREIGN KEY (promotion_id) REFERENCES promotions(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
