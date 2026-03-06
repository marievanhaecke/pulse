-- ============================================================
-- SEED : Données de démonstration
-- À exécuter APRÈS schema.sql dans Supabase Studio > SQL Editor
-- Note : Les utilisateurs doivent d'abord être créés via l'interface auth
-- ============================================================

-- Cours de démonstration
INSERT INTO public.courses (name, description, location, duration_minutes, day_of_week, time_of_day, is_recurring, color)
VALUES
  ('Yoga',       'Séance de yoga pour tous niveaux',    'Salle principale', 60, 1, '09:00', true, '#8b5cf6'),
  ('CrossFit',   'Entraînement haute intensité',        'Salle CrossFit',   60, 2, '18:30', true, '#ef4444'),
  ('Pilates',    'Renforcement musculaire en douceur',  'Salle principale', 60, 3, '10:00', true, '#ec4899'),
  ('Boxe',       'Initiation et perfectionnement',      'Dojo',             90, 4, '19:00', true, '#f97316'),
  ('Natation',   'Aquagym et nage libre',               'Piscine',          45, 5, '07:30', true, '#0ea5e9'),
  ('Méditation', 'Relaxation et pleine conscience',     'Salle zen',        45, 6, '08:00', true, '#14b8a6');
