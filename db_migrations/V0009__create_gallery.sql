CREATE TABLE IF NOT EXISTS t_p81888968_sergei_yalin_portfol.gallery (
  id SERIAL PRIMARY KEY,
  url TEXT NOT NULL,
  caption TEXT DEFAULT '',
  created_at TIMESTAMP DEFAULT NOW()
);