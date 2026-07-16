-- services/genie-api/supabase/migrations/0016_family_sharing_schema.sql
-- TASK-018: Family Sharing and Cloud Sync
-- Creates tables and triggers for sync, adhering to DEC-LUNAR-182 and DEC-LUNAR-183

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  display_name  TEXT NOT NULL,
  locale        TEXT NOT NULL DEFAULT 'vi-VN',
  timezone      TEXT NOT NULL DEFAULT 'Asia/Ho_Chi_Minh',
  phone         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reminders (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type              TEXT NOT NULL CHECK (type IN ('RAM','MUNG_MOT','GIO','CUSTOM','FESTIVAL')),
  title             TEXT NOT NULL,
  lunar_day         SMALLINT NOT NULL CHECK (lunar_day BETWEEN 1 AND 30),
  lunar_month       SMALLINT NOT NULL CHECK (lunar_month BETWEEN 1 AND 12),
  lunar_year        SMALLINT,
  is_leap_month     BOOLEAN NOT NULL DEFAULT FALSE,
  recurrence        TEXT NOT NULL CHECK (recurrence IN ('MONTHLY','ANNUAL','ONCE')),
  lead_times        SMALLINT[] NOT NULL DEFAULT '{0}',
  notify_time       TIME NOT NULL DEFAULT '07:00',
  channels          TEXT[] NOT NULL DEFAULT '{LOCAL}',
  linked_content_id TEXT,
  shared_with       UUID[] NOT NULL DEFAULT '{}',
  enabled           BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reminders_user_id ON reminders(user_id);
CREATE INDEX IF NOT EXISTS idx_reminders_shared_with ON reminders USING GIN(shared_with);

CREATE TABLE IF NOT EXISTS invite_tokens (
  jti         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reminder_id UUID NOT NULL REFERENCES reminders(id) ON DELETE CASCADE,
  expires_at  TIMESTAMPTZ NOT NULL,
  used_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sync_log (
  id            BIGSERIAL PRIMARY KEY,
  reminder_id   UUID NOT NULL,
  device_id     TEXT NOT NULL,
  action        TEXT NOT NULL,
  conflict_data JSONB,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_reminders_updated_at ON reminders;
CREATE TRIGGER trg_reminders_updated_at
  BEFORE UPDATE ON reminders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
