# 🔐 Configuração do Google OAuth no Supabase

Este guia explica como configurar o login com Google no Supabase para resolver o erro de autenticação.

## 📋 Pré-requisitos

1. Conta no Google Cloud Platform (gratuita)
2. Projeto no Supabase já criado
3. Acesso ao Dashboard do Supabase

---

## 🔧 Passo 1: Criar Credenciais OAuth no Google Cloud

### 1.1 Acessar Google Cloud Console

1. Acesse: https://console.cloud.google.com/
2. Faça login com sua conta Google
3. Crie um novo projeto ou selecione um existente

### 1.2 Configurar Tela de Consentimento OAuth

1. No menu lateral, vá em **APIs & Services** → **OAuth consent screen**
2. Escolha **External** (para desenvolvimento) ou **Internal** (para uso interno)
3. Preencha os campos obrigatórios:
   - **App name**: BelezaHub (ou o nome que preferir)
   - **User support email**: Seu email
   - **Developer contact information**: Seu email
4. Clique em **Save and Continue**
5. Na tela de **Scopes**, clique em **Save and Continue** (pode deixar os escopos padrão)
6. Na tela de **Test users**, adicione seu email de teste (se estiver em modo de teste)
7. Clique em **Save and Continue** e depois **Back to Dashboard**

### 1.3 Criar Credenciais OAuth 2.0

1. Vá em **APIs & Services** → **Credentials**
2. Clique em **+ CREATE CREDENTIALS** → **OAuth client ID**
3. Selecione **Web application**
4. Preencha:
   - **Name**: BelezaHub Web Client
   - **Authorized JavaScript origins**:
     ```
     http://localhost:5173
     http://localhost:3000
     https://hgkvhgjtjsycbpeglrrs.supabase.co
     ```
   - **Authorized redirect URIs**:
     ```
     https://hgkvhgjtjsycbpeglrrs.supabase.co/auth/v1/callback
     http://localhost:5173/auth/v1/callback
     ```
5. Clique em **Create**
6. **IMPORTANTE**: Copie o **Client ID** e **Client Secret** que aparecerão na tela

---

## 🔧 Passo 2: Configurar Google OAuth no Supabase

### 2.1 Acessar Configurações de Autenticação

1. Acesse: https://supabase.com/dashboard/project/hgkvhgjtjsycbpeglrrs/auth/providers
2. Ou vá em: **Authentication** → **Providers** no menu lateral

### 2.2 Habilitar Google Provider

1. Procure por **Google** na lista de providers
2. Clique para habilitar
3. Preencha os campos:
   - **Client ID (for OAuth)**: Cole o Client ID do Google Cloud
   - **Client Secret (for OAuth)**: Cole o Client Secret do Google Cloud
4. Clique em **Save**

### 2.3 Configurar URLs de Redirecionamento

No Supabase, as URLs de redirecionamento são configuradas automaticamente, mas verifique:

1. Vá em **Authentication** → **URL Configuration**
2. Verifique se está configurado:
   - **Site URL**: `http://localhost:5173` (ou sua URL de produção)
   - **Redirect URLs**: Deve incluir:
     ```
     http://localhost:5173/**
     https://hgkvhgjtjsycbpeglrrs.supabase.co/**
     ```

---

## 🔧 Passo 3: Verificar Configuração no Código

O código já está configurado corretamente em `lib/supabase.ts`:

```typescript
export const signInWithGoogle = async () => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin
    }
  });
  if (error) throw error;
  return data;
};
```

---

## ✅ Verificação

Após configurar:

1. **Reinicie o servidor de desenvolvimento**:
   ```bash
   npm run dev
   ```

2. **Teste o login**:
   - Clique em "Sou Estabelecimento"
   - Deve abrir a tela de login do Google
   - Após autorizar, deve redirecionar de volta para a aplicação

---

## 🐛 Solução de Problemas

### Erro: "Something went wrong"

**Possíveis causas:**
1. Client ID ou Client Secret incorretos no Supabase
2. URLs de redirecionamento não configuradas corretamente no Google Cloud
3. OAuth consent screen não configurado

**Solução:**
- Verifique se copiou corretamente o Client ID e Secret
- Confirme que as URLs de redirecionamento no Google Cloud incluem:
  - `https://hgkvhgjtjsycbpeglrrs.supabase.co/auth/v1/callback`

### Pop-up de Segurança do Windows

O pop-up de "Segurança do Windows" é normal e aparece quando o Cursor (ou outro app) tenta abrir o navegador. Você pode:
- Clicar em **Permitir** ou **OK**
- Isso permite que o Cursor abra o navegador para autenticação

### Erro: "redirect_uri_mismatch"

**Causa**: A URL de redirecionamento no código não corresponde à configurada no Google Cloud.

**Solução**: 
- Adicione todas as URLs possíveis no Google Cloud:
  - `https://hgkvhgjtjsycbpeglrrs.supabase.co/auth/v1/callback`
  - `http://localhost:5173/auth/v1/callback`
  - `http://localhost:3000/auth/v1/callback`

---

## 📝 Checklist de Configuração

- [ ] Projeto criado no Google Cloud Platform
- [ ] OAuth consent screen configurado
- [ ] OAuth 2.0 Client ID criado
- [ ] URLs de redirecionamento adicionadas no Google Cloud
- [ ] Client ID e Secret adicionados no Supabase
- [ ] Google provider habilitado no Supabase
- [ ] URLs de redirecionamento configuradas no Supabase
- [ ] Testado o login com Google

---

## 🔗 Links Úteis

- Google Cloud Console: https://console.cloud.google.com/
- Supabase Dashboard: https://supabase.com/dashboard/project/hgkvhgjtjsycbpeglrrs
- Documentação Supabase Auth: https://supabase.com/docs/guides/auth/social-login/auth-google
