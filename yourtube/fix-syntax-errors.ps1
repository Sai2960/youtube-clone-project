# fix-syntax-errors.ps1
# This script fixes common TypeScript syntax errors in your project

Write-Host "🔧 Starting automatic syntax error fixes..." -ForegroundColor Cyan

$fileCount = 0
$fixCount = 0

# Get all TypeScript files
$files = Get-ChildItem -Path src -Recurse -Include *.ts,*.tsx

foreach ($file in $files) {
    $fileCount++
    $content = Get-Content $file.FullName -Raw
    $originalContent = $content
    $changed = $false
    
    Write-Host "Checking: $($file.Name)" -ForegroundColor Gray
    
    # Fix 1: Remove broken getApiUrl/getBackendUrl patterns
    # Pattern: const getApiUrl = () => "url"\n\n\n}';
    if ($content -match 'const (getApiUrl|getBackendUrl) = \(\) => .*"\s*\n\s*\n\s*\n\s*\}[\'"]*;') {
        Write-Host "  ✓ Fixing broken API URL function in $($file.Name)" -ForegroundColor Yellow
        $content = $content -replace '(const (getApiUrl|getBackendUrl) = \(\) => [^;]+)([\r\n]+\s*)+\}[\'"]*;', '$1;'
        $changed = $true
    }
    
    # Fix 2: Remove standalone }'; lines
    if ($content -match '^\s*\}[\'"]+;\s*$') {
        Write-Host "  ✓ Removing standalone }'; in $($file.Name)" -ForegroundColor Yellow
        $content = $content -replace '^\s*\}[\'"]+;\s*[\r\n]+', ''
        $changed = $true
    }
    
    # Fix 3: Fix broken URL concatenations
    # Pattern: "url"\n\n\n}/api/endpoint
    if ($content -match '"https://[^"]+"\s*\n\s*\n\s*\n\s*\}/') {
        Write-Host "  ✓ Fixing broken URL concatenation in $($file.Name)" -ForegroundColor Yellow
        $content = $content -replace '"(https://[^"]+)"\s*\n\s*\n\s*\n\s*\}/([^'']+)''', '"$1/$2"'
        $changed = $true
    }
    
    # Fix 4: Remove extra empty lines (more than 2 consecutive)
    $content = $content -replace '(\r?\n){4,}', "`n`n"
    
    # Fix 5: Fix getApiUrl pattern specifically
    $content = $content -replace 'const getApiUrl = \(\) => process\.env\.NEXT_PUBLIC_API_URL \|\| "([^"]+)"\s*\n\s*\n\s*\n\s*\}[\'"]*;', 'const getApiUrl = () => process.env.NEXT_PUBLIC_API_URL || "$1";'
    
    # Fix 6: Fix getBackendUrl pattern specifically  
    $content = $content -replace '(if \(typeof window === [''"]undefined[''"]\) \{\s*return "[^"]+";)\s*\n\s*\n\s*\}[\'"]*;?\s*\}', '$1`n  }'
    
    if ($content -ne $originalContent) {
        Set-Content -Path $file.FullName -Value $content -NoNewline
        Write-Host "  ✅ Fixed $($file.Name)" -ForegroundColor Green
        $fixCount++
    }
}

Write-Host "`n✨ Complete!" -ForegroundColor Cyan
Write-Host "   Files checked: $fileCount" -ForegroundColor White
Write-Host "   Files fixed: $fixCount" -ForegroundColor Green

if ($fixCount -gt 0) {
    Write-Host "`n📝 Next steps:" -ForegroundColor Cyan
    Write-Host "   1. Review the changes: git diff" -ForegroundColor White
    Write-Host "   2. Test locally: npm run build" -ForegroundColor White
    Write-Host "   3. Commit: git add . && git commit -m 'Fix syntax errors'" -ForegroundColor White
    Write-Host "   4. Push: git push origin main" -ForegroundColor White
}