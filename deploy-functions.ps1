# Script para fazer deploy das Edge Functions do Supabase
# Uso: .\deploy-functions.ps1

Write-Host "🚀 Iniciando deploy das Edge Functions..." -ForegroundColor Cyan

# Verificar se o Supabase CLI está instalado
$supabaseInstalled = Get-Command npx -ErrorAction SilentlyContinue
if (-not $supabaseInstalled) {
    Write-Host "❌ NPX não encontrado. Instale o Node.js primeiro." -ForegroundColor Red
    exit 1
}

Write-Host "📦 Verificando Supabase CLI..." -ForegroundColor Yellow

# Fazer deploy da função createPayment
Write-Host "`n📤 Fazendo deploy de createPayment..." -ForegroundColor Cyan
npx supabase functions deploy createPayment --no-verify-jwt --use-api

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Erro ao fazer deploy de createPayment" -ForegroundColor Red
    exit 1
}

Write-Host "✅ createPayment deployado com sucesso!" -ForegroundColor Green

# Fazer deploy da função checkPaymentStatus
Write-Host "`n📤 Fazendo deploy de checkPaymentStatus..." -ForegroundColor Cyan
npx supabase functions deploy checkPaymentStatus --no-verify-jwt --use-api

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Erro ao fazer deploy de checkPaymentStatus" -ForegroundColor Red
    exit 1
}

Write-Host "✅ checkPaymentStatus deployado com sucesso!" -ForegroundColor Green

# Fazer deploy da função updateBusinessConfig
Write-Host "`n📤 Fazendo deploy de updateBusinessConfig..." -ForegroundColor Cyan
npx supabase functions deploy updateBusinessConfig --no-verify-jwt --use-api

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Erro ao fazer deploy de updateBusinessConfig" -ForegroundColor Red
    exit 1
}

Write-Host "✅ updateBusinessConfig deployado com sucesso!" -ForegroundColor Green

Write-Host "`n✅ Deploy concluído com sucesso!" -ForegroundColor Green
Write-Host "`n💡 Dica: Configure as variáveis de ambiente no Supabase Dashboard:" -ForegroundColor Yellow
Write-Host "   - MP_SPONSOR_ID_LOJA" -ForegroundColor White
Write-Host "   - MP_WEBHOOK_URL (opcional)" -ForegroundColor White
