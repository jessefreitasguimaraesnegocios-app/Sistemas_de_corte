-- Criação da tabela de notificações para clientes
CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('APPOINTMENT', 'PURCHASE')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB, -- Dados adicionais (business, service, collaborator, etc)
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, read);

-- Comentários
COMMENT ON TABLE notifications IS 'Tabela de notificações para clientes sobre agendamentos e compras';
COMMENT ON COLUMN notifications.type IS 'Tipo de notificação: APPOINTMENT ou PURCHASE';
COMMENT ON COLUMN notifications.data IS 'Dados adicionais em JSON: business, service, collaborator, products, etc';
COMMENT ON COLUMN notifications.read IS 'Se a notificação foi lida pelo usuário';

-- RLS (Row Level Security)
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Política: Usuários só podem ver suas próprias notificações
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
CREATE POLICY "Users can view their own notifications"
  ON notifications FOR SELECT
  USING (auth.uid()::text = user_id);

-- Política: Service role pode criar notificações
DROP POLICY IF EXISTS "Service role can create notifications" ON notifications;
CREATE POLICY "Service role can create notifications"
  ON notifications FOR INSERT
  WITH CHECK (true);

-- Política: Usuários podem atualizar suas próprias notificações (marcar como lida)
DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
CREATE POLICY "Users can update their own notifications"
  ON notifications FOR UPDATE
  USING (auth.uid()::text = user_id);

-- Função para criar notificação de agendamento
CREATE OR REPLACE FUNCTION create_appointment_notification(
  p_user_id TEXT,
  p_business_name TEXT,
  p_business_type TEXT,
  p_collaborator_name TEXT,
  p_service_name TEXT,
  p_date DATE,
  p_time TIME
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  notification_id UUID;
BEGIN
  INSERT INTO notifications (user_id, type, title, message, data)
  VALUES (
    p_user_id,
    'APPOINTMENT',
    'Agendamento Realizado',
    format('Seu agendamento foi confirmado para %s às %s', p_date::text, p_time::text),
    jsonb_build_object(
      'business_name', p_business_name,
      'business_type', p_business_type,
      'collaborator_name', p_collaborator_name,
      'service_name', p_service_name,
      'date', p_date::text,
      'time', p_time::text
    )
  )
  RETURNING id INTO notification_id;
  
  RETURN notification_id;
END;
$$;

-- Função para criar notificação de compra
CREATE OR REPLACE FUNCTION create_purchase_notification(
  p_user_id TEXT,
  p_business_name TEXT,
  p_business_type TEXT,
  p_amount DECIMAL,
  p_date TIMESTAMP WITH TIME ZONE
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  notification_id UUID;
BEGIN
  INSERT INTO notifications (user_id, type, title, message, data)
  VALUES (
    p_user_id,
    'PURCHASE',
    'Compra Realizada',
    format('Sua compra de R$ %s foi confirmada', p_amount::text),
    jsonb_build_object(
      'business_name', p_business_name,
      'business_type', p_business_type,
      'amount', p_amount,
      'date', p_date::text
    )
  )
  RETURNING id INTO notification_id;
  
  RETURN notification_id;
END;
$$;

-- Permissões
GRANT EXECUTE ON FUNCTION create_appointment_notification TO service_role;
GRANT EXECUTE ON FUNCTION create_purchase_notification TO service_role;
