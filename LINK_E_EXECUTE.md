# 🔗 Como Linkar e Executar Migrações SQL

## ⚠️ Problema Identificado

O projeto `hgkvhgjtjsycbpeglrrs` não está acessível via CLI devido a permissões. Isso pode acontecer se:
- O projeto está em uma organização diferente
- Sua conta não tem permissões de admin no projeto
- O projeto está em modo pausado

## ✅ Soluções Disponíveis

### Opção 1: Executar Manualmente no Dashboard (MAIS FÁCIL)

1. **Acesse o SQL Editor:**
   ```
   https://supabase.com/dashboard/project/hgkvhgjtjsycbpeglrrs/sql/new
   ```

2. **Abra o arquivo:**
   ```
   supabase/migrations/000_initial_setup.sql
   ```

3. **Copie TODO o conteúdo** do arquivo

4. **Cole no SQL Editor** do Supabase

5. **Clique em "Run"** ou pressione `Ctrl+Enter`

✅ **Pronto!** Todas as tabelas, funções e políticas serão criadas.

---

### Opção 2: Via psql (PostgreSQL direto)

Se você tem a **senha do banco de dados**:

```powershell
# 1. Instale o PostgreSQL client (se não tiver)
# Download: https://www.postgresql.org/download/windows/

# 2. Execute o script SQL
psql "postgresql://postgres:SUA_SENHA_AQUI@db.hgkvhgjtjsycbpeglrrs.supabase.co:5432/postgres" -f supabase/migrations/000_initial_setup.sql
```

**Como encontrar a senha do banco:**
1. Acesse: https://supabase.com/dashboard/project/hgkvhgjtjsycbpeglrrs/settings/database
2. Role até "Connection string"
3. A senha está na URL de conexão (ou você pode resetá-la)

---

### Opção 3: Linkar com Senha do Banco

```powershell
# Linkar o projeto fornecendo a senha do banco
npx supabase link --project-ref hgkvhgjtjsycbpeglrrs --password "sua-senha-do-banco"

# Depois aplicar migrações
npx supabase db push
```

---

### Opção 4: Usar Script PowerShell com Senha

```powershell
# Execute o script fornecendo a senha
.\execute-migrations.ps1 -DbPassword "sua-senha-aqui"
```

---

## 📋 Arquivos SQL Disponíveis

Você tem duas opções:

1. **`000_initial_setup.sql`** - ⭐ RECOMENDADO
   - Executa TUDO de uma vez
   - Cria tabelas, funções, views e políticas
   - Mais rápido e fácil

2. **Migrações individuais** (se preferir):
   - `001_create_transactions_table.sql`
   - `002_create_businesses_table.sql`
   - `003_setup_webhook_function.sql`
   - `004_create_transactions_view.sql`
   - `005_create_summary_functions.sql`

---

## 🔍 Verificar se Funcionou

Após executar, verifique no SQL Editor:

```sql
-- Verificar tabelas
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('transactions', 'businesses');

-- Verificar funções
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name LIKE '%mercado%' OR routine_name LIKE '%summary%';

-- Verificar view
SELECT * FROM transactions_with_business LIMIT 1;
```

---

## 💡 Dica

A **Opção 1 (Dashboard)** é a mais confiável e não requer nenhuma configuração adicional!
