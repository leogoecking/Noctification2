UPDATE notification_recipients
SET operational_status = 'assumida'
WHERE response_status = 'assumida'
  AND (operational_status IS NULL OR operational_status != 'assumida');
