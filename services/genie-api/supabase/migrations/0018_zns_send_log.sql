CREATE TABLE zns_send_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reminder_id TEXT NOT NULL,
  phone       TEXT NOT NULL,
  sent_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  status      TEXT NOT NULL,       -- 'success' | 'error'
  zalo_message_id TEXT,
  error_code  TEXT,
  error_message TEXT
);

CREATE INDEX idx_zns_send_log_rem_phone_date ON zns_send_log (reminder_id, phone, sent_at);
