-- ---------------------------------------------------------------------------
-- Bug reports.
--
-- Feature: "Report a bug" from the header bar. Users submit a short report
-- (title, description, category, severity, page URL, user agent). An optional
-- screenshot may be attached — the image is NEVER stored (only emailed to
-- SUPPORT_EMAIL via Brevo). Only the text report is persisted here for admin
-- review.
--
-- Design notes:
--   • userId cascade-deletes (GDPR: deleting a user wipes their reports)
--   • status is a plain string (open / in_progress / resolved / closed) to
--     match the codebase's existing "no enums" style
--   • category (bug / feature / performance / other) and severity
--     (low / medium / high / critical) are likewise plain strings
--   • adminNote is optional free-text left by the reviewing admin
-- ---------------------------------------------------------------------------

-- CreateTable
CREATE TABLE "bug_reports" (
    "id"          TEXT NOT NULL,
    "userId"      TEXT NOT NULL,
    "title"       TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category"    TEXT NOT NULL DEFAULT 'bug',
    "severity"    TEXT NOT NULL DEFAULT 'medium',
    "status"      TEXT NOT NULL DEFAULT 'open',
    "pageUrl"     TEXT,
    "userAgent"   TEXT,
    "adminNote"   TEXT,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bug_reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "bug_reports_userId_idx" ON "bug_reports"("userId");
CREATE INDEX "bug_reports_status_idx" ON "bug_reports"("status");
CREATE INDEX "bug_reports_createdAt_idx" ON "bug_reports"("createdAt");
CREATE INDEX "bug_reports_status_createdAt_idx" ON "bug_reports"("status", "createdAt");

-- AddForeignKey
ALTER TABLE "bug_reports"
  ADD CONSTRAINT "bug_reports_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;