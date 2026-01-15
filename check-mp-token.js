// Script simples para verificar se o mp_access_token está sendo encontrado
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

// Carregar .env manualmente
const envFile = readFileSync('.env', 'utf-8');
const envVars = {};
envFile.split('\n').forEach(line => {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) {
    envVars[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, '');
  }
});

const SUPABASE_URL = envVars.VITE_SUPABASE_URL || envVars.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = envVars.VITE_SUPABASE_SERVICE_ROLE_KEY || envVars.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Erro: Variáveis de ambiente não encontradas no .env');
  console.log('\n💡 Verifique se o arquivo .env contém:');
  console.log('   VITE_SUPABASE_URL=https://seu-projeto.supabase.co');
  console.log('   VITE_SUPABASE_SERVICE_ROLE_KEY=sua-service-role-key\n');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function checkBusinesses() {
  try {
    console.log('🔍 Verificando businesses e mp_access_token...\n');

    // Buscar todos os businesses
    const { data: allBusinesses, error: allError } = await supabase
      .from('businesses')
      .select('id, name, status, mp_access_token')
      .order('created_at', { ascending: false });

    if (allError) {
      console.error('❌ Erro ao buscar businesses:', allError);
      return;
    }

    console.log(`📊 Total de businesses: ${allBusinesses?.length || 0}\n`);

    // Separar por status
    const active = allBusinesses?.filter(b => b.status === 'ACTIVE') || [];
    const withToken = active.filter(b => b.mp_access_token && b.mp_access_token.trim() !== '');
    const withoutToken = active.filter(b => !b.mp_access_token || b.mp_access_token.trim() === '');

    console.log(`✅ Businesses ATIVOS: ${active.length}`);
    console.log(`   🟢 Com token: ${withToken.length}`);
    console.log(`   🔴 Sem token: ${withoutToken.length}\n`);

    if (withToken.length > 0) {
      console.log('📋 Businesses COM TOKEN:');
      withToken.forEach((biz, i) => {
        const tokenPreview = biz.mp_access_token.substring(0, 30) + '...';
        console.log(`   ${i + 1}. ${biz.name} (${biz.id})`);
        console.log(`      Token: ${tokenPreview}`);
      });
      console.log('');
    }

    if (withoutToken.length > 0) {
      console.log('⚠️  Businesses SEM TOKEN (precisam configurar):');
      withoutToken.forEach((biz, i) => {
        console.log(`   ${i + 1}. ${biz.name} (${biz.id})`);
      });
      console.log('');
    }

    // Testar busca como a Edge Function faz
    if (active.length > 0) {
      const testBusiness = active[0];
      console.log(`\n🧪 Testando busca como a Edge Function (business_id: ${testBusiness.id}):`);
      
      const { data: testResult, error: testError } = await supabase
        .from('businesses')
        .select('id, name, mp_access_token, revenue_split, status')
        .eq('id', testBusiness.id)
        .single();

      if (testError) {
        console.error('   ❌ Erro na busca:', testError);
      } else {
        console.log('   ✅ Business encontrado:', {
          id: testResult.id,
          name: testResult.name,
          has_token: !!testResult.mp_access_token,
          token_length: testResult.mp_access_token?.length || 0
        });
      }
    }

    console.log('\n💡 Para corrigir, execute a migração 014_fix_mp_access_token.sql no Supabase Dashboard');
    console.log('   https://supabase.com/dashboard/project/[seu-projeto]/sql/new\n');

  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

checkBusinesses();
