CREATE TABLE IF NOT EXISTS t_p81888968_sergei_yalin_portfol.tracks (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('music', 'poem')),
  text TEXT,
  file_key TEXT,
  cdn_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);