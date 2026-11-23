CREATE TABLE IF NOT EXISTS alumni_spotlights (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  full_name VARCHAR(255) NOT NULL,
  company VARCHAR(255) NOT NULL,
  photo VARCHAR(500),
  story_pdf VARCHAR(500) NOT NULL,
  order_index INTEGER DEFAULT 0,
  is_published BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_alumni_spotlights_published ON alumni_spotlights(is_published, order_index);
