-- Optional: run if you already inserted series 'TR' from an older migration.
-- Adds TRI / TRO (first numbers issued: TRI569001, TRO569001). Does not remove 'TR'.

USE jeetowin;

INSERT IGNORE INTO general_entry_sequences (series, last_number) VALUES
  ('TRI', 569000),
  ('TRO', 569000);

-- Optional cleanup (only if no approvals used 'TR…' numbers you care about):
-- DELETE FROM general_entry_sequences WHERE series = 'TR';
