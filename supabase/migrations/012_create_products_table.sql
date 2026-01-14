-- Criação da tabela products para armazenar produtos da loja
CREATE TABLE IF NOT EXISTS products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id TEXT NOT NULL,
  name TEXT NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  stock INTEGER DEFAULT 0,
  image TEXT,
  category TEXT DEFAULT 'Geral',
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT fk_business_products FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
);

-- Comentários nas colunas
COMMENT ON TABLE products IS 'Tabela para armazenar produtos da loja dos estabelecimentos';
COMMENT ON COLUMN products.business_id IS 'ID do negócio que possui o produto';
COMMENT ON COLUMN products.name IS 'Nome do produto';
COMMENT ON COLUMN products.price IS 'Preço do produto em reais';
COMMENT ON COLUMN products.stock IS 'Quantidade em estoque';
COMMENT ON COLUMN products.image IS 'URL da imagem do produto';
COMMENT ON COLUMN products.category IS 'Categoria do produto';
COMMENT ON COLUMN products.is_active IS 'Indica se o produto está ativo e disponível para venda';

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_products_business_id ON products(business_id);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON products(is_active);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_created_at ON products(created_at DESC);

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_products_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar updated_at
DROP TRIGGER IF EXISTS update_products_updated_at ON products;
CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION update_products_updated_at();

-- Habilitar Row Level Security
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Política: Business owners podem ver seus próprios produtos
DROP POLICY IF EXISTS "Business owners can view their own products" ON products;
CREATE POLICY "Business owners can view their own products"
  ON products FOR SELECT
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

-- Política: Business owners podem inserir seus próprios produtos
DROP POLICY IF EXISTS "Business owners can insert their own products" ON products;
CREATE POLICY "Business owners can insert their own products"
  ON products FOR INSERT
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

-- Política: Business owners podem atualizar seus próprios produtos
DROP POLICY IF EXISTS "Business owners can update their own products" ON products;
CREATE POLICY "Business owners can update their own products"
  ON products FOR UPDATE
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

-- Política: Business owners podem deletar seus próprios produtos
DROP POLICY IF EXISTS "Business owners can delete their own products" ON products;
CREATE POLICY "Business owners can delete their own products"
  ON products FOR DELETE
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

-- Política: Clientes podem ver produtos ativos de todos os estabelecimentos
DROP POLICY IF EXISTS "Customers can view active products" ON products;
CREATE POLICY "Customers can view active products"
  ON products FOR SELECT
  USING (
    is_active = true
    OR business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid()::text
    )
  );
