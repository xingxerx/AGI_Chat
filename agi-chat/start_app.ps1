$env:Path = "C:\Program Files\nodejs;" + $env:Path
Write-Host "Application starting..."
Write-Host "Access URL: http://localhost:3000"
npm run dev -- -p 3000
