# Script para executar migracoes SQL do Supabase
# Execute este script apos fazer login e linkar o projeto

Write-Host "Executando migracoes do Supabase..." -ForegroundColor Cyan

# Verificar se esta linkado
Write-Host "`nVerificando status do projeto..." -ForegroundColor Yellow
$status = npx supabase status 2>&1

if ($LASTEXITCODE -ne 0) {
    Write-Host "`nProjeto nao esta linkado ao Supabase!" -ForegroundColor Red
    Write-Host "`nSiga estes passos:" -ForegroundColor Yellow
    Write-Host "1. Execute: npx supabase login" -ForegroundColor White
    Write-Host "2. Execute: npx supabase link --project-ref SEU_PROJECT_REF" -ForegroundColor White
    Write-Host "3. Execute este script novamente" -ForegroundColor White
    exit 1
}

Write-Host "`nProjeto linkado! Aplicando migracoes..." -ForegroundColor Green

# Aplicar todas as migracoes
Write-Host "`nEnviando migracoes para o banco de dados..." -ForegroundColor Cyan
npx supabase db push

if ($LASTEXITCODE -eq 0) {
    Write-Host "`nMigracoes aplicadas com sucesso!" -ForegroundColor Green
} else {
    Write-Host "`nErro ao aplicar migracoes. Verifique os logs acima." -ForegroundColor Red
    exit 1
}
