-- Adicionar campos para OAuth do Mercado Pago na tabela businesses
ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS mp_refresh_token TEXT,
  ADD COLUMN IF NOT EXISTS mp_token_expires_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS mp_user_id TEXT,
  ADD COLUMN IF NOT EXISTS mp_live_mode BOOLEAN;

COMMENT ON COLUMN businesses.mp_refresh_token IS 'Refresh token do Mercado Pago obtido via OAuth';
COMMENT ON COLUMN businesses.mp_token_expires_at IS 'Data/hora de expiração do access token do Mercado Pago';
COMMENT ON COLUMN businesses.mp_user_id IS 'User ID retornado pelo OAuth do Mercado Pago';
COMMENT ON COLUMN businesses.mp_live_mode IS 'true se o token é de produção, false se é de teste';

-- Índice opcional para acelerar buscas por mp_user_id
CREATE INDEX IF NOT EXISTS idx_businesses_mp_user_id ON businesses(mp_user_id) WHERE mp_user_id IS NOT NULL;
