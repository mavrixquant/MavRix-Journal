-- AlterTable
ALTER TABLE "users" ADD COLUMN     "pendingEmailOtp" TEXT,
ADD COLUMN     "pendingEmailOtpAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "pendingEmailOtpExpiry" TIMESTAMP(3),
ADD COLUMN     "pendingTotpSecret" TEXT,
ADD COLUMN     "pendingTotpSecretIv" TEXT,
ADD COLUMN     "pendingTotpSecretTag" TEXT,
ADD COLUMN     "totpBackupCodes" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "totpSecret" TEXT,
ADD COLUMN     "totpSecretIv" TEXT,
ADD COLUMN     "totpSecretTag" TEXT,
ADD COLUMN     "twoFactorEmailEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "twoFactorTotpEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "twoFactorVerifiedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "users_twoFactorEnabled_idx" ON "users"("twoFactorEnabled");
