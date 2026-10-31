// =====================================================================
// app.js: login, menu lateral, rotas (Início, Calendário, Instagram)
// e utilidades usadas pelas outras telas.
// =====================================================================
window.App = (() => {
  const $ = (sel, raiz = document) => raiz.querySelector(sel);

  // Escapa texto pra colocar em HTML com segurança
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  // Ícones (SVG em linha, sem depender de nada)
  const ICONES = {
    leads: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
    raio: '<path d="M13 2 3 14h9l-1 8 10-12h-9z"/>',
    envio: '<path d="m22 2-7 20-4-9-9-4z"/><path d="M22 2 11 13"/>',
    insta: '<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/>',
    calendario: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
    seta: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    grafico: '<path d="M3 3v18h18"/><path d="M7 15l4-4 3 3 5-6"/>',
    link: '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
    lapis: '<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z"/>',
    lixo: '<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>',
    mais: '<path d="M12 5v14M5 12h14"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
    clipe: '<path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>',
    voltar: '<path d="M19 12H5M11 18l-6-6 6-6"/>',
    chat: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
  };
  const icone = (nome, tam = 18) =>
    `<svg viewBox="0 0 24 24" width="${tam}" height="${tam}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONES[nome] || ""}</svg>`;

  // Aviso rápido no canto da tela
  function toast(msg, tipo = "") {
    const t = document.createElement("div");
    t.className = `toast ${tipo}`;
    t.textContent = msg;
    $("#toasts").appendChild(t);
    setTimeout(() => t.remove(), tipo === "aviso" ? 6500 : 3800);
  }

  // Números no formato brasileiro
  const num = (n) => Number(n || 0).toLocaleString("pt-BR");

  // =================================================================
  // INÍCIO
  // =================================================================
  async function telaInicio(el) {
    el.innerHTML = `
      <div class="cabecalho">
        <div>
          <h1>Bem-vindo ao seu painel</h1>
          <p class="muted">Uma visão rápida de como estão suas automações.</p>
        </div>
      </div>
      <div class="grade grade-3">
        ${cartaoKpi("Leads captados", "kpi-leads", "Pessoas que interagiram")}
        ${cartaoKpi("Automações ativas", "kpi-ativas", "Respondendo agora")}
        ${cartaoKpi("DMs enviadas", "kpi-dms", "Nos últimos 7 dias")}
      </div>
      <h2 class="secao-titulo">Atalhos</h2>
      <div class="atalhos">
        <a class="card atalho" href="#instagram/automacoes">
          <span class="atalho-icone">${icone("insta", 20)}</span>
          <span><strong>Instagram</strong><br><span class="muted">Métricas e automações de direct</span></span>
        </a>
        <a class="card atalho" href="#instagram/leads">
          <span class="atalho-icone">${icone("leads", 20)}</span>
          <span><strong>Leads</strong><br><span class="muted">Quem interagiu, com planilha pra baixar</span></span>
        </a>
        <a class="card atalho" href="#calendario">
          <span class="atalho-icone">${icone("calendario", 20)}</span>
          <span><strong>Calendário</strong><br><span class="muted">Planeje seus conteúdos</span></span>
        </a>
      </div>`;
    const r = await Dados.resumo();
    $("#kpi-leads").textContent = num(r.leads);
    $("#kpi-ativas").textContent = num(r.ativas);
    $("#kpi-dms").textContent = num(r.dms7);
  }

  function cartaoKpi(titulo, id, sub) {
    return `<div class="card kpi"><span class="rotulo">${titulo}</span><div class="kpi-valor" id="${id}">0</div><div class="kpi-sub">${sub}</div></div>`;
  }

  // =================================================================
  // CALENDÁRIO (placeholder)
  // =================================================================
  function telaCalendario(el) {
    Calendario.render(el);
  }

  // =================================================================
  // INSTAGRAM (sub-abas Métricas e Automações)
  // =================================================================
  function telaInstagram(el, sub) {
    const aba = ["metricas", "leads"].includes(sub) ? sub : "automacoes";
    el.innerHTML = `
      <div class="cabecalho">
        <div>
          <h1>Instagram</h1>
          <p class="muted">Acompanhe sua conta e crie respostas automáticas no direct.</p>
        </div>
      </div>
      <div class="abas" role="tablist">
        <button class="aba ${aba === "metricas" ? "ativa" : ""}" data-aba="metricas" role="tab">Métricas</button>
        <button class="aba ${aba === "automacoes" ? "ativa" : ""}" data-aba="automacoes" role="tab">Automações</button>
        <button class="aba ${aba === "leads" ? "ativa" : ""}" data-aba="leads" role="tab">Leads</button>
      </div>
      <div id="aba-conteudo"></div>`;
    el.querySelectorAll(".aba").forEach((b) =>
      b.addEventListener("click", () => { location.hash = `#instagram/${b.dataset.aba}`; })
    );
    const alvo = $("#aba-conteudo");
    if (aba === "metricas") Metricas.render(alvo);
    else if (aba === "leads") Leads.render(alvo);
    else Automacoes.renderLista(alvo);
  }

  // =================================================================
  // ROTAS
  // =================================================================
  function rotear() {
    const [rota, sub] = (location.hash.replace(/^#/, "") || "inicio").split("/");
    document.querySelectorAll(".menu-item[data-rota]").forEach((a) =>
      a.classList.toggle("ativo", a.dataset.rota === rota)
    );
    $("#menu").classList.remove("aberto");
    $("#menu-toggle").setAttribute("aria-expanded", "false");
    const el = $("#rota");
    if (rota === "calendario") telaCalendario(el);
    else if (rota === "instagram") telaInstagram(el, sub);
    else telaInicio(el);
    window.scrollTo(0, 0);
  }

  // =================================================================
  // LOGIN / LOGOUT
  // =================================================================
  function mostrarLogin() {
    $("#tela-app").hidden = true;
    $("#editor").hidden = true;
    $("#tela-login").hidden = false;
    $("#login-aviso-local").hidden = !Dados.ehLocal;
    if (Dados.ehLocal) $("#login-senha").setAttribute("inputmode", "numeric");
    setTimeout(() => $("#login-email").focus(), 50);
  }

  function mostrarApp(s) {
    $("#tela-login").hidden = true;
    $("#tela-app").hidden = false;
    $("#faixa-local").hidden = s.modo !== "local";
    $("#menu-usuario").textContent = s.email || "";
    rotear();
  }

  async function iniciar() {
    // formulário de login
    $("#form-login").addEventListener("submit", async (e) => {
      e.preventDefault();
      const erro = $("#login-erro");
      const btn = $("#btn-entrar");
      erro.hidden = true;
      btn.disabled = true;
      btn.textContent = "Entrando...";
      const r = await Dados.entrar($("#login-email").value, $("#login-senha").value);
      btn.disabled = false;
      btn.textContent = "Entrar";
      if (r.erro) {
        erro.textContent = r.erro;
        erro.hidden = false;
        return;
      }
      $("#login-senha").value = "";
      const s = await Dados.sessao();
      if (s) mostrarApp(s);
    });

    // sair
    $("#btn-sair").addEventListener("click", async () => {
      if (!Automacoes.podeSair()) return;
      await Dados.sair();
      location.hash = "";
      mostrarLogin();
    });

    // menu no celular
    $("#menu-toggle").addEventListener("click", () => {
      const aberto = $("#menu").classList.toggle("aberto");
      $("#menu-toggle").setAttribute("aria-expanded", String(aberto));
    });

    // trocar de rota (protege o editor com algo não salvo)
    window.addEventListener("hashchange", () => {
      if ($("#tela-app").hidden) return;
      rotear();
    });

    // sessão do Supabase expirou: volta pro login
    Dados.aoExpirar(() => {
      if (!$("#tela-app").hidden) {
        toast("Sua sessão expirou. Entre de novo.", "aviso");
        mostrarLogin();
      }
    });

    const s = await Dados.sessao();
    if (s) mostrarApp(s);
    else mostrarLogin();
  }

  return { iniciar, toast, esc, icone, num, $ };
})();
