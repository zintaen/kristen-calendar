-- services/genie-api/supabase/migrations/0019_consent_log.sql

CREATE TABLE IF NOT EXISTS consent_log (
  id             BIGSERIAL PRIMARY KEY,
  user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  consent_type   TEXT NOT NULL CHECK (
    consent_type IN ('cloudSync','genieAI','znsReminder','analyticsUsage')
  ),
  action         TEXT NOT NULL CHECK (action IN ('grant','revoke')),
  policy_version TEXT NOT NULL,
  ip_hash        TEXT NOT NULL,   -- SHA-256 cua IP; KHONG luu IP ro
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE consent_log ENABLE ROW LEVEL SECURITY;

-- Nguoi dung chi doc lich su cua chinh ho
CREATE POLICY "user_own_consent_log" ON consent_log
  FOR SELECT
  USING (auth.uid() = user_id);

-- Insert chi tu server (service role) - client khong insert truc tiep
CREATE POLICY "server_insert_only" ON consent_log
  FOR INSERT
  WITH CHECK (FALSE); -- override bang service role o server
