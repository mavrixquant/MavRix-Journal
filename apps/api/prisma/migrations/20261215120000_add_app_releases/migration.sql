-- ---------------------------------------------------------------------------
-- Add app_releases — DB becomes the single source of truth for changelog
-- and version. CHANGELOG.json is seed-only (imported once on first boot).
-- ---------------------------------------------------------------------------

CREATE TABLE "app_releases" (
    "id"          TEXT NOT NULL,
    "version"     TEXT NOT NULL,
    "date"        TEXT NOT NULL,
    "highlights"  JSONB NOT NULL DEFAULT '[]',
    "sections"    JSONB NOT NULL DEFAULT '{}',
    "publishedAt" TIMESTAMP(3),
    "publishedBy" TEXT,
    "createdBy"   TEXT,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL,

    CONSTRAINT "app_releases_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "app_releases_version_key" ON "app_releases"("version");
CREATE INDEX "app_releases_publishedAt_idx" ON "app_releases"("publishedAt");
