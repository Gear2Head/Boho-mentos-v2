# Boho Mentosluk - Port Killer v5.2 (Final Version)
# Uses $procId instead of $pId to avoid reserved variable conflict.

$targetPorts = @(3000, 3001)

foreach ($port in $targetPorts) {
    Write-Host "Searching for processes on Port $port..." -ForegroundColor Cyan
    $connections = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue 
    
    if ($connections) {
        $uniquePids = $connections | Select-Object -ExpandProperty OwningProcess -Unique
        foreach ($id in $uniquePids) {
            Write-Host "Killing Process ID: $id" -ForegroundColor Yellow
            Stop-Process -Id $id -Force -ErrorAction SilentlyContinue
        }
        Write-Host "Success: Port $port has been cleared." -ForegroundColor Green
    } else {
        Write-Host "Info: Port $port is empty." -ForegroundColor Gray
    }
}

Write-Host "Ready! You can now run 'npm run dev' safely." -ForegroundColor Green
