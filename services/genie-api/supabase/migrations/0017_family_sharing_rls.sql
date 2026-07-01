-- services/genie-api/supabase/migrations/0017_family_sharing_rls.sql
-- FR-018: RLS policies (owner CRUD, member read-only trên shared, anon không có gì)
-- Adhering to DEC-LUNAR-181

ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;

-- Owner: full CRUD
CREATE POLICY "owner_all" ON reminders
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Thành viên shared: chỉ đọc (SELECT)
CREATE POLICY "member_select" ON reminders
  FOR SELECT
  USING (auth.uid() = ANY(shared_with));

-- Anon: mặc định deny vì không có policy
