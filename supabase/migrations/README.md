# Migrações do Banco de Dados

Este diretório contém todas as migrações SQL necessárias para configurar o banco de dados do BelezaHub.

## Ordem de Execução

Execute as migrações na seguinte ordem:

1. **001_create_transactions_table.sql** - Cria a tabela principal de transações
2. **002_create_businesses_table.sql** - Cria a tabela de negócios (se não existir)
3. **003_setup_webhook_function.sql** - Cria função para processar webhooks do Mercado Pago
4. **004_create_transactions_view.sql** - Cria view para facilitar consultas
5. **005_create_summary_functions.sql** - Cria funções de resumo financeiro

## Como Aplicar as Migrações

### Opção 1: Via Supabase Dashboard

1. Acesse o Supabase Dashboard
2. Vá em **SQL Editor**
3. Copie e cole o conteúdo de cada arquivo SQL na ordem
4. Execute cada script

### Opção 2: Via Supabase CLI

```bash
# Instalar Supabase CLI (se ainda não tiver)
npm install -g supabase

# Login
supabase login

# Link do projeto
supabase link --project-ref seu-project-ref

# Aplicar todas as migrações
supabase db push

# Ou aplicar migrações específicas
supabase migration up
```

### Opção 3: Via psql (PostgreSQL direto)

```bash
# Conectar ao banco
psql -h db.seu-projeto.supabase.co -U postgres -d postgres

# Executar cada arquivo
\i supabase/migrations/001_create_transactions_table.sql
\i supabase/migrations/002_create_businesses_table.sql
\i supabase/migrations/003_setup_webhook_function.sql
\i supabase/migrations/004_create_transactions_view.sql
\i supabase/migrations/005_create_summary_functions.sql
```

## Estrutura das Tabelas

### transactions
Armazena todas as transações de pagamento com split automático.

**Campos principais:**
- `id`: UUID único
- `business_id`: ID do negócio
- `amount`: Valor total
- `admin_fee`: Taxa da plataforma (10%)
- `partner_net`: Valor líquido para o parceiro
- `status`: PAID, PENDING ou REFUNDED
- `payment_method`: pix ou credit_card

### businesses
Armazena informações dos negócios parceiros.

## Funções Úteis

### get_business_summary(business_id, start_date, end_date)
Retorna resumo financeiro de um negócio específico.

**Exemplo:**
```sql
SELECT * FROM get_business_summary('business-123', NOW() - INTERVAL '7 days', NOW());
```

### get_platform_summary(start_date, end_date)
Retorna resumo financeiro geral da plataforma (apenas para admins).

**Exemplo:**
```sql
SELECT * FROM get_platform_summary(NOW() - INTERVAL '30 days', NOW());
```

### process_mercado_pago_webhook(payment_id, status, status_detail)
Processa webhooks do Mercado Pago para atualizar status de transações.

**Exemplo:**
```sql
SELECT process_mercado_pago_webhook('123456789', 'approved', 'accredited');
```

## Views

### transactions_with_business
View que combina transações com informações do negócio.

**Exemplo:**
```sql
SELECT * FROM transactions_with_business 
WHERE business_id = 'business-123' 
ORDER BY date DESC;
```

## Segurança (RLS)

Todas as tabelas têm Row Level Security (RLS) habilitado:

- **transactions**: Usuários podem ver transações de seus próprios negócios
- **businesses**: Qualquer um pode ver businesses ativos, donos podem gerenciar os seus

## Troubleshooting

### Erro: "relation already exists"
- A tabela já existe. Você pode usar `CREATE TABLE IF NOT EXISTS` ou dropar a tabela primeiro.

### Erro: "permission denied"
- Verifique se está usando a role correta (service_role para Edge Functions).

### Erro: "policy already exists"
- A política já existe. Remova a política antiga antes de criar uma nova, ou use `CREATE POLICY IF NOT EXISTS` (PostgreSQL 9.5+).

## Verificação

Após aplicar as migrações, verifique:

```sql
-- Verificar se a tabela existe
SELECT * FROM information_schema.tables WHERE table_name = 'transactions';

-- Verificar políticas RLS
SELECT * FROM pg_policies WHERE tablename = 'transactions';

-- Verificar funções
SELECT routine_name FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name LIKE '%mercado%' OR routine_name LIKE '%summary%';
```
 