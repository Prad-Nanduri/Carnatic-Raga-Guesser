-- AlterTable
ALTER TABLE "generation_jobs" ADD COLUMN     "prompt" TEXT,
ADD COLUMN     "error_message" TEXT;

-- CreateIndex
CREATE INDEX "generation_jobs_status_idx" ON "generation_jobs"("status");
