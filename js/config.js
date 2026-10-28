// =====================================================================
// config.js: as ÚNICAS configurações do frontend.
// Estas duas podem ficar públicas (quem protege o banco é o RLS).
// NUNCA coloque aqui a chave service_role nem o token do Instagram.
// =====================================================================
window.APP_CONFIG = {
  // Supabase > Project Settings > API > Project URL
  SUPABASE_URL: "https://faiobgzgwduwtitjhsoq.supabase.co",
  // Supabase > Project Settings > API > anon public
  SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZhaW9iZ3pnd2R1d3RpdGpoc29xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMyMDMyNTQsImV4cCI6MjEwODc3OTI1NH0.W78v4DBz8wM3_yQ-0JWabfAyRHmd5FKAcqy6qCHJNks",
};
