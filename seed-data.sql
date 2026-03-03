-- Sessions
INSERT INTO sessions (id, date, created_at) VALUES 
('550e8400-e29b-41d4-a716-446655440001', '2026-02-19', NOW()),
('550e8400-e29b-41d4-a716-446655440002', '2026-02-26', NOW()),
('550e8400-e29b-41d4-a716-446655440003', '2026-02-28', NOW()),
('550e8400-e29b-41d4-a716-446655440004', '2026-03-02', NOW());

-- Exercises für Session 1 (19.02)
INSERT INTO exercises (session_id, name, sets, reps, weight, notes) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'Cardio', 110, 15, 0, '15min @ 110 ZHF'),
('550e8400-e29b-41d4-a716-446655440001', 'Seated leg press', 5, 10, 60, ''),
('550e8400-e29b-41d4-a716-446655440001', 'Leg extension', 5, 10, 45, ''),
('550e8400-e29b-41d4-a716-446655440001', 'Seated leg curl', 5, 10, 30, ''),
('550e8400-e29b-41d4-a716-446655440001', 'Abdominal', 5, 10, 45, ''),
('550e8400-e29b-41d4-a716-446655440001', 'Back extension', 5, 10, 65, ''),
('550e8400-e29b-41d4-a716-446655440001', 'Hip adduction', 5, 10, 65, ''),
('550e8400-e29b-41d4-a716-446655440001', 'Hip abduction', 5, 10, 80, '');

-- Session 2 (26.02) - alle +2.5kg
INSERT INTO exercises (session_id, name, sets, reps, weight, notes) VALUES
('550e8400-e29b-41d4-a716-446655440002', 'Cardio', 100, 20, 0, '20min @ 100 ZHF'),
('550e8400-e29b-41d4-a716-446655440002', 'Seated leg press', 5, 10, 62.5, ''),
('550e8400-e29b-41d4-a716-446655440002', 'Leg extension', 5, 10, 47.5, ''),
('550e8400-e29b-41d4-a716-446655440002', 'Seated leg curl', 5, 10, 32.5, ''),
('550e8400-e29b-41d4-a716-446655440002', 'Abdominal', 5, 10, 47.5, ''),
('550e8400-e29b-41d4-a716-446655440002', 'Back extension', 5, 10, 67.5, ''),
('550e8400-e29b-41d4-a716-446655440002', 'Hip adduction', 5, 10, 67.5, ''),
('550e8400-e29b-41d4-a716-446655440002', 'Hip abduction', 5, 10, 82.5, '');

-- Session 3 (28.02) - alle +2.5kg
INSERT INTO exercises (session_id, name, sets, reps, weight, notes) VALUES
('550e8400-e29b-41d4-a716-446655440003', 'Cardio', 100, 20, 0, '20min @ 100 ZHF'),
('550e8400-e29b-41d4-a716-446655440003', 'Seated leg press', 5, 10, 65, ''),
('550e8400-e29b-41d4-a716-446655440003', 'Leg extension', 5, 10, 50, ''),
('550e8400-e29b-41d4-a716-446655440003', 'Seated leg curl', 5, 10, 35, ''),
('550e8400-e29b-41d4-a716-446655440003', 'Abdominal', 5, 10, 50, ''),
('550e8400-e29b-41d4-a716-446655440003', 'Back extension', 5, 10, 70, ''),
('550e8400-e29b-41d4-a716-446655440003', 'Hip adduction', 5, 10, 70, ''),
('550e8400-e29b-41d4-a716-446655440003', 'Hip abduction', 5, 10, 85, '');

-- Session 4 (02.03) - alle +2.5kg, Leg Ext Note
INSERT INTO exercises (session_id, name, sets, reps, weight, notes) VALUES
('550e8400-e29b-41d4-a716-446655440004', 'Cardio', 100, 20, 0, '20min @ 100 ZHF'),
('550e8400-e29b-41d4-a716-446655440004', 'Seated leg press', 5, 10, 67.5, ''),
('550e8400-e29b-41d4-a716-446655440004', 'Leg extension', 5, 10, 52.5, 'hart, aber ok'),
('550e8400-e29b-41d4-a716-446655440004', 'Seated leg curl', 5, 10, 37.5, ''),
('550e8400-e29b-41d4-a716-446655440004', 'Abdominal', 5, 10, 50, ''),
('550e8400-e29b-41d4-a716-446655440004', 'Back extension', 5, 10, 72.5, ''),
('550e8400-e29b-41d4-a716-446655440004', 'Hip adduction', 5, 10, 72.5, ''),
('550e8400-e29b-41d4-a716-446655440004', 'Hip abduction', 5, 10, 87.5, '');
