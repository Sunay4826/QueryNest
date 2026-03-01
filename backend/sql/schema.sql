CREATE TABLE IF NOT EXISTS assignments (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  difficulty VARCHAR(16) NOT NULL CHECK (difficulty IN ('Easy', 'Medium', 'Hard')),
  description TEXT NOT NULL,
  question TEXT NOT NULL,
  requirements TEXT,
  db_schema VARCHAR(64) NOT NULL,
  schema_tables TEXT[] NOT NULL DEFAULT '{}',
  expected_output JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE assignments
  ADD COLUMN IF NOT EXISTS db_schema VARCHAR(64) NOT NULL DEFAULT 'public';

ALTER TABLE assignments
  ADD COLUMN IF NOT EXISTS expected_output JSONB;
