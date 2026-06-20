ALTER TABLE t_p81888968_sergei_yalin_portfol.tracks ADD COLUMN IF NOT EXISTS hidden BOOLEAN DEFAULT FALSE;

UPDATE t_p81888968_sergei_yalin_portfol.tracks SET hidden = TRUE WHERE id IN (
  7, 8, 9, 10,
  14,
  4,
  1, 2, 3, 6, 12,
  16, 17, 18, 19, 20, 21, 22, 23
);