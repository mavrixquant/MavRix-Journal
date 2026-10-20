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
# STEP 1: NUKE THE DATABASE
# ---------------------------------------------------------------------
Write-Host "`n[1/3] Nuking Database..." -ForegroundColor Yellow
Set-Location -Path "apps\api"

# Reset DB (drops all tables, reapplies migrations)
npx prisma migrate reset --force --skip-seed

# Regenerate client to ensure perfect sync
npx prisma generate

# Verify
Write-Host "Checking migration status..." -ForegroundColor Yellow
npx prisma migrate status

# Return to root
Set-Location -Path "..\.."
Write-Host "Database nuked and rebuilt successfully." -ForegroundColor Green

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