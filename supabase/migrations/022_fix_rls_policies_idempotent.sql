-- ============================================
-- CORRIGIR POLÍTICAS RLS (VERSÃO IDEMPOTENTE)
-- ============================================

-- ============================================
-- 1. CORRIGIR POLÍTICAS DE TRANSACTIONS
-- ============================================

DO $$
BEGIN
  -- Remover política antiga se existir
  DROP POLICY IF EXISTS "Users can view their own business transactions" ON transactions;
  
  -- Remover e recriar política corrigida para business owners
  DROP POLICY IF EXISTS "Business owners can view their own transactions" ON transactions;
  
  CREATE POLICY "Business owners can view their own transactions"
    ON transactions FOR SELECT
    USING (
      business_id IN (
        SELECT id FROM businesses WHERE owner_id = auth.uid()::text
      )
    );
  
  RAISE NOTICE 'Política "Business owners can view their own transactions" criada/atualizada';
END $$;

-- Garantir que SUPER_ADMIN pode ver todas as transações
DO $$
BEGIN
  DROP POLICY IF EXISTS "Super admins can view all transactions" ON transactions;
  
  CREATE POLICY "Super admins can view all transactions"
    ON transactions FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM user_profiles
        WHERE user_profiles.id = auth.uid()
        AND user_profiles.role = 'SUPER_ADMIN'
      )
    );
  
  RAISE NOTICE 'Política "Super admins can view all transactions" criada/atualizada';
END $$;

-- ============================================
-- 2. CORRIGIR POLÍTICAS DE COLLABORATORS
-- ============================================

DO $$
BEGIN
  -- Remover políticas antigas se existirem
  DROP POLICY IF EXISTS "Business owners can view their own collaborators" ON collaborators;
  
  -- Criar política para business owners
  CREATE POLICY "Business owners can view their own collaborators"
    ON collaborators FOR SELECT
    USING (
      business_id IN (
        SELECT id FROM businesses WHERE owner_id = auth.uid()::text
      )
      OR EXISTS (
        SELECT 1 FROM user_profiles
        WHERE user_profiles.id = auth.uid()
        AND user_profiles.role = 'SUPER_ADMIN'
      )
    );
  
  RAISE NOTICE 'Política "Business owners can view their own collaborators" criada/atualizada';
END $$;

DO $$
BEGIN
  -- Remover política antiga se existir
  DROP POLICY IF EXISTS "Customers can view active collaborators" ON collaborators;
  
  -- Criar política para clientes verem colaboradores ativos
  CREATE POLICY "Customers can view active collaborators"
    ON collaborators FOR SELECT
    USING (
      status = 'ACTIVE'
      OR business_id IN (
        SELECT id FROM businesses WHERE owner_id = auth.uid()::text
      )
    );
  
  RAISE NOTICE 'Política "Customers can view active collaborators" criada/atualizada';
END $$;

-- ============================================
-- 3. VERIFICAR SE AS POLÍTICAS FORAM CRIADAS
-- ============================================

DO $$
BEGIN
  -- Verificar políticas de transactions
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'transactions' 
    AND policyname = 'Business owners can view their own transactions'
  ) THEN
    RAISE EXCEPTION 'Política de transactions não foi criada';
  END IF;
  
  -- Verificar políticas de collaborators
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'collaborators' 
    AND policyname = 'Business owners can view their own collaborators'
  ) THEN
    RAISE EXCEPTION 'Política de collaborators não foi criada';
  END IF;
  
  RAISE NOTICE '✅ Todas as políticas RLS foram criadas/atualizadas com sucesso';
END $$;
