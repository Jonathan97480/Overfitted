$root = $PSScriptRoot

# Tuer les process existants sur les ports 3000 et 8000
foreach ($port in @(3000, 8000)) {
    $pid = (Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -First 1)
    if ($pid) { Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue }
}

# Lancer le backend dans une nouvelle fenetre PowerShell
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$root\backend'; .\.venv\Scripts\uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"

# Lancer le frontend dans une nouvelle fenetre PowerShell
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$root\frontend'; npm run dev -- --hostname 0.0.0.0"

Write-Host "Backend  -> http://localhost:8000" -ForegroundColor Cyan
Write-Host "Frontend -> http://localhost:3000" -ForegroundColor Magenta
