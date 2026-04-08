-- Chat widget provider settings (admin-managed; consumed by client app)

USE jeetowin;

CREATE TABLE IF NOT EXISTS chat_widget_settings (
  id TINYINT UNSIGNED NOT NULL PRIMARY KEY,
  provider VARCHAR(20) NOT NULL DEFAULT 'none' COMMENT 'none | tawk | textcom',
  script_src VARCHAR(500) NULL COMMENT 'Embed script URL for selected provider',
  enabled TINYINT(1) NOT NULL DEFAULT 0,
  start_minimized TINYINT(1) NOT NULL DEFAULT 1,
  hide_on_admin TINYINT(1) NOT NULL DEFAULT 1,
  hide_on_auth TINYINT(1) NOT NULL DEFAULT 1,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

INSERT IGNORE INTO chat_widget_settings
  (id, provider, script_src, enabled, start_minimized, hide_on_admin, hide_on_auth)
VALUES
  (1, 'none', NULL, 0, 1, 1, 1);
