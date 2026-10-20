# =====================================================================
# MAVRIX DEPLOYMENT SCRIPT
# 1. Nukes the Aiven Database (via Prisma) and reapplies migrations.
# 2. Merges `dev` into `prod` (making dev changes live) without losing 
#    any hotfixes that were made directly on prod.
# =====================================================================

$ErrorActionPreference = "Stop"

$DevBranch = "dev"
$ProdBranch = "prod"

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host " Starting Mavrix Deployment Sequence " -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan


# ---------------------------------------------------------------------
# STEP 1: OPTIONAL DATABASE NUKE
# ---------------------------------------------------------------------
Write-Host "`n[1/3] Database Reset Permission" -ForegroundColor Yellow

$NukeDatabase = Read-Host "WARNING: This will DELETE ALL DATA in the configured database and reapply migrations. Do you want to NUKE the database? (Y/N)"

if ($NukeDatabase -match '^(Y|YES)$') {
    Write-Host "`nDatabase reset APPROVED. Proceeding..." -ForegroundColor Red

    Push-Location -Path "apps\api"

    try {
        # Reset DB (drops all tables, reapplies migrations)
        npx prisma migrate reset --force --skip-seed

        if ($LASTEXITCODE -ne 0) {
            throw "Prisma migrate reset failed. Deployment aborted."
        }

        # Regenerate client
        npx prisma generate

        if ($LASTEXITCODE -ne 0) {
            throw "Prisma client generation failed. Deployment aborted."
        }

        # Verify migration status
        Write-Host "`nChecking migration status..." -ForegroundColor Yellow
        npx prisma migrate status

        if ($LASTEXITCODE -ne 0) {
            throw "Prisma migration status check failed."
        }

        Write-Host "`nDatabase reset and migration verification successful." -ForegroundColor Green
    }
    finally {
        Pop-Location
    }
}
else {
    Write-Host "`nDatabase reset SKIPPED. Existing database data will be preserved by this script." -ForegroundColor Cyan
}


# ---------------------------------------------------------------------
# STEP 2: SYNC PROD INTO DEV (Absorb any prod hotfixes)
# ---------------------------------------------------------------------
Write-Host "`n[2/3] Syncing $ProdBranch into $DevBranch..." -ForegroundColor Yellow

git checkout $DevBranch
git pull origin $DevBranch

# Pull prod into dev (this prevents overwriting UI fixes made on prod)
git pull origin $ProdBranch --no-rebase

# Push the combined state back to dev
git push origin $DevBranch
Write-Host "Sync complete." -ForegroundColor Green

# ---------------------------------------------------------------------
# STEP 3: MERGE DEV INTO PROD & PUSH LIVE
# ---------------------------------------------------------------------
Write-Host "`n[3/3] Merging $DevBranch into $ProdBranch..." -ForegroundColor Yellow

git checkout $ProdBranch
git pull origin $ProdBranch

# Fast-forward merge dev into prod
git merge $DevBranch

# Push to live
git push origin $ProdBranch

# Return to dev branch for safety
git checkout $DevBranch

Write-Host "`n=========================================" -ForegroundColor Cyan
Write-Host " Deployment Successful! " -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Cyan