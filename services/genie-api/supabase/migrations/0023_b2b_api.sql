CREATE TABLE IF NOT EXISTS b2b_api_keys (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  partner_name   TEXT NOT NULL,
  api_key_hash   TEXT NOT NULL UNIQUE,
  tier           TEXT NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'pro', 'enterprise')),
  monthly_quota  INTEGER NOT NULL DEFAULT 1000,
  is_active      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS b2b_usage_logs (
  id             BIGSERIAL PRIMARY KEY,
  partner_id     UUID NOT NULL REFERENCES b2b_api_keys(id) ON DELETE CASCADE,
  year_month     TEXT NOT NULL, -- "YYYY-MM"
  endpoint       TEXT NOT NULL,
  status_code    INTEGER NOT NULL,
  compute_ms     INTEGER NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- We aggregate usage on the fly or use a counter table.
-- To avoid expensive COUNT(*), we add a counter table similar to genie_usage_monthly
CREATE TABLE IF NOT EXISTS b2b_usage_monthly (
  id             BIGSERIAL PRIMARY KEY,
  partner_id     UUID NOT NULL REFERENCES b2b_api_keys(id) ON DELETE CASCADE,
  year_month     TEXT NOT NULL, -- "YYYY-MM"
  call_count     INTEGER NOT NULL DEFAULT 0,
  UNIQUE(partner_id, year_month)
);

ALTER TABLE b2b_api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE b2b_usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE b2b_usage_monthly ENABLE ROW LEVEL SECURITY;

-- Service role only
CREATE POLICY "server_b2b_api_keys" ON b2b_api_keys FOR ALL WITH CHECK (FALSE);
CREATE POLICY "server_b2b_usage_logs" ON b2b_usage_logs FOR ALL WITH CHECK (FALSE);
CREATE POLICY "server_b2b_usage_monthly" ON b2b_usage_monthly FOR ALL WITH CHECK (FALSE);

CREATE TRIGGER trg_b2b_api_keys_updated_at
  BEFORE UPDATE ON b2b_api_keys
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RPC for checking and incrementing quota
CREATE OR REPLACE FUNCTION increment_b2b_usage(p_hash TEXT, p_year_month TEXT)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_partner_id UUID;
  v_quota INTEGER;
  v_is_active BOOLEAN;
  v_count INTEGER;
BEGIN
  SELECT id, monthly_quota, is_active
  INTO v_partner_id, v_quota, v_is_active
  FROM b2b_api_keys
  WHERE api_key_hash = p_hash;

  IF v_partner_id IS NULL OR NOT v_is_active THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'invalid_key');
  END IF;

  SELECT call_count INTO v_count
  FROM b2b_usage_monthly
  WHERE partner_id = v_partner_id AND year_month = p_year_month;

  IF v_count IS NULL THEN
    v_count := 0;
  END IF;

  IF v_count >= v_quota THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'quota_exceeded', 'partner_id', v_partner_id);
  END IF;

  INSERT INTO b2b_usage_monthly(partner_id, year_month, call_count)
  VALUES (v_partner_id, p_year_month, 1)
  ON CONFLICT (partner_id, year_month)
  DO UPDATE SET call_count = b2b_usage_monthly.call_count + 1
  RETURNING call_count INTO v_count;

  RETURN jsonb_build_object(
    'valid', true, 
    'partner_id', v_partner_id, 
    'remaining', v_quota - v_count
  );
END;
$$;
