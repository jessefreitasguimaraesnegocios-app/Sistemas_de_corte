
import { createClient } from '@supabase/supabase-js';

// Variáveis de ambiente do Vite (precisam ter prefixo VITE_)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://your-project-url.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key';

// Criar instância única do cliente Supabase para evitar múltiplas instâncias
// Usar uma chave única no localStorage para evitar conflitos
const SUPABASE_STORAGE_KEY = 'sb-hgkvhgjtjsycbpeglrrs-auth-token';

let supabaseInstance: ReturnType<typeof createClient> | null = null;

export const supabase = (() => {
  if (!supabaseInstance) {
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        storageKey: SUPABASE_STORAGE_KEY,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
      }
    });
  }
  return supabaseInstance;
})();

export const signInWithGoogle = async (role?: 'BUSINESS_OWNER' | 'CUSTOMER' | 'SUPER_ADMIN') => {
  if (role) {
    // usado após redirect para definir o contexto do login
    window.localStorage.setItem('pending_role', role);
  }
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}${role ? `?role=${role}` : ''}`,
      queryParams: role ? {
        role: role
      } : {}
    }
  });
  if (error) throw error;
  return data;
};

export const signInWithEmail = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });
  if (error) throw error;
  return data;
};

export const signUpWithEmail = async (email: string, password: string, name?: string) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: name || email.split('@')[0],
        role: 'BUSINESS_OWNER'
      }
    }
  });
  if (error) throw error;
  return data;
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};

export const updatePassword = async (newPassword: string) => {
  const { data, error } = await supabase.auth.updateUser({
    password: newPassword
  });
  if (error) throw error;
  return data;
};
