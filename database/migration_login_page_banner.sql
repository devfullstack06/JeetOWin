-- Single-row settings for login / sign-up page banner images (managed from Admin > Content > Main Banner > Login Page).

CREATE TABLE IF NOT EXISTS login_page_banner (
  id TINYINT UNSIGNED NOT NULL PRIMARY KEY,
  image_desktop_path VARCHAR(255) NULL,
  image_mobile_path VARCHAR(255) NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

INSERT IGNORE INTO login_page_banner (id, image_desktop_path, image_mobile_path) VALUES (1, NULL, NULL);
