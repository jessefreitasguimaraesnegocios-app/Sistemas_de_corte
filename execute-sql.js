// Script para executar arquivos SQL via Supabase Management API
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuração do projeto
const PROJECT_REF = 'hgkvhgjtjsycbpeglrrs';
const SUPABASE_URL = `https://${PROJECT_REF}.supabase.co`;

// Arquivos SQL para executar na ordem
const sqlFiles = [
  'supabase/migrations/000_initial_setup.sql',
  // Se preferir migrações individuais, descomente:
  // 'supabase/migrations/001_create_transactions_table.sql',
  // 'supabase/migrations/002_create_businesses_table.sql',
  // 'supabase/migrations/003_setup_webhook_function.sql',
  // 'supabase/migrations/004_create_transactions_view.sql',
  // 'supabase/migrations/005_create_summary_functions.sql',
];

async function executeSQL(sqlContent, filename) {
  console.log(`\n📄 Executando: ${filename}`);
  console.log('─'.repeat(50));
  
  // Dividir em comandos individuais (separados por ;)
  const commands = sqlContent
    .split(';')
    .map(cmd => cmd.trim())
    .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'));

  console.log(`   Encontrados ${commands.length} comandos SQL`);
  console.log(`   ⚠️  Execute este arquivo manualmente no Supabase Dashboard:`);
  console.log(`   📍 https://supabase.com/dashboard/project/${PROJECT_REF}/sql/new`);
  console.log(`\n   Ou use o comando abaixo com psql:\n`);
  console.log(`   psql "postgresql://postgres:[PASSWORD]@db.${PROJECT_REF}.supabase.co:5432/postgres" -f ${filename}\n`);
}

async function main() {
  console.log('🚀 Executando migrações SQL do Supabase');
  console.log('═'.repeat(50));
  console.log(`📦 Projeto: ${PROJECT_REF}`);
  console.log(`🌐 URL: ${SUPABASE_URL}\n`);

  for (const file of sqlFiles) {
    try {
      const filePath = join(__dirname, file);
      const sqlContent = readFileSync(filePath, 'utf-8');
      await executeSQL(sqlContent, file);
    } catch (error) {
      console.error(`❌ Erro ao ler ${file}:`, error.message);
    }
  }

  console.log('\n' + '═'.repeat(50));
  console.log('✅ Processo concluído!');
  console.log('\n💡 Dica: Para executar via CLI, você precisa:');
  console.log('   1. Fazer login: npx supabase login');
  console.log('   2. Linkar projeto: npx supabase link --project-ref hgkvhgjtjsycbpeglrrs');
  console.log('   3. Aplicar migrações: npx supabase db push');
  console.log('\n   Ou execute os SQLs manualmente no Dashboard do Supabase.');
}

main().catch(console.error);
