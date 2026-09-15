-- AlterTable
ALTER TABLE "tracks" ADD COLUMN     "file_size_bytes" BIGINT;

-- CreateTable
CREATE TABLE "generation_metrics" (
    "id" TEXT NOT NULL,
    "generation_job_id" TEXT NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL,
    "completed_at" TIMESTAMP(3),
    "duration_ms" INTEGER,
    "status" "JobStatus" NOT NULL,
    "error_message" TEXT,

    CONSTRAINT "generation_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "generation_metrics_generation_job_id_idx" ON "generation_metrics"("generation_job_id");

-- CreateIndex
CREATE INDEX "generation_metrics_status_idx" ON "generation_metrics"("status");

-- AddForeignKey
ALTER TABLE "generation_metrics" ADD CONSTRAINT "generation_metrics_generation_job_id_fkey" FOREIGN KEY ("generation_job_id") REFERENCES "generation_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
