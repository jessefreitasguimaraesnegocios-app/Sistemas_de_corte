<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1t4uN-KT1oTDr9u0AxrF7NMAoO5QLmW3Z

## Run Locally

**Prerequisites:**  Node.js

1. Install dependencies:
   ```bash
   npm install
   ```

2. Configure environment variables:
   - Copy `.env.example` to `.env.local`
   - Fill in your Supabase credentials:
     - `VITE_SUPABASE_URL`: Your Supabase project URL
     - `VITE_SUPABASE_ANON_KEY`: Your Supabase anonymous key
   - (Optional) Set `GEMINI_API_KEY` for AI features

3. Configure Supabase Edge Functions:
   - Go to your Supabase Dashboard → Edge Functions → Settings
   - Add the following secrets:
     - `MP_ACCESS_TOKEN_VENDEDOR`: Your Mercado Pago access token (vendor account)
     - `MP_SPONSOR_ID_LOJA`: Your Mercado Pago sponsor ID
     - `MP_WEBHOOK_URL`: (Optional) Webhook URL for payment notifications

4. Deploy the Edge Function:
   ```bash
   # Install Supabase CLI if not already installed
   npm install -g supabase
   
   # Login to Supabase
   supabase login
   
   # Link your project
   supabase link --project-ref your-project-ref
   
   # Deploy the function
   supabase functions deploy createPayment
   ```

5. Run the app:
   ```bash
   npm run dev
   ```

## Payment Integration

This app includes Mercado Pago payment integration with automatic split (10% platform fee).

### Features:
- **PIX Payments**: Generate QR codes for instant payments
- **Credit Card Payments**: Secure card processing with tokenization
- **Automatic Split**: 10% fee automatically applied to platform
- **Transaction Tracking**: All payments saved to Supabase database

### Setup Mercado Pago:
1. Create a Mercado Pago account
2. Get your access token from the dashboard
3. Set up split payments (sponsor_id)
4. Configure the secrets in Supabase Edge Functions

### Important Notes:
- The credit card implementation uses a mock token for demonstration
- For production, integrate the official Mercado Pago SDK for secure tokenization
- Install: `npm install @mercadopago/sdk-react` and update `CheckoutModal.tsx`
