# 🔧 Correção: "Estabelecimento não encontrado" após login

## ❌ Problema

Ao fazer login como **BUSINESS_OWNER**, às vezes aparece o erro:
- **"Estabelecimento não encontrado"**
- **"Não foi possível encontrar um estabelecimento associado à sua conta"**

## 🔍 Causas Possíveis

### 1. **Race Condition (Mais Comum)**
- A busca do business acontece antes da sessão estar totalmente pronta
- O Supabase ainda não processou completamente a autenticação
- **Solução:** Adicionado delay de 2-3 segundos antes de buscar

### 2. **Problema de RLS (Row Level Security)**
- As políticas RLS podem estar bloqueando a busca
- A sessão pode não estar totalmente validada
- **Solução:** Adicionado refresh de sessão automático

### 3. **Business Realmente Não Existe**
- O usuário não tem um business associado no banco
- O `owner_id` no business não corresponde ao `user.id`
- **Solução:** Verificar no banco de dados

### 4. **Problema de Timing**
- Múltiplas tentativas simultâneas
- Cache desatualizado
- **Solução:** Adicionado controle de retries e delays

## ✅ Melhorias Implementadas

### 1. **Delays Inteligentes**
```typescript
// Primeira tentativa: aguarda 2s
// Tentativas seguintes: aguarda 3s
// Evita race conditions
```

### 2. **Logs Detalhados**
```typescript
console.log('🔍 Buscando business para user:', userId);
console.log('✅ Business encontrado:', businessData.name);
console.error('❌ Erro ao buscar business:', { code, message, details });
```

### 3. **Tratamento de Erros Melhorado**
- Detecta erros de autenticação (401, 403)
- Detecta problemas de RLS
- Faz refresh automático de sessão
- Tenta novamente após refresh

### 4. **Mais Tentativas com Delays**
- Primeira tentativa: 2 segundos
- Segunda tentativa: 3 segundos
- Terceira tentativa: 3 segundos
- Total: até 3 tentativas antes de mostrar erro

## 🔍 Como Verificar o Problema

### 1. Verificar no Console do Navegador

Abra o DevTools (F12) e procure por:
- `🔍 Buscando business para user:`
- `✅ Business encontrado:`
- `❌ Erro ao buscar business:`
- `🔄 Erro de autenticação/permissão`

### 2. Verificar no Banco de Dados

Execute no Supabase SQL Editor:

```sql
-- Verificar se o business existe
SELECT id, name, owner_id, status 
FROM businesses 
WHERE owner_id = 'SEU_USER_ID_AQUI';

-- Verificar se o user existe
SELECT id, email, raw_user_meta_data->>'role' as role
FROM auth.users
WHERE id = 'SEU_USER_ID_AQUI';
```

### 3. Verificar Políticas RLS

```sql
-- Verificar políticas da tabela businesses
SELECT * FROM pg_policies 
WHERE tablename = 'businesses';
```

## 🛠️ Soluções Manuais

### Se o Business Não Existe

1. **Criar business manualmente:**
   ```sql
   INSERT INTO businesses (
     id, name, type, owner_id, status, 
     monthly_fee, revenue_split
   ) VALUES (
     gen_random_uuid()::text,
     'Nome do Estabelecimento',
     'BARBERSHOP',
     'USER_ID_AQUI',
     'ACTIVE',
     300.00,
     10
   );
   ```

2. **Ou usar o painel do SUPER_ADMIN:**
   - Faça login como SUPER_ADMIN
   - Vá em "Parceiros Ativos"
   - Clique em "Novo Parceiro"
   - Crie o business vinculado ao usuário

### Se o Owner_ID Está Errado

```sql
-- Atualizar owner_id do business
UPDATE businesses 
SET owner_id = 'USER_ID_CORRETO'
WHERE id = 'BUSINESS_ID';
```

## 📝 Logs para Debug

Se o problema persistir, verifique os logs:

1. **Console do navegador:**
   - Procure por mensagens começando com `🔍`, `✅`, `❌`
   - Anote o `user.id` que aparece nos logs

2. **Supabase Logs:**
   - Vá em Logs → Database
   - Procure por queries na tabela `businesses`
   - Verifique se há erros de permissão

## ⚠️ Importante

- O sistema agora aguarda **até 8 segundos** antes de mostrar o erro
- Faz **até 3 tentativas** com delays crescentes
- Faz **refresh automático** de sessão se detectar erro de autenticação
- Mostra **logs detalhados** no console para debug

## 🆘 Ainda com Problemas?

1. Verifique os logs no console do navegador
2. Verifique se o business existe no banco de dados
3. Verifique se o `owner_id` está correto
4. Verifique as políticas RLS da tabela `businesses`
5. Tente fazer logout e login novamente
6. Limpe o cache do navegador
