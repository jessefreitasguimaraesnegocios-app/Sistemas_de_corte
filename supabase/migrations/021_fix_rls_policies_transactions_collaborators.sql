-- ============================================
-- CORRIGIR POLÍTICAS RLS PARA TRANSACTIONS E COLLABORATORS
-- ============================================

-- ============================================
-- 1. CORRIGIR POLÍTICAS DE TRANSACTIONS
-- ============================================

-- Remover políticas antigas conflitantes
DROP POLICY IF EXISTS "Users can view their own business transactions" ON transactions;
DROP POLICY IF EXISTS "Business owners can view their own transactions" ON transactions;

-- Criar política corrigida para business owners verem suas transações
CREATE POLICY "Business owners can view their own transactions"
  ON transactions FOR SELECT
  USING (
    business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid()::text
    )
  );

-- Garantir que SUPER_ADMIN pode ver todas as transações
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

-- ============================================
-- 2. CORRIGIR POLÍTICAS DE COLLABORATORS
-- ============================================

-- Remover políticas antigas se existirem
DROP POLICY IF EXISTS "Business owners can view their own collaborators" ON collaborators;
DROP POLICY IF EXISTS "Customers can view active collaborators" ON collaborators;

-- Política: Business owners podem ver seus próprios colaboradores
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

-- Política: Clientes podem ver colaboradores ativos de todos os estabelecimentos
CREATE POLICY "Customers can view active collaborators"
  ON collaborators FOR SELECT
  USING (
    status = 'ACTIVE'
    OR business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid()::text
    )
  );

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
  
  RAISE NOTICE 'Todas as políticas RLS foram criadas com sucesso';
END $$;
