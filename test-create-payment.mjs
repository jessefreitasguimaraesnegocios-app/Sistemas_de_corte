import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://hgkvhgjtjsycbpeglrrs.supabase.co';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhna3ZoZ2p0anN5Y2JwZWdscnJzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ0NjQwMzYsImV4cCI6MjA1MDA0MDAzNn0.t1EJKqvhyXULfpImqfVGfj1Z3c6KydH20JqFXvPMZf4';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testCreatePayment() {
  console.log('🧪 Testando createPayment Edge Function...\n');
  
  // 1. Obter sessão
  console.log('1️⃣ Obtendo sessão...');
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  
  if (sessionError || !sessionData?.session) {
    console.error('❌ Erro ao obter sessão:', sessionError);
    console.log('\n📝 AÇÃO NECESSÁRIA: Faça login no app primeiro para obter uma sessão válida');
    console.log('   Depois execute este teste novamente.');
    return;
  }
  
  console.log('✅ Sessão obtida');
  console.log('   - hasSession:', !!sessionData.session);
  console.log('   - hasUser:', !!sessionData.session.user);
  console.log('   - userId:', sessionData.session.user?.id);
  console.log('   - tokenPreview:', sessionData.session.access_token?.substring(0, 30) + '...');
  console.log('');
  
  if (!sessionData.session.user) {
    console.error('❌ Sessão existe mas usuário não (hasUser: false)');
    console.log('\n📝 AÇÃO NECESSÁRIA: Faça logout e login novamente no app');
    return;
  }
  
  // 2. Chamar createPayment
  console.log('2️⃣ Chamando createPayment Edge Function...');
  const { data, error } = await supabase.functions.invoke('createPayment', {
    body: {
      valor: 0.1,
      metodo_pagamento: 'pix',
      email_cliente: 'teste@exemplo.com',
      business_id: '56c882bc-4045-4c1d-990f-3e78c4cbe1d8',
      referencia_externa: `test_${Date.now()}`,
    },
  });
  
  if (error) {
    console.error('\n❌ ERRO AO CHAMAR EDGE FUNCTION:');
    console.error('   - message:', error.message);
    console.error('   - status:', error.status);
    console.error('   - context:', error.context);
    console.log('\n📝 PRÓXIMO PASSO: Verifique os logs no Supabase Dashboard');
    console.log('   URL: https://supabase.com/dashboard/project/hgkvhgjtjsycbpeglrrs/functions/createPayment/logs');
    console.log('   Procure por: "✅ FUNÇÃO createPayment CHAMADA"');
    console.log('   Se não aparecer, a função não está sendo executada (gateway bloqueando)');
    console.log('   Se aparecer, veja o log "👤 USER:" para verificar validação JWT');
    return;
  }
  
  console.log('\n✅ SUCESSO!');
  console.log('   - success:', data.success);
  console.log('   - payment_id:', data.payment_id);
  console.log('   - status:', data.status);
  console.log('   - qr_code:', data.qr_code ? 'presente' : 'ausente');
  console.log('\n🎉 createPayment está funcionando corretamente!');
}

testCreatePayment().catch(console.error);
