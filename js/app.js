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

  // Perfil em uso: Nathalia (UGC) ou Vai Ter Estrada. Um botão só, que vale
  // pro Instagram, Portfólio e Marcas & prospecção (mesma chave do Abordagens).
  const PERFIS = [
    { v: "nathalia", t: "Nathalia (UGC)" },
    { v: "vaiterestrada", t: "Vai Ter Estrada" },
  ];
  const CHAVE_PERFIL = "painel_abord_perfil";
  function perfilAtual() {
    try { return JSON.parse(localStorage.getItem(CHAVE_PERFIL)) === "vaiterestrada" ? "vaiterestrada" : "nathalia"; } catch { return "nathalia"; }
  }
  // liga/desliga as cores do Vai Ter Estrada no painel todo
  function temaVte(ligado) {
    if (ligado) document.documentElement.dataset.tema = "vte"; else delete document.documentElement.dataset.tema;
    const corBarra = document.querySelector('meta[name="theme-color"]');
    if (corBarra) corBarra.content = ligado ? "#4D5B2F" : "#860120";
  }
  function seletorPerfil() {
    const atual = perfilAtual();
    return `<div class="abord-perfis" role="group" aria-label="Perfil">
      ${PERFIS.map((p) => `<button type="button" class="abord-perfil ${p.v === atual ? "ativo" : ""}" data-trocar-perfil="${p.v}" aria-pressed="${p.v === atual}">${p.t}</button>`).join("")}
    </div>`;
  }

  // =================================================================
  // INÍCIO
  // =================================================================
  async function telaInicio(el) {
    const h = new Date().getHours();
    const saudacao = h < 12 ? "Bom dia, Nath ☀️" : h < 18 ? "Boa tarde, Nath 🌤️" : "Boa noite, Nath 🌙";
    const dataHoje = new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });
    el.innerHTML = `
      <div class="cabecalho">
        <div>
          <h1>${saudacao}</h1>
          <p class="muted">Hoje é ${esc(dataHoje)}. Bora fazer acontecer 💗</p>
        </div>
      </div>
      <h2 class="secao-titulo" style="margin-top:0">📌 Seu dia</h2>
      <div class="inicio-dia">
        <a class="card inicio-card" href="#abordagens/controle"><span class="inicio-emoji">📨</span><span class="rotulo">Follow-ups pra hoje</span><div class="kpi-valor" id="ini-follow">…</div></a>
        <a class="card inicio-card" href="#quadro"><span class="inicio-emoji">📌</span><span class="rotulo">Pra hoje no Quadro</span><div class="kpi-valor" id="ini-tarefas">…</div></a>
        <a class="card inicio-card" href="#financeiro"><span class="inicio-emoji">💸</span><span class="rotulo">Recebido no mês</span><div class="kpi-valor" id="ini-recebido">…</div><div class="kpi-sub" id="ini-areceber"></div></a>
        <a class="card inicio-card" href="#quadro"><span class="inicio-emoji">🗂️</span><span class="rotulo">Cartões no quadro</span><div class="kpi-valor" id="ini-ideias">…</div></a>
      </div>
      <div id="ini-metas"></div>
      <h2 class="secao-titulo">⚡ Atalhos</h2>
      <div class="atalhos">
        <a class="card atalho" href="#abordagens/lista"><span class="atalho-emoji">🚀</span><span><strong>Lista do dia</strong><br><span class="muted">Mandar abordagens pras marcas</span></span></a>
        <a class="card atalho" href="#quadro"><span class="atalho-emoji">🗂️</span><span><strong>Quadro</strong><br><span class="muted">O que começar e o que já andou</span></span></a>
        <a class="card atalho" href="#calendario"><span class="atalho-emoji">📅</span><span><strong>Calendário</strong><br><span class="muted">Planejar os conteúdos</span></span></a>
        <a class="card atalho" href="#portfolio"><span class="atalho-emoji">🖼️</span><span><strong>Portfólio</strong><br><span class="muted">Subir vídeo novo</span></span></a>
      </div>
      <h2 class="secao-titulo">📸 Instagram</h2>
      <div class="grade grade-3">
        ${cartaoKpi("👥 Leads captados", "kpi-leads", "Pessoas que interagiram")}
        ${cartaoKpi("🤖 Automações ativas", "kpi-ativas", "Respondendo agora")}
        ${cartaoKpi("💌 DMs enviadas", "kpi-dms", "Nos últimos 7 dias")}
      </div>`;
    const escreve = (sel, txt) => { const x = $(sel); if (x) x.textContent = txt; };
    Abordagens.pendentesHoje().then((n) => escreve("#ini-follow", num(n))).catch(() => escreve("#ini-follow", "-"));
    Quadro.contarHoje().then((n) => escreve("#ini-tarefas", num(n))).catch(() => escreve("#ini-tarefas", "-"));
    Quadro.contarAbertos().then((n) => escreve("#ini-ideias", num(n))).catch(() => escreve("#ini-ideias", "-"));
    Gestao.resumo().then((g) => {
      escreve("#ini-recebido", Gestao.reais(g.recebidoMes));
      escreve("#ini-areceber", g.aReceber ? `⏳ ${Gestao.reais(g.aReceber)} a receber` : "");
      const caixa = $("#ini-metas");
      if (caixa && g.metas.length) caixa.innerHTML = `<h2 class="secao-titulo">🎯 Suas metas</h2><div class="metas-mini">${g.metas.map(Gestao.cartaoMetaMini).join("")}</div>`;
    }).catch(() => {});
    const r = await Dados.resumo();
    escreve("#kpi-leads", num(r.leads));
    escreve("#kpi-ativas", num(r.ativas));
    escreve("#kpi-dms", num(r.dms7));
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
    if (perfilAtual() === "vaiterestrada") return VaiTerEstrada.abrirInstagram(el, sub);
    const aba = ["metricas", "leads", "analise"].includes(sub) ? sub : "automacoes";
    el.innerHTML = `
      <div class="cabecalho">
        <div>
          <h1>📸 Instagram</h1>
          <p class="muted">Acompanhe sua conta e crie respostas automáticas no direct.</p>
        </div>
        ${seletorPerfil()}
      </div>
      <div class="abas" role="tablist">
        <button class="aba ${aba === "metricas" ? "ativa" : ""}" data-aba="metricas" role="tab">📊 Métricas</button>
        <button class="aba ${aba === "automacoes" ? "ativa" : ""}" data-aba="automacoes" role="tab">🤖 Automações</button>
        <button class="aba ${aba === "leads" ? "ativa" : ""}" data-aba="leads" role="tab">👥 Leads</button>
        <button class="aba ${aba === "analise" ? "ativa" : ""}" data-aba="analise" role="tab">🧭 Análise e ideias</button>
      </div>
      <div id="aba-conteudo"></div>`;
    el.querySelectorAll(".aba").forEach((b) =>
      b.addEventListener("click", () => { location.hash = `#instagram/${b.dataset.aba}`; })
    );
    const alvo = $("#aba-conteudo");
    if (aba === "metricas") Metricas.render(alvo);
    else if (aba === "leads") Leads.render(alvo);
    else if (aba === "analise") Analise.render(alvo, "nathalia");
    else Automacoes.renderLista(alvo);
  }

  // =================================================================
  // ROTAS
  // =================================================================
  function rotear() {
    let [rota, sub] = (location.hash.replace(/^#/, "") || "inicio").split("/");
    if (rota === "ideias" || rota === "tarefas") rota = "quadro"; // Banco de ideias e Tarefas viraram o Quadro
    document.querySelectorAll(".menu-item[data-rota]").forEach((a) =>
      a.classList.toggle("ativo", a.dataset.rota === rota)
    );
    $("#menu").classList.remove("aberto");
    $("#menu-toggle").setAttribute("aria-expanded", "false");
    const el = $("#rota");
    // telas com o seletor de perfil ganham as cores do Vai Ter Estrada quando ele está escolhido
    temaVte(["instagram", "portfolio", "abordagens"].includes(rota) && perfilAtual() === "vaiterestrada");
    // cada tela coloca os próprios cliques; limpa os da tela anterior
    el.onclick = el.onchange = el.oninput = null;
    if (rota === "calendario") telaCalendario(el);
    else if (rota === "instagram") telaInstagram(el, sub);
    else if (rota === "abordagens") Abordagens.render(el, sub);
    else if (rota === "portfolio") {
      if (perfilAtual() === "vaiterestrada") VaiTerEstrada.abrirMidiaKit(el);
      else Portfolio.render(el, sub);
    }
    else if (rota === "quadro") Quadro.render(el);
    else if (rota === "tarefas") Gestao.telaTarefas(el);
    else if (rota === "metas") Gestao.telaMetas(el);
    else if (rota === "financeiro") Gestao.telaFinanceiro(el);
    else telaInicio(el);
    window.scrollTo(0, 0);
  }

  // =================================================================
  // LOGIN / LOGOUT
  // =================================================================
  function mostrarLogin() {
    $("#tela-app").hidden = true;
    $("#editor").hidden = true;
    $("#tela-nova-senha").hidden = true;
    $("#tela-login").hidden = false;
    $("#login-aviso-local").hidden = !Dados.ehLocal;
    $("#btn-esqueci").hidden = Dados.ehLocal;
    if (Dados.ehLocal) $("#login-senha").setAttribute("inputmode", "numeric");
    setTimeout(() => $("#login-email").focus(), 50);
  }

  function mostrarNovaSenha() {
    $("#tela-app").hidden = true;
    $("#tela-login").hidden = true;
    $("#tela-nova-senha").hidden = false;
    setTimeout(() => $("#nova-senha").focus(), 50);
  }

  function mostrarApp(s) {
    $("#tela-login").hidden = true;
    $("#tela-nova-senha").hidden = true;
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

    // esqueci minha senha: manda o e-mail com o link
    $("#btn-esqueci").addEventListener("click", async () => {
      const erro = $("#login-erro"), ok = $("#login-ok"), btn = $("#btn-esqueci");
      erro.hidden = true; ok.hidden = true;
      btn.disabled = true;
      const r = await Dados.pedirNovaSenha($("#login-email").value);
      btn.disabled = false;
      if (r.erro) { erro.textContent = r.erro; erro.hidden = false; $("#login-email").focus(); return; }
      ok.textContent = "Se esse e-mail estiver cadastrado, chega em instantes um link pra criar uma senha nova. Confira também o spam.";
      ok.hidden = false;
    });

    // criar senha nova (veio pelo link do e-mail)
    $("#form-nova-senha").addEventListener("submit", async (e) => {
      e.preventDefault();
      const erro = $("#nova-senha-erro"), btn = $("#btn-nova-senha");
      const s1 = $("#nova-senha").value, s2 = $("#nova-senha-2").value;
      erro.hidden = true;
      if (s1.length < 8) { erro.textContent = "A senha precisa ter pelo menos 8 caracteres."; erro.hidden = false; return; }
      if (s1 !== s2) { erro.textContent = "As duas senhas não são iguais."; erro.hidden = false; return; }
      btn.disabled = true; btn.textContent = "Salvando...";
      const r = await Dados.trocarSenha(s1);
      btn.disabled = false; btn.textContent = "Salvar senha nova";
      if (r.erro) { erro.textContent = r.erro; erro.hidden = false; return; }
      $("#nova-senha").value = ""; $("#nova-senha-2").value = "";
      toast("Senha nova salva. Use ela nos próximos logins.", "ok");
      const s = await Dados.sessao();
      if (s) mostrarApp(s); else mostrarLogin();
    });

    // sair
    $("#btn-sair").addEventListener("click", async () => {
      if (!Automacoes.podeSair()) return;
      await Dados.sair();
      location.hash = "";
      mostrarLogin();
    });

    // botão de perfil (Nathalia / Vai Ter Estrada) no Instagram e no Portfólio
    document.addEventListener("click", (e) => {
      const b = e.target.closest("[data-trocar-perfil]");
      if (!b) return;
      try { localStorage.setItem(CHAVE_PERFIL, JSON.stringify(b.dataset.trocarPerfil)); } catch { /* nada */ }
      rotear();
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
    // link do e-mail: limpa o endereço e abre a tela certa
    if (Dados.veioDeRecuperacao || Dados.erroDoLink) history.replaceState(null, "", location.pathname);
    if (Dados.veioDeRecuperacao && s) return mostrarNovaSenha();
    if (s) mostrarApp(s);
    else {
      mostrarLogin();
      if (Dados.erroDoLink) { $("#login-erro").textContent = Dados.erroDoLink; $("#login-erro").hidden = false; }
    }
  }

  return { iniciar, toast, esc, icone, num, $, perfilAtual, seletorPerfil, temaVte };
})();
