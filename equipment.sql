-- gt_equipment: 28 Geräte aus Dominiks Gym
-- Ausführen im Supabase SQL Editor

CREATE TABLE IF NOT EXISTS gt_equipment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL,
  weight_min NUMERIC(6,1) DEFAULT 0,
  weight_max NUMERIC(6,1) DEFAULT 0,
  weight_step NUMERIC(4,1) DEFAULT 2.5,
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gt_equipment_category ON gt_equipment(category);

ALTER TABLE gt_equipment ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public full access equipment" ON gt_equipment;
DROP POLICY IF EXISTS "Public read equipment" ON gt_equipment;
CREATE POLICY "Public read equipment"
ON gt_equipment
FOR SELECT
USING (TRUE);

-- Seed: 28 Geräte
INSERT INTO gt_equipment (name, category, weight_min, weight_max, weight_step, notes) VALUES
-- Cardio (4)
('Laufband',           'Cardio', 0, 0, 0, 'Geschwindigkeit + Steigung'),
('Crosstrainer',       'Cardio', 0, 0, 0, 'Widerstand + Zeit'),
('Ergometer',          'Cardio', 0, 0, 0, 'Watt + Zeit'),
('Rudergerät',         'Cardio', 0, 0, 0, 'Widerstand + Zeit'),

-- Beine (5)
('Seated Leg Press',   'Beine', 10, 200, 2.5, ''),
('Leg Extension',      'Beine', 5, 120, 2.5, ''),
('Seated Leg Curl',    'Beine', 5, 100, 2.5, ''),
('Hip Adduction',      'Beine', 5, 120, 2.5, ''),
('Hip Abduction',      'Beine', 5, 120, 2.5, ''),

-- Oberkörper (5)
('Chest Press',        'Oberkörper', 5, 150, 2.5, ''),
('Butterfly',          'Oberkörper', 5, 100, 2.5, 'Reverse möglich'),
('Lat Pulldown',       'Oberkörper', 5, 120, 2.5, ''),
('Seated Row',         'Oberkörper', 5, 120, 2.5, ''),
('Shoulder Press',     'Oberkörper', 5, 100, 2.5, ''),

-- Freie Gewichte (6)
('Kurzhantel',         'Freie Gewichte', 1, 50, 1, 'Paar, kg pro Hand'),
('Langhantel',         'Freie Gewichte', 20, 200, 2.5, 'Olympia-Stange = 20kg'),
('SZ-Stange',          'Freie Gewichte', 10, 80, 2.5, 'EZ-Curl'),
('Kettlebell',         'Freie Gewichte', 4, 32, 4, ''),
('Cable Crossover',    'Freie Gewichte', 2.5, 80, 2.5, 'Seilzug, pro Seite'),
('Dip Station',        'Freie Gewichte', 0, 40, 2.5, 'Zusatzgewicht'),

-- Functional (5)
('Abdominal',          'Functional', 5, 100, 2.5, 'Bauchpresse'),
('Back Extension',     'Functional', 5, 100, 2.5, 'Rückenstrecker'),
('Rotary Torso',       'Functional', 5, 80, 2.5, 'Rotation'),
('Multi-Hip',          'Functional', 5, 80, 2.5, 'Hüfttrainer'),
('Hyperextension',     'Functional', 0, 25, 2.5, 'Hantelscheibenzusatz'),

-- Sonstiges (3)
('TRX',                'Sonstiges', 0, 0, 0, 'Schlingentrainer'),
('Faszienrolle',       'Sonstiges', 0, 0, 0, 'Regeneration'),
('Stretching-Matte',   'Sonstiges', 0, 0, 0, 'Dehnübungen')

ON CONFLICT (name) DO NOTHING;
