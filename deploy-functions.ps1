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

# Fazer deploy da função mercadopago-webhook (CRÍTICO: deve ser pública, sem JWT)
Write-Host "`n📤 Fazendo deploy de mercadopago-webhook..." -ForegroundColor Cyan
npx supabase functions deploy mercadopago-webhook --no-verify-jwt --use-api

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Erro ao fazer deploy de mercadopago-webhook" -ForegroundColor Red
    exit 1
}

Write-Host "✅ mercadopago-webhook deployado com sucesso!" -ForegroundColor Green

# Fazer deploy da função mp-oauth-callback
Write-Host "`n📤 Fazendo deploy de mp-oauth-callback..." -ForegroundColor Cyan
npx supabase functions deploy mp-oauth-callback --no-verify-jwt --use-api

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Erro ao fazer deploy de mp-oauth-callback" -ForegroundColor Red
    exit 1
}

Write-Host "✅ mp-oauth-callback deployado com sucesso!" -ForegroundColor Green

# Fazer deploy da função getMpOauthUrl
Write-Host "`n📤 Fazendo deploy de getMpOauthUrl..." -ForegroundColor Cyan
npx supabase functions deploy getMpOauthUrl --no-verify-jwt --use-api

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Erro ao fazer deploy de getMpOauthUrl" -ForegroundColor Red
    exit 1
}

Write-Host "✅ getMpOauthUrl deployado com sucesso!" -ForegroundColor Green

Write-Host "`n✅ Deploy concluído com sucesso!" -ForegroundColor Green
Write-Host "`n💡 Dica: Configure as variáveis de ambiente no Supabase Dashboard:" -ForegroundColor Yellow
Write-Host "   - MP_SPONSOR_ID" -ForegroundColor White
Write-Host "   - MP_CLIENT_ID" -ForegroundColor White
Write-Host "   - MP_CLIENT_SECRET" -ForegroundColor White
Write-Host "   - MP_WEBHOOK_URL" -ForegroundColor White
Write-Host "   - MP_WEBHOOK_SECRET (opcional)" -ForegroundColor White
Write-Host "`n⚠️ IMPORTANTE: mercadopago-webhook NÃO deve exigir autenticação!" -ForegroundColor Yellow
Write-Host "   A função já está configurada com --no-verify-jwt" -ForegroundColor White
