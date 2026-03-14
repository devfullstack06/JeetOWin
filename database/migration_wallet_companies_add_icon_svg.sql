-- Add icon_svg to wallet_companies if the table already existed without it.
-- Run this if you get "Unknown column 'icon_svg'" from admin wallet-companies API.

USE jeetowin;

ALTER TABLE wallet_companies ADD COLUMN icon_svg MEDIUMTEXT NULL COMMENT 'Inline SVG markup' AFTER icon_key;
