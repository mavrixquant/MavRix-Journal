-- AlterTable
ALTER TABLE "users" ADD COLUMN     "plan" TEXT NOT NULL DEFAULT 'free',
ADD COLUMN     "planGrantedAt" TIMESTAMP(3),
ADD COLUMN     "planGrantedBy" TEXT;

-- CreateIndex
CREATE INDEX "users_plan_idx" ON "users"("plan");