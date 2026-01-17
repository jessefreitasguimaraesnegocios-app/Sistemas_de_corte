/**
 * Script para verificar se os secrets estão configurados no Supabase
 * Execute: node verificar-secrets.js
 */

const SUPABASE_PROJECT_REF = 'hgkvhgjtjsycbpeglrrs';
const SUPABASE_URL = `https://${SUPABASE_PROJECT_REF}.supabase.co`;

console.log('🔍 Verificando configuração dos secrets...\n');

console.log('📋 SECRETS NECESSÁRIOS para createPayment:\n');

const secrets = [
  {
    name: 'SUPABASE_URL',
    value: SUPABASE_URL,
    required: true,
    description: 'URL do projeto Supabase',
  },
  {
    name: 'SUPABASE_ANON_KEY',
    value: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhna3ZoZ2p0anN5Y2JwZWdscnJzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ0NjQwMzYsImV4cCI6MjA1MDA0MDAzNn0.t1EJKqvhyXULfpImqfVGfj1Z3c6KydH20JqFXvPMZf4',
    required: true,
    description: 'Chave pública anon do Supabase',
    whereToFind: 'Dashboard → Settings → API → anon/public key',
  },
  {
    name: 'SUPABASE_SERVICE_ROLE_KEY',
    value: '⚠️ COLE AQUI A SERVICE_ROLE_KEY DO DASHBOARD',
    required: true,
    description: 'Chave secreta service_role do Supabase',
    whereToFind: 'Dashboard → Settings → API → service_role key (SECRET!)',
    secret: true,
  },
  {
    name: 'MP_SPONSOR_ID_LOJA',
    value: '2622924811',
    required: true,
    description: 'ID do Sponsor (loja) no Mercado Pago',
  },
  {
    name: 'MP_WEBHOOK_URL',
    value: `https://${SUPABASE_PROJECT_REF}.supabase.co/functions/v1/mercadopago-webhook`,
    required: false,
    description: 'URL do webhook do Mercado Pago',
  },
];

console.log('✅ COLE ESTES SECRETS NO SUPABASE DASHBOARD:\n');
console.log('📍 Acesse: https://supabase.com/dashboard/project/' + SUPABASE_PROJECT_REF + '/functions/createPayment/settings\n');
console.log('📍 Vá em "Secrets" e adicione cada um:\n');

secrets.forEach((secret, index) => {
  console.log(`${index + 1}. ${secret.name}${secret.required ? ' (OBRIGATÓRIO)' : ' (opcional)'}`);
  console.log(`   Valor: ${secret.secret ? '⚠️ SECRET - Cole do Dashboard' : secret.value}`);
  console.log(`   Descrição: ${secret.description}`);
  if (secret.whereToFind) {
    console.log(`   Onde encontrar: ${secret.whereToFind}`);
  }
  console.log('');
});

console.log('📝 COMANDO PARA CONFIGURAR VIA CLI (alternativa):\n');
console.log('npx supabase secrets set SUPABASE_URL="' + SUPABASE_URL + '"');
console.log('npx supabase secrets set SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhna3ZoZ2p0anN5Y2JwZWdscnJzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ0NjQwMzYsImV4cCI6MjA1MDA0MDAzNn0.t1EJKqvhyXULfpImqfVGfj1Z3c6KydH20JqFXvPMZf4"');
console.log('npx supabase secrets set SUPABASE_SERVICE_ROLE_KEY="<COLE_AQUI>"');
console.log('npx supabase secrets set MP_SPONSOR_ID_LOJA="2622924811"');
console.log('npx supabase secrets set MP_WEBHOOK_URL="' + secrets[4].value + '"\n');

console.log('⚠️ IMPORTANTE:\n');
console.log('1. Após configurar os secrets, faça redeploy:');
console.log('   npx supabase functions deploy createPayment\n');
console.log('2. O erro 401 pode ser causado por:');
console.log('   - Secrets não configurados');
console.log('   - SUPABASE_ANON_KEY incorreta');
console.log('   - Token JWT expirado (faça logout/login)\n');

console.log('✅ Após configurar, teste novamente o pagamento PIX!');
