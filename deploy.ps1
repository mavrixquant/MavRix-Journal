
# =====================================================================
# MAVRIX DEPLOYMENT SCRIPT
#
# PHASE 1: GIT DEPLOYMENT
#   1. Fetch latest remote branches.
#   2. Update prod and dev.
#   3. Merge prod into dev (preserve production hotfixes).
#   4. Push updated dev.
#   5. Fast-forward prod from dev.
#   6. Push updated prod.
#
# PHASE 2: DATABASE DEPLOYMENT
#   1. Validate apps/api/.env DATABASE_URL.
#   2. Block deployment if database is devdb.
#   3. Require defaultdb as the target.
#   4. Ask whether to NUKE the database.
#   5. Reset if approved, otherwise preserve existing data.
#   6. Deploy migrations, generate Prisma Client, verify status.
#
# =====================================================================

$ErrorActionPreference = "Stop"

$DevBranch  = "dev"
$ProdBranch = "prod"
$ApiPath    = "apps/api"
$EnvPath    = Join-Path $ApiPath ".env"

# ---------------------------------------------------------------------
# HELPER: Execute native commands and check exit codes
# ---------------------------------------------------------------------

function Invoke-Checked {
    param(
        [string]$Command,
        [string[]]$Arguments
    )

    & $Command @Arguments

    if ($LASTEXITCODE -ne 0) {
        throw "$Command failed with exit code $LASTEXITCODE. Deployment aborted."
    }
}

# ---------------------------------------------------------------------
# START
# ---------------------------------------------------------------------

