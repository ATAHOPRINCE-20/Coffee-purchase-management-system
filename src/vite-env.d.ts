/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  readonly VITE_STANDARD_MOISTURE: string
  readonly VITE_TWILIO_KEY: string
  readonly VITE_RESEND_KEY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
