-- Adds optional click-through behavior for home banner slides.
-- One URL shared by desktop/mobile image of each slide.

USE jeetowin;

ALTER TABLE home_banner_slides
  ADD COLUMN link_url VARCHAR(1000) NULL AFTER image_mobile_path,
  ADD COLUMN open_in_new_tab TINYINT(1) NOT NULL DEFAULT 0 AFTER link_url;
