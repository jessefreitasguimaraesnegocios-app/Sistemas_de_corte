# Script para corrigir e verificar o campo mp_access_token
# Execute este script usando: npx supabase db execute --file supabase/migrations/014_fix_mp_access_token.sql

Write-Host "🔧 Verificando e corrigindo campo mp_access_token..." -ForegroundColor Cyan

# Verificar se o Supabase CLI está instalado
$supabaseInstalled = Get-Command supabase -ErrorAction SilentlyContinue

if (-not $supabaseInstalled) {
    Write-Host "❌ Supabase CLI não encontrado. Instalando via NPX..." -ForegroundColor Yellow
    npx supabase --version
}

Write-Host "`n📋 Executando migração 014_fix_mp_access_token.sql..." -ForegroundColor Cyan

# Executar a migração
npx supabase db execute --file supabase/migrations/014_fix_mp_access_token.sql

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✅ Migração executada com sucesso!" -ForegroundColor Green
    Write-Host "`n📊 Verificando businesses no banco..." -ForegroundColor Cyan
    
    # Criar script SQL temporário para verificar
    $checkScript = @"
SELECT 
    id, 
    name, 
    status, 
    CASE 
        WHEN mp_access_token IS NULL THEN 'SEM TOKEN'
        WHEN mp_access_token = '' THEN 'TOKEN VAZIO'
        ELSE 'COM TOKEN'
    END as token_status,
    LENGTH(mp_access_token) as token_length
FROM businesses 
WHERE status = 'ACTIVE'
ORDER BY created_at DESC
LIMIT 10;
"@
    
    $checkScript | Out-File -FilePath "temp_check.sql" -Encoding UTF8
    
    Write-Host "`nExecutando verificação..." -ForegroundColor Cyan
    npx supabase db execute --file temp_check.sql
    
    Remove-Item "temp_check.sql" -ErrorAction SilentlyContinue
    
    Write-Host "`n✅ Verificação concluída!" -ForegroundColor Green
    Write-Host "`n💡 Próximos passos:" -ForegroundColor Yellow
    Write-Host "   1. Configure o Access Token do Mercado Pago no painel de administração" -ForegroundColor White
    Write-Host "   2. Teste um pagamento para verificar se o token está sendo encontrado" -ForegroundColor White
} else {
    Write-Host "`n❌ Erro ao executar migração. Verifique as configurações do Supabase." -ForegroundColor Red
    Write-Host "`n💡 Alternativa: Execute a migração manualmente no Supabase Dashboard:" -ForegroundColor Yellow
    Write-Host "   SQL Editor > Execute: supabase/migrations/014_fix_mp_access_token.sql" -ForegroundColor White
}
