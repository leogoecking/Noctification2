ALTER TABLE notification_recipients ADD COLUMN operational_status TEXT;

UPDATE notification_recipients
SET operational_status = CASE
  WHEN response_status = 'resolvido' THEN 'resolvida'
  WHEN response_status = 'em_andamento' THEN 'em_andamento'
  WHEN read_at IS NOT NULL THEN 'visualizada'
  ELSE 'recebida'
END
WHERE operational_status IS NULL;

CREATE INDEX IF NOT EXISTS idx_recipients_operational_status
  ON notification_recipients(operational_status);
