-- Schließt die offenen Single-User-Policies und stellt auf Login-Zwang um.
-- Reihenfolge:
-- 1. schema.sql
-- 2. equipment.sql
-- 3. dieses Script
--
-- Danach in Supabase Auth:
-- - öffentliche Signups abschalten ODER nur explizite Nutzer einladen
-- - die erlaubten Mails in GYM_ALLOWED_EMAILS / Vercel hinterlegen

ALTER TABLE gt_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE gt_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE gt_equipment ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public full access sessions" ON gt_sessions;
DROP POLICY IF EXISTS "Authenticated full access sessions" ON gt_sessions;
CREATE POLICY "Authenticated full access sessions"
ON gt_sessions
FOR ALL
TO authenticated
USING (TRUE)
WITH CHECK (TRUE);

DROP POLICY IF EXISTS "Public full access exercises" ON gt_exercises;
DROP POLICY IF EXISTS "Authenticated full access exercises" ON gt_exercises;
CREATE POLICY "Authenticated full access exercises"
ON gt_exercises
FOR ALL
TO authenticated
USING (TRUE)
WITH CHECK (TRUE);

DROP POLICY IF EXISTS "Public full access equipment" ON gt_equipment;
DROP POLICY IF EXISTS "Public read equipment" ON gt_equipment;
CREATE POLICY "Public read equipment"
ON gt_equipment
FOR SELECT
USING (TRUE);
