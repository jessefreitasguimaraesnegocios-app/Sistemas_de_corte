-- Criação da tabela services para armazenar serviços oferecidos pelos estabelecimentos
CREATE TABLE IF NOT EXISTS services (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id TEXT NOT NULL,
  name TEXT NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  duration INTEGER NOT NULL, -- duração em minutos
  description TEXT,
  category TEXT, -- categoria do serviço (ex: "Corte", "Pintura", "Manicure", etc)
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT fk_business FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
);

-- Comentários nas colunas
COMMENT ON TABLE services IS 'Tabela para armazenar serviços oferecidos pelos estabelecimentos';
COMMENT ON COLUMN services.business_id IS 'ID do negócio que oferece o serviço';
COMMENT ON COLUMN services.name IS 'Nome do serviço (ex: "Corte Masculino", "Pintura de Unhas")';
COMMENT ON COLUMN services.price IS 'Preço do serviço em reais';
COMMENT ON COLUMN services.duration IS 'Duração do serviço em minutos';
COMMENT ON COLUMN services.description IS 'Descrição detalhada do serviço';
COMMENT ON COLUMN services.category IS 'Categoria do serviço para organização';
COMMENT ON COLUMN services.is_active IS 'Indica se o serviço está ativo e disponível para agendamento';

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_services_business_id ON services(business_id);
CREATE INDEX IF NOT EXISTS idx_services_is_active ON services(is_active);
CREATE INDEX IF NOT EXISTS idx_services_category ON services(category);
CREATE INDEX IF NOT EXISTS idx_services_created_at ON services(created_at DESC);

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_services_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar updated_at
DROP TRIGGER IF EXISTS update_services_updated_at ON services;
CREATE TRIGGER update_services_updated_at
  BEFORE UPDATE ON services
  FOR EACH ROW
  EXECUTE FUNCTION update_services_updated_at();

-- Habilitar Row Level Security
ALTER TABLE services ENABLE ROW LEVEL SECURITY;

-- Política: Business owners podem ver seus próprios serviços
DROP POLICY IF EXISTS "Business owners can view their own services" ON services;
CREATE POLICY "Business owners can view their own services"
  ON services FOR SELECT
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

-- Política: Business owners podem inserir seus próprios serviços
DROP POLICY IF EXISTS "Business owners can insert their own services" ON services;
CREATE POLICY "Business owners can insert their own services"
  ON services FOR INSERT
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

-- Política: Business owners podem atualizar seus próprios serviços
DROP POLICY IF EXISTS "Business owners can update their own services" ON services;
CREATE POLICY "Business owners can update their own services"
  ON services FOR UPDATE
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

-- Política: Business owners podem deletar seus próprios serviços
DROP POLICY IF EXISTS "Business owners can delete their own services" ON services;
CREATE POLICY "Business owners can delete their own services"
  ON services FOR DELETE
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

-- Política: Clientes podem ver serviços ativos de todos os estabelecimentos
DROP POLICY IF EXISTS "Customers can view active services" ON services;
CREATE POLICY "Customers can view active services"
  ON services FOR SELECT
  USING (
    is_active = true
    OR business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid()::text
    )
  );
