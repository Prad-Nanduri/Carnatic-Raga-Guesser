-- Alapana pivot: generation mode (alapana default / kriti opt-in), instrument,
-- duration cap, input source, and voice-sample suggestion confidence.
-- Backfills existing rows as kriti + manual_selection (the old flow), then
-- drops NOT NULL on lyrics/tala/mood/genre which only apply to kriti mode.

CREATE TYPE "GenerationMode" AS ENUM ('alapana', 'kriti');
CREATE TYPE "Instrument" AS ENUM ('voice', 'violin', 'veena', 'venu_flute', 'sitar_fusion');
CREATE TYPE "InputSource" AS ENUM ('manual_selection', 'voice_sample');

ALTER TABLE "generation_jobs"
  ADD COLUMN "generation_mode" "GenerationMode",
  ADD COLUMN "instrument" "Instrument",
  ADD COLUMN "duration_seconds" INTEGER NOT NULL DEFAULT 10,
  ADD COLUMN "input_source" "InputSource",
  ADD COLUMN "raga_suggestion_confidence" DOUBLE PRECISION;

-- Existing rows came from the lyrics-driven flow -> kriti + manual.
UPDATE "generation_jobs"
SET "generation_mode" = 'kriti',
    "instrument" = 'veena',
    "input_source" = 'manual_selection';

ALTER TABLE "generation_jobs"
  ALTER COLUMN "generation_mode" SET NOT NULL,
  ALTER COLUMN "generation_mode" SET DEFAULT 'alapana',
  ALTER COLUMN "instrument" SET NOT NULL,
  ALTER COLUMN "instrument" SET DEFAULT 'veena',
  ALTER COLUMN "input_source" SET NOT NULL,
  ALTER COLUMN "input_source" SET DEFAULT 'manual_selection',
  ALTER COLUMN "lyrics" DROP NOT NULL,
  ALTER COLUMN "tala" DROP NOT NULL,
  ALTER COLUMN "mood" DROP NOT NULL,
  ALTER COLUMN "genre" DROP NOT NULL;

ALTER TABLE "tracks" ALTER COLUMN "tala" DROP NOT NULL;
