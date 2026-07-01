CREATE TABLE IF NOT EXISTS user_entitlements (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  tier          TEXT NOT NULL DEFAULT 'free'
                CHECK (tier IN ('free','premium','family')),
  valid_until   TIMESTAMPTZ,       -- null = vinh vien
  source        TEXT NOT NULL DEFAULT 'manual'
                CHECK (source IN ('app_store','zalo_pay','manual','trial')),
  trial_used    BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS genie_usage_monthly (
  id         BIGSERIAL PRIMARY KEY,
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  year_month TEXT NOT NULL,         -- "YYYY-MM"
  call_count INTEGER NOT NULL DEFAULT 0,
  UNIQUE(user_id, year_month)
);

ALTER TABLE user_entitlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE genie_usage_monthly ENABLE ROW LEVEL SECURITY;

-- User chi doc entitlement cua chinh ho
CREATE POLICY "user_own_entitlement_select" ON user_entitlements
  FOR SELECT USING (auth.uid() = user_id);

-- Chi server (service role) cap nhat entitlement
CREATE POLICY "server_update_entitlement" ON user_entitlements
  FOR ALL WITH CHECK (FALSE);

-- User chi doc usage cua chinh ho
CREATE POLICY "user_own_usage_select" ON genie_usage_monthly
  FOR SELECT USING (auth.uid() = user_id);

-- Chi server cap nhat usage
CREATE POLICY "server_update_usage" ON genie_usage_monthly
  FOR ALL WITH CHECK (FALSE);

CREATE TRIGGER trg_entitlements_updated_at
  BEFORE UPDATE ON user_entitlements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RPC for atomic increment and check
CREATE OR REPLACE FUNCTION increment_genie_usage(p_user_id UUID, p_year_month TEXT, p_quota INTEGER)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT call_count INTO v_count
  FROM genie_usage_monthly
  WHERE user_id = p_user_id AND year_month = p_year_month;

  IF v_count IS NULL THEN
    v_count := 0;
  END IF;

  IF v_count >= p_quota THEN
    RETURN v_count; -- Khong tang
  END IF;

  INSERT INTO genie_usage_monthly(user_id, year_month, call_count)
  VALUES (p_user_id, p_year_month, 1)
  ON CONFLICT (user_id, year_month)
  DO UPDATE SET call_count = genie_usage_monthly.call_count + 1
  RETURNING call_count INTO v_count;

  RETURN v_count;
END;
$$;
