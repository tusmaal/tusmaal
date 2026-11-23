-- Default certificate serial counter (07 already issued offline → next is 08)
INSERT INTO site_settings (key, value) VALUES ('certificate_serial_next', '8')
ON CONFLICT (key) DO NOTHING;

INSERT INTO site_settings (key, value) VALUES ('certificate_serial_padding', '5')
ON CONFLICT (key) DO NOTHING;

INSERT INTO site_settings (key, value) VALUES ('certificate_director_name', '"Amin Ahmed Abdi"')
ON CONFLICT (key) DO NOTHING;

INSERT INTO site_settings (key, value) VALUES ('certificate_director_title', '"Academic Director"')
ON CONFLICT (key) DO NOTHING;

INSERT INTO site_settings (key, value) VALUES ('certificate_academy_name', '"Aqoonjire Academy"')
ON CONFLICT (key) DO NOTHING;
