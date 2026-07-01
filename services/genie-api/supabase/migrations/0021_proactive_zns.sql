-- services/genie-api/supabase/migrations/0021_proactive_zns.sql
-- FR-LUNAR-021: Proactive AI (Genie 2.0)

ALTER TABLE users 
ADD COLUMN proactive_zns_opt_in BOOLEAN NOT NULL DEFAULT FALSE;
