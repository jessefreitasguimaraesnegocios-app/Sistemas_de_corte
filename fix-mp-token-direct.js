// Script para executar a migração 014_fix_mp_access_token.sql diretamente
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Carregar variáveis de ambiente
import dotenv from 'dotenv';
dotenv.config({ path: join(__dirname, '.env') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Erro: Variáveis de ambiente SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY não configuradas');
  console.log('\n💡 Configure no arquivo .env:');
  console.log('   VITE_SUPABASE_URL=https://seu-projeto.supabase.co');
  console.log('   VITE_SUPABASE_SERVICE_ROLE_KEY=sua-service-role-key');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function executeSQL() {
  try {
    console.log('🔧 Executando correção do campo mp_access_token...\n');

    // Ler o arquivo SQL
    const sqlFile = join(__dirname, 'supabase', 'migrations', '014_fix_mp_access_token.sql');
    const sql = readFileSync(sqlFile, 'utf-8');

    // Dividir em comandos individuais (removendo comentários e blocos DO)
    const commands = sql
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd && !cmd.startsWith('--') && cmd.length > 0);

    // Executar comandos SQL via RPC ou diretamente
    // Como não podemos executar DDL diretamente via REST API, vamos usar uma abordagem diferente
    
    console.log('📋 Verificando businesses no banco...\n');

    // Verificar businesses ativos
    const { data: businesses, error: checkError } = await supabase
      .from('businesses')
      .select('id, name, status, mp_access_token')
      .eq('status', 'ACTIVE')
      .limit(10);

    if (checkError) {
      console.error('❌ Erro ao verificar businesses:', checkError);
      return;
    }

    console.log(`📊 Encontrados ${businesses?.length || 0} businesses ativos:\n`);
    
    businesses?.forEach((biz, index) => {
      const hasToken = biz.mp_access_token && biz.mp_access_token.trim() !== '';
      const tokenStatus = hasToken ? '✅ COM TOKEN' : '❌ SEM TOKEN';
      const tokenPreview = hasToken ? biz.mp_access_token.substring(0, 30) + '...' : 'N/A';
      
      console.log(`${index + 1}. ${biz.name} (${biz.id})`);
      console.log(`   Status: ${tokenStatus}`);
      if (hasToken) {
        console.log(`   Token: ${tokenPreview}`);
      }
      console.log('');
    });

    console.log('💡 Para executar a migração completa, use uma das opções:');
    console.log('   1. Supabase Dashboard > SQL Editor > Execute o arquivo:');
    console.log('      supabase/migrations/014_fix_mp_access_token.sql');
    console.log('');
    console.log('   2. Ou execute via Supabase CLI (se configurado):');
    console.log('      supabase db push');
    console.log('');

  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

executeSQL();
