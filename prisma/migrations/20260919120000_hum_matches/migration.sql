CREATE TABLE "hum_matches" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "guessed_raga" TEXT NOT NULL,
    "confirmed_raga" TEXT,
    "confidence" DOUBLE PRECISION,
    "verdict" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "hum_matches_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "hum_matches_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "hum_matches_guessed_raga_idx" ON "hum_matches"("guessed_raga");
CREATE INDEX "hum_matches_user_id_idx" ON "hum_matches"("user_id");
