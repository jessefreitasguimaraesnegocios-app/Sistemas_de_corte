-- Migração para permitir que SUPER_ADMIN crie businesses
-- Esta política permite que usuários com role SUPER_ADMIN criem businesses para outros usuários

-- Política: SUPER_ADMIN pode criar businesses
DROP POLICY IF EXISTS "Super admins can create businesses" ON businesses;
CREATE POLICY "Super admins can create businesses"
  ON businesses FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'SUPER_ADMIN'
    )
  );

-- Política: SUPER_ADMIN pode ver todos os businesses
DROP POLICY IF EXISTS "Super admins can view all businesses" ON businesses;
CREATE POLICY "Super admins can view all businesses"
  ON businesses FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'SUPER_ADMIN'
    )
    OR status = 'ACTIVE'
    OR auth.uid()::text = owner_id
  );

-- Política: SUPER_ADMIN pode atualizar businesses
DROP POLICY IF EXISTS "Super admins can update businesses" ON businesses;
CREATE POLICY "Super admins can update businesses"
  ON businesses FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'SUPER_ADMIN'
    )
    OR auth.uid()::text = owner_id
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'SUPER_ADMIN'
    )
    OR auth.uid()::text = owner_id
  );

-- Comentário
COMMENT ON POLICY "Super admins can create businesses" ON businesses IS 'Permite que SUPER_ADMIN crie businesses para outros usuários';
