-- Chat webhook events for admin reporting

USE jeetowin;

CREATE TABLE IF NOT EXISTS chat_widget_events (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  provider VARCHAR(20) NOT NULL DEFAULT 'unknown',
  event_name VARCHAR(80) NOT NULL DEFAULT 'unknown',
  external_event_id VARCHAR(120) NULL,
  conversation_id VARCHAR(120) NULL,
  visitor_id VARCHAR(120) NULL,
  visitor_name VARCHAR(120) NULL,
  visitor_email VARCHAR(190) NULL,
  page_url VARCHAR(500) NULL,
  event_at DATETIME NULL,
  payload_json LONGTEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_chat_widget_events_created_at (created_at),
  KEY idx_chat_widget_events_event_name (event_name),
  KEY idx_chat_widget_events_provider (provider),
  KEY idx_chat_widget_events_conversation_id (conversation_id),
  UNIQUE KEY uq_chat_widget_events_external_event_id (external_event_id)
);
