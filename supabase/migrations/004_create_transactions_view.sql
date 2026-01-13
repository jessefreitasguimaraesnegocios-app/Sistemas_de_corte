-- View para facilitar consultas de transações com informações do business
CREATE OR REPLACE VIEW transactions_with_business AS
SELECT 
  t.id,
  t.business_id,
  b.name AS business_name,
  b.type AS business_type,
  t.amount,
  t.admin_fee,
  t.partner_net,
  t.date,
  t.status,
  t.gateway,
  t.payment_id,
  t.payment_method,
  t.customer_email,
  t.external_reference,
  t.created_at,
  t.updated_at,
  ROUND((t.admin_fee / NULLIF(t.amount, 0)) * 100, 2) AS fee_percentage
FROM transactions t
LEFT JOIN businesses b ON t.business_id = b.id;

-- Comentário na view
COMMENT ON VIEW transactions_with_business IS 'View que combina transações com informações do negócio';

-- Política RLS para a view (herda das tabelas base)
-- A view usa as políticas das tabelas transactions e businesses
