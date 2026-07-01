-- services/genie-api/supabase/migrations/0022_action_log.sql
-- FR-LUNAR-022: O2O Commerce (Ritual Marketplace)

CREATE TABLE IF NOT EXISTS genie_action_log (
  id            BIGSERIAL PRIMARY KEY,
  user_id       UUID REFERENCES users(id) ON DELETE SET NULL,
  event_kind    TEXT NOT NULL,
  payload       JSONB NOT NULL DEFAULT '{}'::jsonb,
  trace_id      TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_genie_action_log_event_kind ON genie_action_log(event_kind);
CREATE INDEX IF NOT EXISTS idx_genie_action_log_user_id ON genie_action_log(user_id);

ALTER TABLE genie_action_log ENABLE ROW LEVEL SECURITY;
