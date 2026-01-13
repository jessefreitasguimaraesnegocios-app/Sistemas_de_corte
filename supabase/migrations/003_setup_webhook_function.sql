-- Função para processar webhooks do Mercado Pago
-- Esta função pode ser chamada quando o Mercado Pago notificar sobre mudanças no status do pagamento

CREATE OR REPLACE FUNCTION process_mercado_pago_webhook(
  payment_id_param TEXT,
  status_param TEXT,
  status_detail_param TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Atualiza o status da transação baseado no webhook do Mercado Pago
  UPDATE transactions
  SET 
    status = CASE 
      WHEN status_param = 'approved' THEN 'PAID'
      WHEN status_param = 'pending' THEN 'PENDING'
      WHEN status_param = 'rejected' OR status_param = 'cancelled' THEN 'PENDING'
      WHEN status_param = 'refunded' THEN 'REFUNDED'
      ELSE status
    END,
    updated_at = NOW()
  WHERE transactions.payment_id = payment_id_param;
  
  -- Log da atualização (opcional - pode criar uma tabela de logs)
  RAISE NOTICE 'Transaction % updated to status: %', payment_id_param, status_param;
END;
$$;

-- Comentário na função
COMMENT ON FUNCTION process_mercado_pago_webhook IS 'Processa webhooks do Mercado Pago para atualizar status de transações';

-- Permissão para service role executar a função
GRANT EXECUTE ON FUNCTION process_mercado_pago_webhook TO service_role;
