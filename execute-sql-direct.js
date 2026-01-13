// Script para executar SQL diretamente via Supabase usando a API REST
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PROJECT_REF = 'hgkvhgjtjsycbpeglrrs';
const SUPABASE_URL = `https://${PROJECT_REF}.supabase.co`;

// Você precisa da SERVICE_ROLE_KEY para executar SQL via API
// Encontre em: Supabase Dashboard → Settings → API → service_role key
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

async function executeSQL(sqlContent) {
  if (!SERVICE_ROLE_KEY) {
    console.log('\n❌ SERVICE_ROLE_KEY não encontrada!');
    console.log('\n📝 Para executar via API, você precisa:');
    console.log('   1. Acesse: https://supabase.com/dashboard/project/' + PROJECT_REF + '/settings/api');
    console.log('   2. Copie a "service_role" key (secret)');
    console.log('   3. Execute: $env:SUPABASE_SERVICE_ROLE_KEY="sua-key-aqui"');
    console.log('   4. Execute este script novamente\n');
    return false;
  }

  try {
    // Dividir SQL em comandos individuais
    const commands = sqlContent
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => {
        const trimmed = cmd.trim();
        return trimmed.length > 0 && 
               !trimmed.startsWith('--') && 
               !trimmed.startsWith('COMMENT') &&
               !trimmed.startsWith('DO $$');
      });

    console.log(`\n📤 Executando ${commands.length} comandos SQL...\n`);

    // Executar cada comando via API REST do Supabase
    for (let i = 0; i < commands.length; i++) {
      const cmd = commands[i];
      if (cmd.length < 10) continue; // Pular comandos muito pequenos

      try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${SERVICE_ROLE_KEY}`
          },
          body: JSON.stringify({ query: cmd })
        });

        if (!response.ok) {
          // Tentar método alternativo: usar pg_rest ou executar via psql
          console.log(`⚠️  Comando ${i + 1}/${commands.length} não pode ser executado via API REST`);
        } else {
          console.log(`✅ Comando ${i + 1}/${commands.length} executado`);
        }
      } catch (error) {
        console.log(`⚠️  Erro no comando ${i + 1}: ${error.message}`);
      }
    }

    return true;
  } catch (error) {
    console.error('❌ Erro ao executar SQL:', error.message);
    return false;
  }
}

async function main() {
  console.log('🚀 Executando migrações SQL via API do Supabase');
  console.log('═'.repeat(50));
  console.log(`📦 Projeto: ${PROJECT_REF}`);
  console.log(`🌐 URL: ${SUPABASE_URL}\n`);

  const sqlFile = join(__dirname, 'supabase', 'migrations', '000_initial_setup.sql');
  
  try {
    const sqlContent = readFileSync(sqlFile, 'utf-8');
    const success = await executeSQL(sqlContent);
    
    if (!success) {
      console.log('\n💡 RECOMENDAÇÃO: Execute manualmente no Dashboard');
      console.log(`   https://supabase.com/dashboard/project/${PROJECT_REF}/sql/new\n`);
    }
  } catch (error) {
    console.error('❌ Erro ao ler arquivo SQL:', error.message);
  }
}

main().catch(console.error);