try {

    Write-Host ""
    Write-Host "=========================================" -ForegroundColor Cyan
    Write-Host "     MAVRIX DEPLOYMENT SEQUENCE" -ForegroundColor Cyan
    Write-Host "=========================================" -ForegroundColor Cyan

    # Ensure we are inside the Git repository.
    $RepoRoot = git rev-parse --show-toplevel

    if ($LASTEXITCODE -ne 0 -or !$RepoRoot) {
        throw "Not inside a Git repository."
    }

    Set-Location $RepoRoot.Trim()

    # Do not deploy with uncommitted changes.
    $Changes = git status --porcelain

    if ($LASTEXITCODE -ne 0) {
        throw "Unable to inspect Git status."
    }

    if ($Changes) {
        throw "Working tree is not clean. Commit or stash your changes first."
    }


    # =================================================================
    # PHASE 1: GIT DEPLOYMENT
    # =================================================================

    Write-Host ""
    Write-Host "=========================================" -ForegroundColor Cyan
    Write-Host " [1/2] GIT DEPLOYMENT" -ForegroundColor Cyan
    Write-Host "=========================================" -ForegroundColor Cyan

    # STEP 1: Fetch remote branches.

    Write-Host "`nFetching remote branches..." -ForegroundColor Yellow

    Invoke-Checked git @("fetch", "origin")


    # STEP 2: Update production branch.

    Write-Host "`nUpdating $ProdBranch..." -ForegroundColor Yellow

    Invoke-Checked git @("switch", $ProdBranch)
    Invoke-Checked git @("pull", "--ff-only", "origin", $ProdBranch)


    # STEP 3: Update development branch.

    Write-Host "`nUpdating $DevBranch..." -ForegroundColor Yellow

    Invoke-Checked git @("switch", $DevBranch)
    Invoke-Checked git @("pull", "--ff-only", "origin", $DevBranch)


    # STEP 4: Merge production into development.
    # This preserves any hotfixes made directly on prod.

    Write-Host "`nMerging $ProdBranch into $DevBranch..." -ForegroundColor Yellow

    Invoke-Checked git @("merge", "--no-edit", $ProdBranch)


    # STEP 5: Push the synchronized development branch.

    Write-Host "`nPushing synchronized $DevBranch..." -ForegroundColor Yellow

    Invoke-Checked git @("push", "origin", $DevBranch)


    # STEP 6: Merge development into production.
    # Because prod is now an ancestor of dev, this should fast-forward.

    Write-Host "`nMerging $DevBranch into $ProdBranch..." -ForegroundColor Yellow

    Invoke-Checked git @("switch", $ProdBranch)
    Invoke-Checked git @("merge", "--ff-only", $DevBranch)


    # STEP 7: Push production.

    Write-Host "`nPushing $ProdBranch..." -ForegroundColor Yellow

    Invoke-Checked git @("push", "origin", $ProdBranch)


    # Return to development branch.

    Invoke-Checked git @("switch", $DevBranch)

    Write-Host "`nGit deployment completed successfully!" -ForegroundColor Green


    # =================================================================
    # PHASE 2: DATABASE DEPLOYMENT
    # =================================================================

    Write-Host ""
    Write-Host "=========================================" -ForegroundColor Cyan
    Write-Host " [2/2] DATABASE DEPLOYMENT" -ForegroundColor Cyan
    Write-Host "=========================================" -ForegroundColor Cyan


    # STEP 1: Check .env exists.

    Write-Host "`nChecking database configuration..." -ForegroundColor Yellow

    if (!(Test-Path $EnvPath)) {
        throw "apps/api/.env not found. Database deployment aborted."
    }


    # STEP 2: Read DATABASE_URL from .env.

    $EnvContent = Get-Content $EnvPath -Raw

    $Match = [regex]::Match(
        $EnvContent,
        '(?m)^\s*DATABASE_URL\s*=\s*(.*?)\s*$'
    )

    if (!$Match.Success) {
        throw "DATABASE_URL not found in apps/api/.env."
    }

    $DatabaseUrl = $Match.Groups[1].Value.Trim()

    # Remove surrounding quotes if present.
    if (
        ($DatabaseUrl.StartsWith('"') -and $DatabaseUrl.EndsWith('"')) -or
        ($DatabaseUrl.StartsWith("'") -and $DatabaseUrl.EndsWith("'"))
    ) {
        $DatabaseUrl = $DatabaseUrl.Substring(1, $DatabaseUrl.Length - 2)
    }

    if ([string]::IsNullOrWhiteSpace($DatabaseUrl)) {
        throw "DATABASE_URL is empty."
    }


    # STEP 3: Validate database target.

    if ($DatabaseUrl -match '(?i)\bdevdb\b') {

        Write-Host ""
        Write-Host "DATABASE DEPLOYMENT BLOCKED!" -ForegroundColor Red
        Write-Host "Your .env DATABASE_URL points to devdb." -ForegroundColor Red
        Write-Host ""
        Write-Host "Change the database name in:" -ForegroundColor Yellow
        Write-Host "apps/api/.env" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Expected database: defaultdb" -ForegroundColor Green
        Write-Host "Development database: devdb" -ForegroundColor Gray

        throw "Refusing to run production migrations against devdb."
    }

    if ($DatabaseUrl -notmatch '(?i)\bdefaultdb\b') {
        throw "DATABASE_URL does not contain defaultdb. Database deployment blocked."
    }

    # Explicitly use the verified .env URL for Prisma CLI.
    $env:DATABASE_URL = $DatabaseUrl

    Write-Host "`nDatabase target verified: defaultdb" -ForegroundColor Green


    # STEP 4: Enter API directory.

    Write-Host "`nEntering apps/api..." -ForegroundColor Yellow

    Push-Location $ApiPath

    try {

        # STEP 5: Ask whether to reset the database.

        Write-Host ""
        Write-Host "=========================================" -ForegroundColor Red
        Write-Host " DATABASE RESET PERMISSION" -ForegroundColor Red
        Write-Host "=========================================" -ForegroundColor Red

        Write-Host ""
        Write-Host "Target database: defaultdb" -ForegroundColor Yellow

        Write-Host ""
        Write-Host "YES = DELETE ALL EXISTING DATA AND REBUILD"
        Write-Host "NO  = PRESERVE EXISTING DATA AND APPLY PENDING MIGRATIONS"
        Write-Host ""

        $NukeDatabase = Read-Host "Type NUKE to reset the database, or press Enter to skip"

        if ($NukeDatabase -ceq "NUKE") {

            # =========================================================
            # DATABASE RESET
            # =========================================================

            Write-Host ""
            Write-Host "DATABASE RESET APPROVED!" -ForegroundColor Red
            Write-Host "Resetting defaultdb and reapplying all migrations..." -ForegroundColor Yellow

            Invoke-Checked npx @(
                "prisma",
                "migrate",
                "reset",
                "--force",
                "--skip-seed"
            )

            Write-Host "`nDatabase reset completed." -ForegroundColor Green

        }
        else {

            Write-Host ""
            Write-Host "Database reset skipped." -ForegroundColor Cyan
            Write-Host "Existing database data will be preserved." -ForegroundColor Cyan

        }


        # =============================================================
        # PRISMA MIGRATION DEPLOY
        # =============================================================

        Write-Host ""
        Write-Host "Applying pending Prisma migrations..." -ForegroundColor Yellow

        Invoke-Checked npx @(
            "prisma",
            "migrate",
            "deploy"
        )

        Write-Host "`nPrisma migrations deployed successfully." -ForegroundColor Green


        # =============================================================
        # PRISMA CLIENT GENERATION
        # =============================================================

        Write-Host ""
        Write-Host "Generating Prisma Client..." -ForegroundColor Yellow

        Invoke-Checked npx @(
            "prisma",
            "generate"
        )

        Write-Host "`nPrisma Client generated successfully." -ForegroundColor Green


        # =============================================================
        # FINAL MIGRATION STATUS
        # =============================================================

        Write-Host ""
        Write-Host "Verifying migration status..." -ForegroundColor Yellow

        Invoke-Checked npx @(
            "prisma",
            "migrate",
            "status"
        )

        Write-Host ""
        Write-Host "Database verification completed successfully!" -ForegroundColor Green

    }
    finally {
        Pop-Location
    }


    # =================================================================
    # COMPLETE
    # =================================================================

    Write-Host ""
    Write-Host "=========================================" -ForegroundColor Cyan
    Write-Host "       MAVRIX DEPLOYMENT SUCCESSFUL" -ForegroundColor Green
    Write-Host "=========================================" -ForegroundColor Cyan

}
catch {

    Write-Host ""
    Write-Host "=========================================" -ForegroundColor Red
    Write-Host "       DEPLOYMENT ABORTED" -ForegroundColor Red
    Write-Host "=========================================" -ForegroundColor Red

    Write-Host $_.Exception.Message -ForegroundColor Red

    exit 1
}
