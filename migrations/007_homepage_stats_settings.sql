-- Homepage statistics: real vs mockup display toggle
INSERT INTO site_settings (key, value) VALUES
  ('stats_use_mock', 'false'),
  ('mock_total_students', '1240'),
  ('mock_total_courses', '45'),
  ('mock_certificates_issued', '980'),
  ('mock_total_teachers', '22')
ON CONFLICT (key) DO NOTHING;
