-- Criação da tabela collaborators para armazenar colaboradores/funcionários
CREATE TABLE IF NOT EXISTS collaborators (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  avatar TEXT,
  rating DECIMAL(3, 1) DEFAULT 5.0,
  email TEXT,
  phone TEXT,
  specialties TEXT[],
  status TEXT DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT fk_business_collaborators FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
);

-- Comentários nas colunas
COMMENT ON TABLE collaborators IS 'Tabela para armazenar colaboradores/funcionários dos estabelecimentos';
COMMENT ON COLUMN collaborators.business_id IS 'ID do negócio que possui o colaborador';
COMMENT ON COLUMN collaborators.name IS 'Nome completo do colaborador';
COMMENT ON COLUMN collaborators.role IS 'Função/cargo do colaborador (ex: "Barbeiro", "Cabeleireiro")';
COMMENT ON COLUMN collaborators.avatar IS 'URL da foto do colaborador';
COMMENT ON COLUMN collaborators.rating IS 'Avaliação média do colaborador (0-5)';
COMMENT ON COLUMN collaborators.status IS 'Status do colaborador: ACTIVE ou INACTIVE';

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_collaborators_business_id ON collaborators(business_id);
CREATE INDEX IF NOT EXISTS idx_collaborators_status ON collaborators(status);
CREATE INDEX IF NOT EXISTS idx_collaborators_created_at ON collaborators(created_at DESC);

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_collaborators_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar updated_at
DROP TRIGGER IF EXISTS update_collaborators_updated_at ON collaborators;
CREATE TRIGGER update_collaborators_updated_at
  BEFORE UPDATE ON collaborators
  FOR EACH ROW
  EXECUTE FUNCTION update_collaborators_updated_at();

-- Habilitar Row Level Security
ALTER TABLE collaborators ENABLE ROW LEVEL SECURITY;

-- Política: Business owners podem ver seus próprios colaboradores
DROP POLICY IF EXISTS "Business owners can view their own collaborators" ON collaborators;
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

-- Política: Business owners podem inserir seus próprios colaboradores
DROP POLICY IF EXISTS "Business owners can insert their own collaborators" ON collaborators;
CREATE POLICY "Business owners can insert their own collaborators"
  ON collaborators FOR INSERT
  WITH CHECK (
    business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid()::text
    )
    OR EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'SUPER_ADMIN'
    )
  );

-- Política: Business owners podem atualizar seus próprios colaboradores
DROP POLICY IF EXISTS "Business owners can update their own collaborators" ON collaborators;
CREATE POLICY "Business owners can update their own collaborators"
  ON collaborators FOR UPDATE
  USING (
    business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid()::text
    )
    OR EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'SUPER_ADMIN'
    )
  )
  WITH CHECK (
    business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid()::text
    )
    OR EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'SUPER_ADMIN'
    )
  );

-- Política: Business owners podem deletar seus próprios colaboradores
DROP POLICY IF EXISTS "Business owners can delete their own collaborators" ON collaborators;
CREATE POLICY "Business owners can delete their own collaborators"
  ON collaborators FOR DELETE
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
DROP POLICY IF EXISTS "Customers can view active collaborators" ON collaborators;
CREATE POLICY "Customers can view active collaborators"
  ON collaborators FOR SELECT
  USING (
    status = 'ACTIVE'
    OR business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid()::text
    )
  );
