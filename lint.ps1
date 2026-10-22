# =====================================================================
# MAVRIX LINT — run ESLint across the full monorepo
# ---------------------------------------------------------------------
# Usage:
#   .\lint.ps1                       # lint all three packages
#   .\lint.ps1 -Fix                  # auto-fix first, then report
#   .\lint.ps1 -Target web           # only apps/web
#   .\lint.ps1 -Target api           # only apps/api
#   .\lint.ps1 -Target shared        # only packages/shared
#
# Exit codes:
#   0 = no errors on any package (warnings ok)
#   1 = at least one package had errors
# =====================================================================

param(
    [switch]$Fix,
    [ValidateSet('all', 'web', 'api', 'shared')]
    [string]$Target = 'all'
)

$ErrorActionPreference = "Continue"

$root = $PSScriptRoot
if (-not $root) { $root = (Get-Location).Path }

$packages = switch ($Target) {
    'all'    { @('apps/web', 'apps/api', 'packages/shared') }
    'web'    { @('apps/web') }
    'api'    { @('apps/api') }
    'shared' { @('packages/shared') }
}

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host " Mavrix ESLint — full-project run"         -ForegroundColor Cyan
Write-Host " Target: $Target ($($packages.Count) package(s))" -ForegroundColor DarkGray
Write-Host "=========================================" -ForegroundColor Cyan

$totalExit = 0
$summary = @()

foreach ($pkg in $packages) {
    $pkgDir = Join-Path $root $pkg
    if (-not (Test-Path (Join-Path $pkgDir "package.json"))) {
        Write-Host "`n=== $pkg — SKIP (no package.json) ===" -ForegroundColor DarkYellow
        continue
    }

    Write-Host "`n=== $pkg ===" -ForegroundColor Cyan

    Push-Location $pkgDir
    try {
        # ---- Pass 1: optional auto-fix -----------------------------
        if ($Fix) {
            Write-Host "  eslint --fix ..." -ForegroundColor DarkGray
            $prevEAP = $ErrorActionPreference
            $ErrorActionPreference = "Continue"
            try { $null = & npx eslint . --fix 2>&1 } finally { $ErrorActionPreference = $prevEAP }
        }

        # ---- Pass 2: report ----------------------------------------
        $prevEAP = $ErrorActionPreference
        $ErrorActionPreference = "Continue"
        try {
            $raw = & npx eslint . --format stylish 2>&1 | Out-String
            $exit = $LASTEXITCODE
        } finally {
            $ErrorActionPreference = $prevEAP
        }

        $errorCount = 0
        $warningCount = 0
        if ($raw -match '(\d+)\s+errors?')   { $errorCount   = [int]$Matches[1] }
        if ($raw -match '(\d+)\s+warnings?') { $warningCount = [int]$Matches[1] }

        # Colourised body
        foreach ($line in ($raw -split "`r?`n")) {
            if ([string]::IsNullOrWhiteSpace($line)) { continue }
            if ($line -match '\s+error\s+')    { Write-Host $line -ForegroundColor Red;    continue }
            if ($line -match '\s+warning\s+')  { Write-Host $line -ForegroundColor Yellow; continue }
            if ($line -match '^[A-Z]:\\|^/[^ ]+\.(js|jsx|mjs|cjs)') {
                Write-Host $line -ForegroundColor Cyan; continue
            }
            if ($line -match '^\s+\d+:\d+')    { Write-Host $line -ForegroundColor Gray;   continue }
            if ($line -match 'problems?\s+\(') { Write-Host $line -ForegroundColor Magenta; continue }
            Write-Host $line -ForegroundColor DarkGray
        }

        if ($exit -eq 0) {
            if ($warningCount -gt 0) {
                Write-Host "  ✓ $pkg — 0 errors, $warningCount warning(s)" -ForegroundColor Green
            } else {
                Write-Host "  ✓ $pkg — clean" -ForegroundColor Green
            }
            $summary += [pscustomobject]@{ Package = $pkg; Errors = 0; Warnings = $warningCount; Exit = 0 }
        } else {
            Write-Host "  ✗ $pkg — $errorCount error(s), $warningCount warning(s)" -ForegroundColor Red
            $summary += [pscustomobject]@{ Package = $pkg; Errors = $errorCount; Warnings = $warningCount; Exit = $exit }
            if ($exit -gt $totalExit) { $totalExit = $exit }
        }
    } finally {
        Pop-Location
    }
}

# ---- Summary ---------------------------------------------------------
Write-Host "`n=========================================" -ForegroundColor Cyan
Write-Host " Summary"                                     -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
foreach ($row in $summary) {
    $icon = if ($row.Exit -eq 0) { '✓' } else { '✗' }
    $col  = if ($row.Exit -eq 0) { 'Green' } else { 'Red' }
    Write-Host ("  {0} {1,-22} errors={2,-3} warnings={3,-3}" -f $icon, $row.Package, $row.Errors, $row.Warnings) -ForegroundColor $col
}

Write-Host ""
if ($totalExit -eq 0) {
    Write-Host "✓ ESLint passed on all target packages" -ForegroundColor Green
} else {
    Write-Host "✗ ESLint failed (aggregate exit $totalExit)" -ForegroundColor Red
    Write-Host ""
    Write-Host "  Auto-fixable issues?    .\lint.ps1 -Fix" -ForegroundColor White
    Write-Host "  Package-specific:       .\lint.ps1 -Target api" -ForegroundColor White
}

exit $totalExit