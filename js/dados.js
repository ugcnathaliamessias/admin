// =====================================================================
// dados.js: TUDO que fala com o Supabase passa por aqui.
// Toda chamada é tolerante a falha: se der erro, devolve vazio/zero e
// a tela mostra um estado vazio em vez de quebrar.
//
// Dois modos:
//   "local"    = aberto em localhost/127.0.0.1/arquivo. Login de teste,
//                automações salvas só neste navegador.
//   "supabase" = no ar. Login e dados de verdade pelo Supabase.
// =====================================================================
window.Dados = (() => {
  const cfg = window.APP_CONFIG || {};
  const CHAVE_LOGIN_LOCAL = "painel_login_local";
  const CHAVE_AUTOS_LOCAL = "painel_automacoes_teste";

  // Site aberto no computador (teste) ou no ar?
  const ehLocal =
    location.protocol === "file:" ||
    ["localhost", "127.0.0.1", "[::1]", ""].includes(location.hostname);

  // O Supabase foi configurado no config.js?
  const configurado =
    /^https:\/\//.test(cfg.SUPABASE_URL || "") &&
    !!cfg.SUPABASE_ANON_KEY && !String(cfg.SUPABASE_ANON_KEY).startsWith("SUA_");

  let sb = null;
  try {
    if (configurado && window.supabase?.createClient) {
      sb = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
    }
  } catch (e) {
    console.warn("Supabase não iniciou:", e);
  }

  // No modo local os dados ficam no navegador
  const usaSupabase = () => !ehLocal && !!sb;

  // ---------- localStorage seguro (pode falhar em janela anônima) ----------
  const ler = (k, padrao) => {
    try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : padrao; } catch { return padrao; }
  };
  const gravar = (k, v) => {
    try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; }
  };
  const apagar = (k) => { try { localStorage.removeItem(k); } catch { /* nada */ } };

  // =================================================================
  // LOGIN
  // =================================================================
  async function sessao() {
    if (ehLocal) {
      const l = ler(CHAVE_LOGIN_LOCAL, null);
      return l ? { modo: "local", email: l.email } : null;
    }
    if (!sb) return null;
    try {
      const { data } = await sb.auth.getSession();
      const s = data?.session;
      return s ? { modo: "supabase", email: s.user?.email } : null;
    } catch {
      return null;
    }
  }

  async function entrar(email, senha) {
    email = (email || "").trim();
    if (ehLocal) {
      // Teste local: qualquer e-mail + senha de 5 dígitos. NÃO é segurança.
      if (!/^\S+@\S+\.\S+$/.test(email)) return { erro: "Digite um e-mail válido." };
      if (!/^\d{5}$/.test(senha || "")) return { erro: "No modo de teste local, a senha precisa ter exatamente 5 dígitos (números)." };
      gravar(CHAVE_LOGIN_LOCAL, { email, em: Date.now() });
      return { ok: true };
    }
    if (!sb) return { erro: "O login ainda não foi configurado (falta preencher o config.js). Veja o LEIA-ME." };
    try {
      const { error } = await sb.auth.signInWithPassword({ email, password: senha });
      if (error) {
        if (/invalid/i.test(error.message)) return { erro: "E-mail ou senha incorretos." };
        if (/confirm/i.test(error.message)) return { erro: "Esse e-mail ainda não foi confirmado no Supabase." };
        return { erro: "Não foi possível entrar agora. Tente de novo em instantes." };
      }
      return { ok: true };
    } catch {
      return { erro: "Sem conexão com o servidor. Confira sua internet." };
    }
  }

  async function sair() {
    apagar(CHAVE_LOGIN_LOCAL);
    if (sb && !ehLocal) { try { await sb.auth.signOut(); } catch { /* nada */ } }
  }

  // Avisa quando a sessão do Supabase expira
  function aoExpirar(cb) {
    if (!sb || ehLocal) return;
    sb.auth.onAuthStateChange((evento, s) => { if (evento === "SIGNED_OUT" || !s) cb(); });
  }

  // =================================================================
  // RESUMOS (contagens simples; contagem "head" não sofre o limite de 1000)
  // =================================================================
  async function contar(tabela, filtro) {
    if (!usaSupabase()) return 0;
    try {
      let q = sb.from(tabela).select("*", { count: "exact", head: true });
      if (filtro) q = filtro(q);
      const { count, error } = await q;
      return error ? 0 : count || 0;
    } catch {
      return 0;
    }
  }

  async function resumo() {
    if (!usaSupabase()) {
      const autos = ler(CHAVE_AUTOS_LOCAL, []);
      return { leads: 0, ativas: autos.filter((a) => a.active).length, dms7: 0 };
    }
    const seteDias = new Date(Date.now() - 7 * 864e5).toISOString();
    const [leads, ativas, dms7] = await Promise.all([
      contar("ig_leads"),
      contar("ig_automations", (q) => q.eq("active", true)),
      contar("ig_deliveries", (q) => q.eq("status", "ok").gte("ts", seteDias)),
    ]);
    return { leads, ativas, dms7 };
  }

  // Leads por dia nos últimos N dias (paginado de 1000 em 1000)
  async function leadsPorDia(dias = 15) {
    const vazio = serieVazia(dias);
    if (!usaSupabase()) return vazio;
    try {
      const desde = new Date(Date.now() - dias * 864e5).toISOString();
      let todas = [];
      for (let de = 0; ; de += 1000) {
        const { data, error } = await sb.from("ig_leads").select("created_at").gte("created_at", desde).range(de, de + 999);
        if (error || !data) break;
        todas = todas.concat(data);
        if (data.length < 1000) break;
      }
      const mapa = Object.fromEntries(vazio.map((d) => [d.date, 0]));
      for (const l of todas) {
        const d = String(l.created_at).slice(0, 10);
        if (d in mapa) mapa[d]++;
      }
      return vazio.map((d) => ({ date: d.date, value: mapa[d.date] }));
    } catch {
      return vazio;
    }
  }

  function serieVazia(dias) {
    const r = [];
    for (let i = dias - 1; i >= 0; i--) {
      r.push({ date: new Date(Date.now() - i * 864e5).toISOString().slice(0, 10), value: 0 });
    }
    return r;
  }

  // =================================================================
  // AUTOMAÇÕES
  // =================================================================
  async function listarAutomacoes() {
    if (!usaSupabase()) return ler(CHAVE_AUTOS_LOCAL, []);
    try {
      const { data, error } = await sb.from("ig_automations").select("*").order("updated_at", { ascending: false });
      if (error) throw error;
      return data || [];
    } catch (e) {
      console.warn("Não deu pra listar automações:", e);
      return [];
    }
  }

  // Salva (cria ou atualiza). Devolve { ok, row, local } ou { erro }
  async function salvarAutomacao(row) {
    if (!usaSupabase()) {
      const lista = ler(CHAVE_AUTOS_LOCAL, []);
      const agora = new Date().toISOString();
      const nova = { ...row, id: row.id || cryptoId(), updated_at: agora };
      const i = lista.findIndex((a) => a.id === nova.id);
      if (i >= 0) lista[i] = nova; else lista.unshift(nova);
      if (!gravar(CHAVE_AUTOS_LOCAL, lista)) return { erro: "Não deu pra salvar neste navegador (armazenamento bloqueado)." };
      return { ok: true, row: nova, local: true };
    }
    try {
      const corpo = { ...row };
      if (!corpo.id) delete corpo.id;
      delete corpo.created_at;
      delete corpo.updated_at;
      const { data, error } = await sb.from("ig_automations").upsert(corpo).select().single();
      if (error) throw error;
      return { ok: true, row: data };
    } catch (e) {
      console.warn(e);
      return { erro: "Não foi possível salvar no banco. Confira se os scripts SQL foram rodados e se você está logado." };
    }
  }

  async function apagarAutomacao(id) {
    if (!usaSupabase()) {
      gravar(CHAVE_AUTOS_LOCAL, ler(CHAVE_AUTOS_LOCAL, []).filter((a) => a.id !== id));
      return { ok: true };
    }
    try {
      const { error } = await sb.from("ig_automations").delete().eq("id", id);
      if (error) throw error;
      return { ok: true };
    } catch {
      return { erro: "Não foi possível apagar agora." };
    }
  }

  async function alternarAtiva(id, active) {
    if (!usaSupabase()) {
      const lista = ler(CHAVE_AUTOS_LOCAL, []);
      const a = lista.find((x) => x.id === id);
      if (a) a.active = active;
      gravar(CHAVE_AUTOS_LOCAL, lista);
      return { ok: true };
    }
    try {
      const { error } = await sb.from("ig_automations").update({ active }).eq("id", id);
      if (error) throw error;
      return { ok: true };
    } catch {
      return { erro: "Não foi possível mudar o status." };
    }
  }

  function cryptoId() {
    try { return crypto.randomUUID(); } catch { return "id-" + Date.now() + "-" + Math.random().toString(16).slice(2); }
  }

  // =================================================================
  // BIBLIOTECA DE ARQUIVOS
  // =================================================================
  async function listarArquivos() {
    if (!usaSupabase()) return [];
    try {
      const { data, error } = await sb.from("ig_assets").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    } catch {
      return [];
    }
  }

  async function enviarArquivo(arquivo) {
    if (!usaSupabase()) return { erro: "Enviar arquivos só funciona com o Supabase configurado (veja o LEIA-ME)." };
    try {
      const tipo = arquivo.type.startsWith("image/") ? "image"
        : arquivo.type.startsWith("audio/") ? "audio"
        : arquivo.type.startsWith("video/") ? "video" : "file";
      const caminho = `${Date.now()}-${arquivo.name.replace(/[^\w.\-]+/g, "_")}`;
      const up = await sb.storage.from("ig-assets").upload(caminho, arquivo, { contentType: arquivo.type });
      if (up.error) throw up.error;
      const { data: pub } = sb.storage.from("ig-assets").getPublicUrl(caminho);
      const { data, error } = await sb.from("ig_assets").insert({
        nome: arquivo.name, tipo, public_url: pub.publicUrl, size_bytes: arquivo.size,
      }).select().single();
      if (error) throw error;
      return { ok: true, row: data };
    } catch (e) {
      console.warn(e);
      return { erro: "Não foi possível enviar o arquivo." };
    }
  }

  // =================================================================
  // EDGE FUNCTIONS do painel (ig-insights, ig-media)
  // =================================================================
  async function funcao(nome) {
    if (!usaSupabase()) return null;
    try {
      const { data, error } = await sb.functions.invoke(nome, { method: "GET" });
      if (error) throw error;
      return data;
    } catch (e) {
      console.warn(`Função ${nome} indisponível:`, e);
      return null;
    }
  }

  // =================================================================
  // CALENDÁRIO DE CONTEÚDO (tabela cal_posts)
  // =================================================================
  const CHAVE_CAL_LOCAL = "painel_calendario_teste";

  async function listarPosts(inicio, fim) {
    if (!usaSupabase()) {
      return ler(CHAVE_CAL_LOCAL, []).filter((p) => p.data >= inicio && p.data <= fim);
    }
    try {
      const { data, error } = await sb.from("cal_posts").select("*")
        .gte("data", inicio).lte("data", fim).order("data").order("created_at");
      if (error) throw error;
      return data || [];
    } catch (e) {
      console.warn("Não deu pra listar o calendário:", e);
      return [];
    }
  }

  async function salvarPost(row) {
    if (!usaSupabase()) {
      const lista = ler(CHAVE_CAL_LOCAL, []);
      const novo = { ...row, id: row.id || cryptoId() };
      const i = lista.findIndex((p) => p.id === novo.id);
      if (i >= 0) lista[i] = novo; else lista.push(novo);
      if (!gravar(CHAVE_CAL_LOCAL, lista)) return { erro: "Não deu pra salvar neste navegador." };
      return { ok: true, row: novo, local: true };
    }
    try {
      const corpo = { ...row };
      if (!corpo.id) delete corpo.id;
      delete corpo.created_at;
      delete corpo.updated_at;
      const { data, error } = await sb.from("cal_posts").upsert(corpo).select().single();
      if (error) throw error;
      return { ok: true, row: data };
    } catch (e) {
      console.warn(e);
      return { erro: "Não foi possível salvar no calendário. Confira se o 07_calendario_e_leads.sql foi rodado." };
    }
  }

  async function apagarPost(id) {
    if (!usaSupabase()) {
      gravar(CHAVE_CAL_LOCAL, ler(CHAVE_CAL_LOCAL, []).filter((p) => p.id !== id));
      return { ok: true };
    }
    try {
      const { error } = await sb.from("cal_posts").delete().eq("id", id);
      if (error) throw error;
      return { ok: true };
    } catch {
      return { erro: "Não foi possível apagar agora." };
    }
  }

  // =================================================================
  // LEADS (pessoas que interagiram)
  // =================================================================
  async function listarLeads() {
    if (!usaSupabase()) return [];
    let todos = [];
    try {
      for (let de = 0; ; de += 1000) {
        const { data, error } = await sb.from("ig_leads").select("*")
          .order("updated_at", { ascending: false }).range(de, de + 999);
        if (error) throw error;
        todos = todos.concat(data || []);
        if (!data || data.length < 1000) break;
      }
    } catch (e) {
      console.warn("Não deu pra listar os leads:", e);
    }
    return todos;
  }

  // Apaga TODOS os dados de uma pessoa (pedido de exclusão da LGPD)
  async function excluirLead(igUserId) {
    if (!usaSupabase()) return { erro: "Só funciona com o sistema no ar." };
    try {
      const { error } = await sb.rpc("excluir_lead", { p_ig_user_id: igUserId });
      if (error) throw error;
      return { ok: true };
    } catch (e) {
      console.warn(e);
      return { erro: "Não foi possível excluir agora. Confira se o 07_calendario_e_leads.sql foi rodado." };
    }
  }

  return {
    ehLocal, configurado, usaSupabase,
    listarPosts, salvarPost, apagarPost,
    listarLeads, excluirLead,
    sessao, entrar, sair, aoExpirar,
    resumo, leadsPorDia, serieVazia,
    listarAutomacoes, salvarAutomacao, apagarAutomacao, alternarAtiva,
    listarArquivos, enviarArquivo,
    funcao,
  };
})();
