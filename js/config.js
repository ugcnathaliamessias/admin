// =====================================================================
// config.js: as ÚNICAS configurações do frontend.
// Estas duas podem ficar públicas (quem protege o banco é o RLS).
// NUNCA coloque aqui a chave service_role nem o token do Instagram.
// =====================================================================
window.APP_CONFIG = {
  // Supabase > Project Settings > API > Project URL
  SUPABASE_URL: "SEU_SUPABASE_URL_AQUI",
  // Supabase > Project Settings > API > anon public
  SUPABASE_ANON_KEY: "SUA_SUPABASE_ANON_KEY_AQUI",
};
