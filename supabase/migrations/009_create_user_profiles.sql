-- MigraÃ§Ã£o para criar tabela de perfis de usuÃ¡rios
-- Esta tabela complementa o auth.users do Supabase e armazena informaÃ§Ãµes adicionais
-- sobre os diferentes tipos de usuÃ¡rios: CUSTOMER, BUSINESS_OWNER, SUPER_ADMIN

-- ============================================
-- TABELA DE PERFIS DE USUÃRIOS
-- ============================================

CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('CUSTOMER', 'BUSINESS_OWNER', 'SUPER_ADMIN')),
  avatar_url TEXT,
  phone TEXT,
  business_id TEXT REFERENCES businesses(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  last_login TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ãndices
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);
CREATE INDEX IF NOT EXISTS idx_user_profiles_business_id ON user_profiles(business_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_is_active ON user_profiles(is_active);

-- ComentÃ¡rios
COMMENT ON TABLE user_profiles IS 'Perfis de usuÃ¡rios que complementam auth.users';
COMMENT ON COLUMN user_profiles.id IS 'ID do usuÃ¡rio (mesmo do auth.users)';
COMMENT ON COLUMN user_profiles.role IS 'Tipo de usuÃ¡rio: CUSTOMER, BUSINESS_OWNER ou SUPER_ADMIN';
COMMENT ON COLUMN user_profiles.business_id IS 'ID do negÃ³cio associado (apenas para BUSINESS_OWNER)';
COMMENT ON COLUMN user_profiles.metadata IS 'Dados adicionais em formato JSON';

-- ============================================
-- TRIGGER: Criar perfil automaticamente ao criar usuÃ¡rio
-- ============================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.user_profiles (
    id,
    email,
    full_name,
    role,
    avatar_url,
    metadata
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'CUSTOMER'),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture'),
    COALESCE(NEW.raw_user_meta_data, '{}'::jsonb)
  )
  ON CONFLICT (id) DO UPDATE
  SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, user_profiles.full_name),
    role = COALESCE(EXCLUDED.role, user_profiles.role),
    avatar_url = COALESCE(EXCLUDED.avatar_url, user_profiles.avatar_url),
    updated_at = NOW();
  
  RETURN NEW;
END;
$$;

-- Trigger para criar perfil quando novo usuÃ¡rio Ã© criado
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- ============================================
-- FUNÃ‡ÃƒO: Atualizar last_login
-- ============================================

CREATE OR REPLACE FUNCTION update_last_login(user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.user_profiles
  SET last_login = NOW()
  WHERE id = user_id;
END;
$$;

-- ============================================
-- TRIGGER: Atualizar updated_at
-- ============================================

DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- PolÃ­tica: UsuÃ¡rios podem ver seus prÃ³prios perfis
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  USING (auth.uid() = id);

-- PolÃ­tica: UsuÃ¡rios podem atualizar seus prÃ³prios perfis
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- PolÃ­tica: SUPER_ADMIN pode ver todos os perfis
DROP POLICY IF EXISTS "Super admins can view all profiles" ON user_profiles;
CREATE POLICY "Super admins can view all profiles"
  ON user_profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'SUPER_ADMIN'
    )
  );

-- PolÃ­tica: BUSINESS_OWNER pode ver perfis de clientes que fizeram agendamentos em seu negÃ³cio
DROP POLICY IF EXISTS "Business owners can view customer profiles" ON user_profiles;
CREATE POLICY "Business owners can view customer profiles"
  ON user_profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM businesses
      WHERE businesses.owner_id = auth.uid()::text
      AND (
        user_profiles.business_id = businesses.id
        OR user_profiles.role = 'CUSTOMER'
      )
    )
  );

-- ============================================
-- VIEW: Perfis com informaÃ§Ãµes do negÃ³cio
-- ============================================

CREATE OR REPLACE VIEW user_profiles_with_business AS
SELECT 
  up.id,
  up.email,
  up.full_name,
  up.role,
  up.avatar_url,
  up.phone,
  up.business_id,
  up.is_active,
  up.last_login,
  up.created_at,
  up.updated_at,
  b.name AS business_name,
  b.type AS business_type,
  b.status AS business_status
FROM user_profiles up
LEFT JOIN businesses b ON up.business_id = b.id;

-- ============================================
-- FUNÃ‡Ã•ES ÃšTEIS
-- ============================================

-- FunÃ§Ã£o para obter perfil completo do usuÃ¡rio
CREATE OR REPLACE FUNCTION get_user_profile(user_id_param UUID)
RETURNS TABLE (
  id UUID,
  email TEXT,
  full_name TEXT,
  role TEXT,
  avatar_url TEXT,
  phone TEXT,
  business_id TEXT,
  business_name TEXT,
  is_active BOOLEAN,
  last_login TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    up.id,
    up.email,
    up.full_name,
    up.role,
    up.avatar_url,
    up.phone,
    up.business_id,
    b.name AS business_name,
    up.is_active,
    up.last_login,
    up.created_at
  FROM user_profiles up
  LEFT JOIN businesses b ON up.business_id = b.id
  WHERE up.id = user_id_param;
END;
$$;

-- FunÃ§Ã£o para listar usuÃ¡rios por role
CREATE OR REPLACE FUNCTION get_users_by_role(role_param TEXT)
RETURNS TABLE (
  id UUID,
  email TEXT,
  full_name TEXT,
  role TEXT,
  avatar_url TEXT,
  business_id TEXT,
  business_name TEXT,
  is_active BOOLEAN,
  last_login TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    up.id,
    up.email,
    up.full_name,
    up.role,
    up.avatar_url,
    up.business_id,
    b.name AS business_name,
    up.is_active,
    up.last_login,
    up.created_at
  FROM user_profiles up
  LEFT JOIN businesses b ON up.business_id = b.id
  WHERE up.role = role_param
  ORDER BY up.created_at DESC;
END;
$$;

-- ============================================
-- PERMISSÃ•ES
-- ============================================

GRANT SELECT, UPDATE ON user_profiles TO authenticated;
GRANT SELECT ON user_profiles_with_business TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_profile TO authenticated;
GRANT EXECUTE ON FUNCTION get_users_by_role TO authenticated;
GRANT EXECUTE ON FUNCTION update_last_login TO authenticated;

-- ============================================
-- MENSAGEM DE CONFIRMAÃ‡ÃƒO
-- ============================================

DO $$
BEGIN
  RAISE NOTICE 'Migração 009 concluída: Tabela de perfis de usuários criada!';
  RAISE NOTICE 'Funcionalidades:';
  RAISE NOTICE '  - Tabela user_profiles criada';
  RAISE NOTICE '  - Trigger automático para criar perfil ao criar usuário';
  RAISE NOTICE '  - Funções para gerenciar perfis';
  RAISE NOTICE '  - RLS configurado';
  RAISE NOTICE '  - View user_profiles_with_business criada';
END $$;
