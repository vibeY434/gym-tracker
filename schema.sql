CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS gt_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS gt_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES gt_sessions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sets INTEGER NOT NULL DEFAULT 0 CHECK (sets >= 0),
  reps INTEGER NOT NULL DEFAULT 0 CHECK (reps >= 0),
  weight NUMERIC(6,1) NOT NULL DEFAULT 0 CHECK (weight >= 0),
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gt_sessions_date ON gt_sessions(date DESC);
CREATE INDEX IF NOT EXISTS idx_gt_exercises_session_id ON gt_exercises(session_id);
CREATE INDEX IF NOT EXISTS idx_gt_exercises_created_at ON gt_exercises(created_at ASC);

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS gt_sessions_set_updated_at ON gt_sessions;
CREATE TRIGGER gt_sessions_set_updated_at
BEFORE UPDATE ON gt_sessions
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS gt_exercises_set_updated_at ON gt_exercises;
CREATE TRIGGER gt_exercises_set_updated_at
BEFORE UPDATE ON gt_exercises
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

ALTER TABLE gt_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE gt_exercises ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public full access sessions" ON gt_sessions;
CREATE POLICY "Public full access sessions"
ON gt_sessions
FOR ALL
USING (TRUE)
WITH CHECK (TRUE);

DROP POLICY IF EXISTS "Public full access exercises" ON gt_exercises;
CREATE POLICY "Public full access exercises"
ON gt_exercises
FOR ALL
USING (TRUE)
WITH CHECK (TRUE);
