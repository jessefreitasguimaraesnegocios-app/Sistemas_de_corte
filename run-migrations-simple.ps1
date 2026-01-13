# Script simplificado para executar migracoes
# Uso: .\run-migrations-simple.ps1 -ProjectRef "seu-project-ref"

param(
    [Parameter(Mandatory=$false)]
    [string]$ProjectRef
)

Write-Host "Executando migracoes do Supabase..." -ForegroundColor Cyan
Write-Host ""

# Se ProjectRef foi fornecido, tentar linkar
if ($ProjectRef) {
    Write-Host "Linkando projeto: $ProjectRef" -ForegroundColor Yellow
    npx supabase link --project-ref $ProjectRef
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Erro ao linkar projeto. Verifique o Project Reference ID." -ForegroundColor Red
        exit 1
    }
    Write-Host "Projeto linkado com sucesso!" -ForegroundColor Green
    Write-Host ""
}

# Aplicar migracoes
Write-Host "Aplicando migracoes..." -ForegroundColor Yellow
npx supabase db push

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "Migracoes aplicadas com sucesso!" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "Erro ao aplicar migracoes." -ForegroundColor Red
    Write-Host ""
    Write-Host "Se o projeto nao esta linkado, execute:" -ForegroundColor Yellow
    Write-Host "  npx supabase login" -ForegroundColor White
    Write-Host "  npx supabase link --project-ref SEU_PROJECT_REF" -ForegroundColor White
    Write-Host "  npx supabase db push" -ForegroundColor White
    exit 1
}
