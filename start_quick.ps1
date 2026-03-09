Write-Host "Stopping existing node processes..." -ForegroundColor Yellow
Stop-Process -Name node -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 1

Write-Host "Starting HassHalt..." -ForegroundColor Green
npm run dev
