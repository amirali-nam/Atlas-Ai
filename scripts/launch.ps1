# ATLAS Command - futuristic launcher (Windows / PowerShell)
$ErrorActionPreference = 'SilentlyContinue'
Set-Location (Split-Path -Parent $PSScriptRoot)

function Write-Center($text, $color) {
  Write-Host $text -ForegroundColor $color
}

Clear-Host
$banner = @"

     █████╗ ████████╗██╗      █████╗ ███████╗
    ██╔══██╗╚══██╔══╝██║     ██╔══██╗██╔════╝
    ███████║   ██║   ██║     ███████║███████╗
    ██╔══██║   ██║   ██║     ██╔══██║╚════██║
    ██║  ██║   ██║   ███████╗██║  ██║███████║
    ╚═╝  ╚═╝   ╚═╝   ╚══════╝╚═╝  ╚═╝╚══════╝
"@
Write-Host $banner -ForegroundColor DarkYellow
Write-Host "    TACTICAL AI COMMAND SYSTEM   //   ZERO EGRESS" -ForegroundColor Cyan
Write-Host ""

# --- First-time setup ---------------------------------------------------
if (-not (Test-Path 'backend\.venv') -or -not (Test-Path 'frontend\node_modules')) {
  Write-Host "  First-time setup (one time only, a few minutes)..." -ForegroundColor Yellow
  & cmd /c "scripts\setup.bat"
}

# --- Free stale ports ---------------------------------------------------
foreach ($port in 8000, 3000) {
  Get-NetTCPConnection -LocalPort $port -State Listen -EA SilentlyContinue |
    ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -EA SilentlyContinue }
}

# --- Start services (minimized) ----------------------------------------
if (Get-Command ollama -EA SilentlyContinue) {
  Start-Process 'ollama' 'serve' -WindowStyle Hidden
}
Start-Process 'cmd' '/c cd backend && call .venv\Scripts\activate.bat && uvicorn app.main:app --host 127.0.0.1 --port 8000' -WindowStyle Minimized
Start-Process 'cmd' '/c cd frontend && npm run dev' -WindowStyle Minimized

# --- Animated boot progress (colour-cycling bar) -----------------------
$colors = 'DarkCyan', 'Cyan', 'Yellow', 'DarkYellow', 'Green'
$pct = 0
$ci = 0
for ($i = 0; $i -lt 160; $i++) {
  $ready = $false
  try {
    if ((Invoke-WebRequest 'http://localhost:3000' -UseBasicParsing -TimeoutSec 2).StatusCode -eq 200) { $ready = $true }
  } catch { }

  if ($ready) { $pct = 100 } elseif ($pct -lt 95) { $pct += 2 }
  $filled = [int]($pct * 40 / 100)
  $bar = ('#' * $filled) + ('-' * (40 - $filled))
  $c = $colors[$ci % $colors.Count]; $ci++
  Write-Host ("`r  [{0}] {1,3}%  booting ATLAS..." -f $bar, $pct) -ForegroundColor $c -NoNewline

  if ($ready) { break }
  Start-Sleep -Milliseconds 350
}

Write-Host ""
Write-Host ""
Write-Host "  >> ATLAS ONLINE - opening command interface" -ForegroundColor Green
Start-Process 'http://localhost:3000'
Write-Host ""
Write-Host "  Servers run in two minimized windows. Close them to stop ATLAS." -ForegroundColor DarkGray
Start-Sleep 5
