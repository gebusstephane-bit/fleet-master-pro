# Script de cleanup pour FleetMaster Pro (PowerShell)
# À exécuter avant chaque commit

Write-Host "🧹 Cleanup FleetMaster Pro..." -ForegroundColor Cyan

# 1. Supprimer les fichiers temporaires
Write-Host "🗑️  Suppression des fichiers temporaires..." -ForegroundColor Yellow
Get-ChildItem -Recurse -Filter "*.tmp" -ErrorAction SilentlyContinue | Remove-Item -Force
Get-ChildItem -Recurse -Filter ".DS_Store" -ErrorAction SilentlyContinue | Remove-Item -Force

# 2. Vérifier les doublons de fichiers
Write-Host "🔍 Vérification des doublons..." -ForegroundColor Yellow
$optimizerFiles = @("src/lib/routing/optimizer-v2.ts", "src/lib/routing/optimizer-v3.ts")
foreach ($file in $optimizerFiles) {
    if (Test-Path $file) {
        Write-Host "  ⚠️  $file existe - considérer la suppression" -ForegroundColor Red
    }
}

# 3. Compter les any restants
Write-Host "📊 Statistiques :" -ForegroundColor Green
$anyCount = (Select-String -Path "src\*.ts", "src\*.tsx" -Pattern ": any" -Recurse | Measure-Object).Count
Write-Host "  - Fichiers avec 'any': $anyCount" -ForegroundColor $(if ($anyCount -eq 0) { "Green" } else { "Red" })

$consoleCount = (Select-String -Path "src\*.ts", "src\*.tsx" -Pattern "console\.(log|warn|error)" -Recurse | Measure-Object).Count
Write-Host "  - Console.log restants: $consoleCount" -ForegroundColor $(if ($consoleCount -eq 0) { "Green" } else { "Yellow" })

# 4. ESLint check
Write-Host "🔧 ESLint check..." -ForegroundColor Yellow
try {
    npm run lint 2>&1 | Out-Null
    Write-Host "  ✅ ESLint OK" -ForegroundColor Green
} catch {
    Write-Host "  ⚠️  ESLint a trouvé des problèmes" -ForegroundColor Red
}

Write-Host "✅ Cleanup terminé !" -ForegroundColor Green
