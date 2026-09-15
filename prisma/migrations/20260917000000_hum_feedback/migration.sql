-- Hum-it feedback: record the engine's top guess and the user's verdict
-- (right/wrong) so raga-suggestion accuracy can be evaluated over time.

ALTER TABLE "generation_jobs"
  ADD COLUMN "hum_guessed_raga" TEXT,
  ADD COLUMN "hum_verdict" TEXT;
