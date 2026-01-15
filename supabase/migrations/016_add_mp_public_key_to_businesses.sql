-- Adicionar campo mp_public_key na tabela businesses
-- A public key é necessária para usar o SDK do Mercado Pago no frontend

ALTER TABLE businesses 
ADD COLUMN IF NOT EXISTS mp_public_key TEXT;

COMMENT ON COLUMN businesses.mp_public_key IS 'Public key do Mercado Pago para uso no SDK do frontend. Obtenha no painel do desenvolvedor: https://www.mercadopago.com.br/developers/panel';
