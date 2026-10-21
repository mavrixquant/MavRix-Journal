-- DropIndex
DROP INDEX "gex_days_date_idx";

-- CreateIndex
CREATE INDEX "users_isAi_idx" ON "users"("isAi");
