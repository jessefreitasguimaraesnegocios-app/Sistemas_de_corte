# Script completo para configurar e executar migracoes do Supabase

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Setup e Execucao de Migracoes SQL" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Passo 1: Verificar se esta logado
Write-Host "[1/3] Verificando autenticacao..." -ForegroundColor Yellow
$loginCheck = npx supabase projects list 2>&1

if ($LASTEXITCODE -ne 0) {
    Write-Host "Voce precisa fazer login no Supabase." -ForegroundColor Red
    Write-Host ""
    Write-Host "Execute o comando abaixo e siga as instrucoes:" -ForegroundColor Yellow
    Write-Host "  npx supabase login" -ForegroundColor White
    Write-Host ""
    Write-Host "Depois execute este script novamente." -ForegroundColor Yellow
    exit 1
}

Write-Host "OK - Autenticado" -ForegroundColor Green
Write-Host ""

# Passo 2: Verificar se esta linkado
Write-Host "[2/3] Verificando se o projeto esta linkado..." -ForegroundColor Yellow
$linkCheck = npx supabase status 2>&1

if ($LASTEXITCODE -ne 0) {
    Write-Host "Projeto nao esta linkado!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Para linkar, voce precisa do Project Reference ID." -ForegroundColor Yellow
    Write-Host "Encontre-o em: https://supabase.com/dashboard/project/_/settings/general" -ForegroundColor Yellow
    Write-Host ""
    $projectRef = Read-Host "Cole o Project Reference ID aqui"
    
    if ($projectRef) {
        Write-Host "Linkando projeto..." -ForegroundColor Cyan
        npx supabase link --project-ref $projectRef
        
        if ($LASTEXITCODE -ne 0) {
            Write-Host "Erro ao linkar projeto. Tente novamente." -ForegroundColor Red
            exit 1
        }
    } else {
        Write-Host "Project Reference ID nao fornecido. Saindo..." -ForegroundColor Red
        exit 1
    }
}

Write-Host "OK - Projeto linkado" -ForegroundColor Green
Write-Host ""

# Passo 3: Aplicar migracoes
Write-Host "[3/3] Aplicando migracoes SQL..." -ForegroundColor Yellow
Write-Host ""

npx supabase db push

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "  Migracoes aplicadas com sucesso!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "Erro ao aplicar migracoes. Verifique os logs acima." -ForegroundColor Red
    exit 1
}
