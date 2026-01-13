# Script para executar migracoes SQL do Supabase
# Opcao 1: Via Dashboard (mais facil)
# Opcao 2: Via psql (requer senha do banco)

param(
    [Parameter(Mandatory=$false)]
    [string]$DbPassword
)

$PROJECT_REF = "hgkvhgjtjsycbpeglrrs"
$SQL_FILE = "supabase\migrations\000_initial_setup.sql"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Executando Migracoes SQL" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Verificar se o arquivo existe
if (-not (Test-Path $SQL_FILE)) {
    Write-Host "ERRO: Arquivo $SQL_FILE nao encontrado!" -ForegroundColor Red
    exit 1
}

Write-Host "Arquivo SQL encontrado: $SQL_FILE" -ForegroundColor Green
Write-Host ""

# Se senha foi fornecida, tentar executar via psql
if ($DbPassword) {
    Write-Host "Tentando executar via psql..." -ForegroundColor Yellow
    
    # Verificar se psql esta instalado
    $psqlPath = Get-Command psql -ErrorAction SilentlyContinue
    
    if (-not $psqlPath) {
        Write-Host "psql nao encontrado. Instale o PostgreSQL client." -ForegroundColor Red
        Write-Host "Ou execute manualmente no Dashboard do Supabase." -ForegroundColor Yellow
        exit 1
    }
    
    $connectionString = "postgresql://postgres:$DbPassword@db.$PROJECT_REF.supabase.co:5432/postgres"
    
    Write-Host "Conectando ao banco de dados..." -ForegroundColor Cyan
    & psql $connectionString -f $SQL_FILE
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "Migracoes aplicadas com sucesso via psql!" -ForegroundColor Green
        exit 0
    } else {
        Write-Host ""
        Write-Host "Erro ao executar via psql. Tente executar manualmente no Dashboard." -ForegroundColor Red
    }
}

# Se chegou aqui, mostrar instrucoes para execucao manual
Write-Host "========================================" -ForegroundColor Yellow
Write-Host "  INSTRUCOES PARA EXECUCAO MANUAL" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Acesse o Supabase Dashboard:" -ForegroundColor White
Write-Host "   https://supabase.com/dashboard/project/$PROJECT_REF/sql/new" -ForegroundColor Cyan
Write-Host ""
Write-Host "2. Abra o arquivo: $SQL_FILE" -ForegroundColor White
Write-Host ""
Write-Host "3. Copie TODO o conteudo do arquivo" -ForegroundColor White
Write-Host ""
Write-Host "4. Cole no SQL Editor do Supabase" -ForegroundColor White
Write-Host ""
Write-Host "5. Clique em 'Run' ou pressione Ctrl+Enter" -ForegroundColor White
Write-Host ""
Write-Host "========================================" -ForegroundColor Yellow
Write-Host ""
Write-Host "OU execute via psql com a senha do banco:" -ForegroundColor Yellow
Write-Host "  .\execute-migrations.ps1 -DbPassword 'sua-senha-aqui'" -ForegroundColor White
Write-Host ""
