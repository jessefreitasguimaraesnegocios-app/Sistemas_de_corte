-- Criação da tabela transactions para armazenar pagamentos
CREATE TABLE IF NOT EXISTS transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id TEXT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  admin_fee DECIMAL(10, 2) NOT NULL,
  partner_net DECIMAL(10, 2) NOT NULL,
  date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status TEXT NOT NULL CHECK (status IN ('PAID', 'PENDING', 'REFUNDED')),
  gateway TEXT NOT NULL CHECK (gateway IN ('MERCADO_PAGO', 'STRIPE')),
  payment_id TEXT,
  payment_method TEXT CHECK (payment_method IN ('pix', 'credit_card')),
  customer_email TEXT,
  external_reference TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Comentários nas colunas
COMMENT ON TABLE transactions IS 'Tabela para armazenar transações de pagamento com split automático';
COMMENT ON COLUMN transactions.business_id IS 'ID do negócio que recebe o pagamento';
COMMENT ON COLUMN transactions.amount IS 'Valor total da transação';
COMMENT ON COLUMN transactions.admin_fee IS 'Taxa da plataforma (10%)';
COMMENT ON COLUMN transactions.partner_net IS 'Valor líquido para o parceiro (amount - admin_fee)';
COMMENT ON COLUMN transactions.status IS 'Status do pagamento: PAID, PENDING ou REFUNDED';
COMMENT ON COLUMN transactions.gateway IS 'Gateway de pagamento utilizado';
COMMENT ON COLUMN transactions.payment_id IS 'ID do pagamento no gateway (Mercado Pago)';
COMMENT ON COLUMN transactions.payment_method IS 'Método de pagamento: pix ou credit_card';

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_transactions_business_id ON transactions(business_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_payment_id ON transactions(payment_id);
CREATE INDEX IF NOT EXISTS idx_transactions_external_reference ON transactions(external_reference);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at DESC);

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar updated_at
DROP TRIGGER IF EXISTS update_transactions_updated_at ON transactions;
CREATE TRIGGER update_transactions_updated_at
  BEFORE UPDATE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Habilitar Row Level Security
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Política: Usuários autenticados podem ver suas próprias transações
DROP POLICY IF EXISTS "Users can view their own business transactions" ON transactions;
CREATE POLICY "Users can view their own business transactions"
  ON transactions FOR SELECT
  USING (
    auth.uid()::text IN (
      SELECT owner_id FROM businesses WHERE id = transactions.business_id
    )
    OR auth.role() = 'service_role'
    OR auth.role() = 'authenticated'
  );

-- Política: Service role pode inserir transações (usado pelas Edge Functions)
DROP POLICY IF EXISTS "Service role can insert transactions" ON transactions;
CREATE POLICY "Service role can insert transactions"
  ON transactions FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- Política: Service role pode atualizar transações
DROP POLICY IF EXISTS "Service role can update transactions" ON transactions;
CREATE POLICY "Service role can update transactions"
  ON transactions FOR UPDATE
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Política: Super admins podem ver todas as transações
DROP POLICY IF EXISTS "Super admins can view all transactions" ON transactions;
CREATE POLICY "Super admins can view all transactions"
  ON transactions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'SUPER_ADMIN'
    )
  );
