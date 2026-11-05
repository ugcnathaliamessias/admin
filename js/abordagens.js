// =====================================================================
// abordagens.js: área "Abordagens" (menu lateral).
//   - Perfil: Nathalia (UGC) ou Vai Ter Estrada, cada um com seus textos
//   - Lista do dia: cola vários @ de marcas e manda o primeiro contato em
//     volume (copiar, abrir perfil, "Enviei")
//   - Controle: marcas abordadas, follow-up no 3º e no 5º dia, pausar e
//     retomar depois
//   - Modelos: primeiro contato, depois que a marca responde, plataformas
//     (até 900 caracteres) e follow-ups. Campos como {marca} se preenchem.
// Tabelas: abord_modelos e abord_contatos (no teste local, no navegador).
// =====================================================================
window.Abordagens = (() => {
  const { esc, icone, toast, num } = App;

  const PERFIS = [
    { v: "nathalia", t: "Nathalia (UGC)" },
    { v: "vaiterestrada", t: "Vai Ter Estrada" },
  ];
  const ABAS = [
    { v: "lista", t: "🚀 Lista do dia" },
    { v: "controle", t: "📋 Controle" },
    { v: "marcas", t: "💬 Modelos" },
    { v: "plataformas", t: "🧩 Plataformas" },
    { v: "followups", t: "🔁 Follow-ups" },
  ];
  const TIPOS = {
    primeiro: "Primeiro contato",
    conversa: "Depois que a marca responde",
    plataforma: "Plataforma",
    followup: "Follow-up",
  };
  // modelos antigos (fria/quente) contam como primeiro contato
  const ehPrimeiro = (t) => ["primeiro", "fria", "quente"].includes(t);
  // por onde a marca foi abordada (guardado na coluna "tipo" do contato)
  const CANAIS = { instagram: "Instagram", email: "E-mail", whatsapp: "WhatsApp", plataforma: "Plataforma" };
  const canalDe = (v) => CANAIS[v] || "Instagram";

  const LIMITE_PLATAFORMA = 900;
  const LIMITE_DM = 1000; // limite de uma mensagem no direct do Instagram

  const SITUACOES = [
    { v: "dm_1", t: "DM sem resposta (3º dia)" },
    { v: "dm_2", t: "DM sem resposta (5º dia)" },
    { v: "time_1", t: "Time de marketing (3º dia)" },
    { v: "time_2", t: "Time de marketing (5º dia)" },
    { v: "proposta", t: "Depois da proposta" },
    { v: "retomar", t: "Retomar contato (marca pausada)" },
  ];
  const STATUS = [
    { v: "a_enviar", t: "Na lista do dia", ativo: false },
    { v: "enviado", t: "DM enviada, sem resposta", ativo: true },
    { v: "time", t: "Direcionada pro time", ativo: true },
    { v: "conversando", t: "Conversando", ativo: true },
    { v: "proposta", t: "Proposta enviada", ativo: true },
    { v: "pausada", t: "Pausada (retomar depois)", ativo: false },
    { v: "fechou", t: "Fechou", ativo: false },
    { v: "recusou", t: "Sem interesse", ativo: false },
    { v: "sem_retorno", t: "Encerrada", ativo: false },
  ];
  // Follow-ups contados a partir da última mensagem: 1º no 3º dia, 2º no
  // 5º dia (2 dias depois do 1º). Sem resposta 2 dias depois: pausar.
  const ESPERA = [3, 2];
  const ESPERA_PAUSAR = 2;
  const RETOMAR_PADRAO = 30; // dias
  // Campos que mudam a cada marca (não ficam lembrados)
  const CAMPOS_DA_MARCA = ["marca", "produto", "contato", "data", "gancho novo"];
  // Campos de uma linha; o resto vira caixa de texto maior
  const CAMPOS_CURTOS = [...CAMPOS_DA_MARCA, "portfólio", "portfolio", "link", "nome", "mês", "mes"];

  const CHAVE_PERFIL = "painel_abord_perfil";
  const CHAVE_META = "painel_abord_meta";
  const CHAVE_MODELO_LISTA = "painel_abord_modelo_lista";
  const lerLocal = (k, p) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : p; } catch { return p; } };
  const gravarLocal = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* nada */ } };

  let el = null;
  let aba = "lista";
  let perfil = lerLocal(CHAVE_PERFIL, "nathalia");
  // Dentro da área Vai Ter Estrada: perfil fixo e abas em outro endereço
  let base = "#abordagens";
  let perfilFixo = null;
  let modelos = [];
  let contatos = [];
  let filtro = "pendentes";

  // ---------- datas ----------
  const pad = (n) => String(n).padStart(2, "0");
  const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const hoje = () => iso(new Date());
  const paraData = (s) => { const [a, m, d] = String(s).split("-").map(Number); return new Date(a, m - 1, d); };
  const somaDias = (s, n) => { const d = paraData(s); d.setDate(d.getDate() + n); return iso(d); };
  const diasEntre = (a, b) => Math.round((paraData(b) - paraData(a)) / 864e5);
  const dataBr = (s) => { const [, m, d] = String(s).split("-"); return `${d}/${m}`; };

  const tamanho = (t) => [...String(t || "")].length; // conta emoji como 1
  const statusDe = (v) => STATUS.find((s) => s.v === v) || STATUS[1];
  const arroba = (c) => String(c.instagram || "").replace(/^@/, "");
  const linkPerfil = (h) => `https://www.instagram.com/${encodeURIComponent(h)}/`;

  // ---------- follow-up ----------
  // Devolve a próxima data de ação: follow-up, pausar ou retomar
  function proximo(c) {
    if (c.status === "pausada") return c.retomar_em ? { data: c.retomar_em, tipo: "retomar" } : null;
    if (!statusDe(c.status).ativo) return null;
    const n = c.followups || 0;
    if (n >= ESPERA.length) return { data: somaDias(c.ultimo_envio, ESPERA_PAUSAR), tipo: "pausar" };
    return { data: somaDias(c.ultimo_envio, ESPERA[n]), tipo: "followup" };
  }
  const vencido = (c) => { const p = proximo(c); return !!p && p.data <= hoje(); };

  function situacaoSugerida(c) {
    const n = c.followups || 0;
    if (c.status === "pausada") return "retomar";
    if (c.status === "proposta") return "proposta";
    if (c.status === "time" || c.status === "conversando") return n >= 1 ? "time_2" : "time_1";
    return n >= 1 ? "dm_2" : "dm_1";
  }

  // ---------- campos {variaveis} ----------
  const RE_CAMPO = /\{([^{}\n]{1,30})\}/g;
  const camposDe = (t) => [...new Set([...String(t || "").matchAll(RE_CAMPO)].map((m) => m[1].trim()))];
  const chaveVars = () => `painel_abord_vars_${perfil}`;
  function preencher(texto, valores) {
    return String(texto || "").replace(RE_CAMPO, (m, k) => {
      const v = valores[k.trim()] || numerosAuto[k.trim()];
      return v ? v : m;
    });
  }
  // campos que o painel preenche sozinho (não aparecem pra digitar)
  const ehAuto = (k) => Object.prototype.hasOwnProperty.call(numerosAuto, k);

  // ---------- números do Vai Ter Estrada (vindos do robô, últimos 30 dias) ----------
  let numerosAuto = {};
  const CAMPOS_AUTO = ["alcance", "visualizações", "compartilhamentos", "salvamentos", "seguidores", "público"];
  function formatarMil(n) {
    n = Number(n) || 0;
    if (n < 1000) return String(n);
    return `${(Math.floor(n / 100) / 10).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mil`;
  }
  // "58% mulheres, 63% entre 35 e 54 anos" (junta as duas faixas maiores quando são vizinhas)
  function resumoPublico(p) {
    if (!p) return "";
    const partes = [];
    const fem = Number(p.mulheres), mas = Number(p.homens);
    if (fem || mas) partes.push(fem >= mas ? `${Math.round(fem)}% mulheres` : `${Math.round(mas)}% homens`);
    const faixas = (p.idades || []).map((f, i) => ({ ...f, i, de: parseInt(f.faixa, 10), ate: parseInt(String(f.faixa).split("-")[1], 10) }))
      .filter((f) => !Number.isNaN(f.de) && !Number.isNaN(f.ate));
    const top = [...faixas].sort((a, b) => b.pct - a.pct).slice(0, 2);
    if (top.length === 2 && Math.abs(top[0].i - top[1].i) === 1) {
      const [a, b] = top[0].i < top[1].i ? top : [top[1], top[0]];
      partes.push(`${Math.round(a.pct + b.pct)}% entre ${a.de} e ${b.ate} anos`);
    } else if (top.length) {
      partes.push(`${Math.round(top[0].pct)}% entre ${top[0].de} e ${top[0].ate} anos`);
    }
    return partes.join(", ");
  }
  async function carregarNumerosVte() {
    numerosAuto = {};
    if (perfil !== "vaiterestrada" || !Dados.lerVte) return;
    try {
      const d = await Dados.lerVte();
      const ig = d?.instagram || {};
      const ins = ig.insights || {};
      const n = {
        alcance: ins.alcance_30d && formatarMil(ins.alcance_30d),
        "visualizações": ins.views_30d && formatarMil(ins.views_30d),
        compartilhamentos: ins.compartilhamentos_30d && formatarMil(ins.compartilhamentos_30d),
        salvamentos: ins.salvamentos_30d && formatarMil(ins.salvamentos_30d),
        seguidores: ig.perfil?.seguidores && formatarMil(ig.perfil.seguidores),
        "público": resumoPublico(ins.publico),
      };
      for (const k of CAMPOS_AUTO) if (n[k]) numerosAuto[k] = n[k];
    } catch { /* sem números: os campos ficam pra preencher à mão */ }
  }

  // =================================================================
  // TELA
  // =================================================================
  // opts.perfil + opts.base: usado pela área Vai Ter Estrada (perfil travado)
  async function render(alvo, sub, opts = {}) {
    el = alvo;
    aba = ABAS.some((a) => a.v === sub) ? sub : "lista";
    base = opts.base || "#abordagens";
    perfilFixo = opts.perfil || null;
    perfil = perfilFixo || lerLocal(CHAVE_PERFIL, "nathalia");
    App.temaVte(perfil === "vaiterestrada");
    el.onclick = aoClicar;
    el.onchange = aoMudar;
    el.oninput = aoDigitar;
    el.innerHTML = cabecalho() + `<div class="card"><p class="muted">Carregando...</p></div>`;
    [modelos, contatos] = await Promise.all([
      Dados.listarAbord("abord_modelos", perfil),
      Dados.listarAbord("abord_contatos", perfil),
      carregarNumerosVte(),
    ]);
    desenhar();
  }

  function cabecalho() {
    const pendentes = contatos.filter(vencido).length;
    const naLista = contatos.filter((c) => c.status === "a_enviar").length;
    const bolinha = (n) => (n ? ` <span class="abord-bolinha">${n}</span>` : "");
    const abas = `
      <div class="abas abas-sub" role="tablist">
        ${ABAS.map((a) => `<button class="aba ${a.v === aba ? "ativa" : ""}" data-acao="aba" data-v="${a.v}" role="tab">${a.t}${a.v === "controle" ? bolinha(pendentes) : a.v === "lista" ? bolinha(naLista) : ""}</button>`).join("")}
      </div>
      ${Dados.usaSupabase() ? "" : `<p class="alerta alerta-atencao">Modo de teste local: tudo fica salvo só neste navegador.</p>`}`;
    if (perfilFixo) return abas;
    return `
      <div class="cabecalho">
        <div>
          <h1>🤝 Marcas &amp; prospecção</h1>
          <p class="muted">Seus textos pra marcas e plataformas, e o controle de quem já recebeu mensagem.</p>
        </div>
        <div class="abord-perfis" role="group" aria-label="Perfil">
          ${PERFIS.map((p) => `<button class="abord-perfil ${p.v === perfil ? "ativo" : ""}" data-acao="perfil" data-v="${p.v}">${p.t}</button>`).join("")}
        </div>
      </div>
      <div class="abas" role="tablist">
        ${ABAS.map((a) => `<button class="aba ${a.v === aba ? "ativa" : ""}" data-acao="aba" data-v="${a.v}" role="tab">${a.t}${a.v === "controle" ? bolinha(pendentes) : a.v === "lista" ? bolinha(naLista) : ""}</button>`).join("")}
      </div>
      ${Dados.usaSupabase() ? "" : `<p class="alerta alerta-atencao">Modo de teste local: tudo fica salvo só neste navegador.</p>`}`;
  }

  function desenhar() {
    let corpo = "";
    if (aba === "lista") corpo = telaLista();
    else if (aba === "controle") corpo = telaControle();
    else if (aba === "marcas") corpo = secaoModelos("primeiro", "Primeiro contato", "A mensagem que vai pra todas as marcas na DM: apresenta você, explica o UGC, pergunta se conhecem e pede o contato de quem cuida de conteúdo.")
      + secaoModelos("conversa", "Depois que a marca responde", "Quando passarem o contato do time (ou disserem \"pode mandar aqui\"): a ideia curta e o pedido pra mandar a proposta.");
    else if (aba === "plataformas") corpo = `
      <p class="alerta alerta-atencao abord-dica-plat"><b>Dica da Lara:</b> nas plataformas, a marca vê as inscrições por ordem de chegada. Ligue as notificações do app da plataforma e se inscreva assim que a campanha aparecer, com o texto pronto (sem ideia nem roteiro). Use o botão <b>Copiar</b> do cartão.</p>`
      + secaoModelos("plataforma", "Plataformas", `Textos prontos pra se inscrever rápido nas campanhas, com limite de ${LIMITE_PLATAFORMA} caracteres.`);
    else corpo = secaoModelos("followup", "Follow-ups", "Mensagens curtas pra quando a marca não respondeu. O Controle sugere a certa pra cada momento.");
    el.innerHTML = cabecalho() + corpo;
  }

  // ---------- LISTA DO DIA ----------
  const modelosPrimeiro = () => modelos.filter((m) => ehPrimeiro(m.tipo));
  function modeloDaLista() {
    const lista = modelosPrimeiro();
    const salvo = lerLocal(CHAVE_MODELO_LISTA, {})[perfil];
    return lista.find((m) => m.id === salvo) || lista[0] || null;
  }

  function telaLista() {
    // Marcas de Black Friday primeiro; depois pela ordem em que entraram
    const fila = contatos.filter((c) => c.status === "a_enviar")
      .sort((a, b) => (ehBlack(b) - ehBlack(a)) || String(a.created_at).localeCompare(String(b.created_at)));
    const enviadasHoje = contatos.filter((c) => c.status !== "a_enviar" && c.primeiro_envio === hoje()).length;
    const meta = Number(lerLocal(CHAVE_META, 50)) || 50;
    const modelo = modeloDaLista();
    const valores = lerLocal(chaveVars(), {});
    // marca e produto são de cada marca (ficam na linha); o resto vale pra lista toda
    const camposModelo = modelo ? camposDe(modelo.texto) : [];
    const pedeProduto = camposModelo.includes("produto");
    const extras = camposModelo.filter((k) => k !== "marca" && k !== "produto" && !ehAuto(k));

    return `
      <div class="card abord-lista-add">
        <label class="campo" style="margin-bottom:10px"><span class="rotulo">Cole os @ das marcas que vai abordar hoje</span>
          <textarea data-lista-entrada rows="3" placeholder="@marca1&#10;@marca2&#10;https://instagram.com/marca3"></textarea></label>
        <div class="abord-lista-add-acoes">
          <span class="muted">Um por linha, ou separados por espaço ou vírgula. Quem já está no controle é ignorado.</span>
          <button class="btn btn-primario" data-acao="lista-add">${icone("mais", 15)} Adicionar à lista</button>
        </div>
      </div>

      <div class="abord-lista-topo">
        <div class="abord-meta">
          <span class="abord-meta-num ${enviadasHoje >= meta ? "batida" : ""}">${num(enviadasHoje)}</span>
          <span class="muted">de <input type="number" min="1" max="300" class="abord-meta-input" data-lista-meta value="${meta}" aria-label="Meta do dia"> enviadas hoje</span>
        </div>
        ${modelo ? `
          <label class="abord-lista-modelo"><span class="rotulo">Mensagem</span>
            <select data-lista-modelo>${modelosPrimeiro().map((m) => `<option value="${esc(m.id)}" ${m.id === modelo.id ? "selected" : ""}>${esc(m.titulo)}</option>`).join("")}</select></label>` : ""}
      </div>

      ${!modelo ? `<p class="alerta alerta-atencao">Crie um modelo de primeiro contato na aba Marcas pra usar a lista.</p>` : ""}
      ${extras.length ? `
        <div class="abord-lista-extras">
          ${extras.map((k) => `<label class="campo"><span class="rotulo">${esc(k)}</span>
            <input type="text" data-lista-var="${esc(k)}" value="${esc(valores[k] || "")}" placeholder="${esc(k)}"></label>`).join("")}
        </div>` : ""}

      ${fila.length ? `
        <div class="card abord-fila">
          ${fila.map((c) => `
            <div class="abord-fila-item">
              <div class="abord-fila-marca">
                <a class="abord-fila-arroba" href="${linkPerfil(arroba(c))}" target="_blank" rel="noopener">@${esc(arroba(c))}</a>
                ${ehBlack(c) ? `<span class="abord-bf">🖤 Black Friday</span>` : ""}
                ${notaCurta(c) ? `<span class="abord-fila-nota" title="${esc(notaCurta(c))}">${esc(notaCurta(c))}</span>` : ""}
              </div>
              <input type="text" class="abord-fila-nome" data-lista-nome data-id="${esc(c.id)}" value="${esc(c.marca)}" placeholder="Nome da marca" aria-label="Nome da marca @${esc(arroba(c))}">
              ${pedeProduto ? `<input type="text" class="abord-fila-nome abord-fila-produto" data-lista-produto data-id="${esc(c.id)}" value="${esc(c.produto || "")}" placeholder="Produto" aria-label="Produto de @${esc(arroba(c))}">` : ""}
              <div class="abord-fila-acoes">
                <button class="btn btn-sm" data-acao="lista-copiar" data-id="${esc(c.id)}" ${modelo ? "" : "disabled"}>${icone("clipe", 14)} Copiar e abrir</button>
                <button class="btn btn-sm btn-primario" data-acao="lista-enviei" data-id="${esc(c.id)}">Enviei</button>
                <button class="btn-icone" data-acao="lista-remover" data-id="${esc(c.id)}" aria-label="Tirar @${esc(arroba(c))} da lista" title="Tirar da lista">${icone("x", 15)}</button>
              </div>
            </div>`).join("")}
        </div>` : `
        <div class="card vazio">
          <div class="vazio-icone">${icone("envio", 24)}</div>
          <h2>Lista vazia</h2>
          <p>Cole os @ das marcas acima. Pra cada uma: <b>Copiar e abrir</b> copia a mensagem com o nome da marca e abre o perfil; você cola na DM, envia e toca em <b>Enviei</b>. A marca vai pro Controle com a data.</p>
        </div>`}
      <p class="muted abord-dica">Pra não ter a conta bloqueada pelo Instagram: comece com 30 a 50 por dia, espalhe em blocos ao longo do dia e confira o nome de cada marca antes de copiar.</p>`;
  }

  // Black Friday: marcado nas notas com "BLACK FRIDAY"
  const ehBlack = (c) => (/black friday/i.test(String(c.notas || "")) ? 1 : 0);
  // nota sem a etiqueta de Black Friday e sem a fonte (que não ajudam na hora de abordar)
  const notaCurta = (c) => String(c.notas || "")
    .replace(/🖤\s*BLACK FRIDAY\s*\([^)]*\)\.?\s*/i, "")
    .replace(/\s*Fonte: Biblioteca de Anúncios[^.]*\.?/i, "")
    .replace(/^Biblioteca de Anúncios \d{2}\/\d{2}\.\s*/i, "")
    .trim();

  // transforma o texto colado em lista de @ (sem repetir)
  function lerArrobas(texto) {
    const achados = [];
    for (let parte of String(texto || "").split(/[\s,;]+/)) {
      parte = parte.trim();
      if (!parte) continue;
      const url = parte.match(/instagram\.com\/([A-Za-z0-9._]+)/i);
      let h = (url ? url[1] : parte).replace(/^@/, "").replace(/\/+$/, "").toLowerCase();
      if (/^[a-z0-9._]{1,30}$/.test(h) && !["p", "reel", "reels", "stories", "explore"].includes(h)) achados.push(h);
    }
    return [...new Set(achados)];
  }

  async function adicionarNaLista() {
    const caixa = el.querySelector("[data-lista-entrada]");
    const novos = lerArrobas(caixa?.value);
    if (!novos.length) return toast("Não achei nenhum @ válido no texto.", "erro");
    const existentes = new Set(contatos.map((c) => arroba(c).toLowerCase()).filter(Boolean));
    const entrar = novos.filter((h) => !existentes.has(h));
    const repetidos = novos.length - entrar.length;
    if (!entrar.length) return toast(`Todas já estão no controle (${repetidos}).`, "aviso");
    const rows = entrar.map((h) => limparContato({
      marca: h, instagram: h, tipo: "instagram", status: "a_enviar", primeiro_envio: hoje(), ultimo_envio: hoje(),
    }));
    const r = await Dados.salvarVariosAbord("abord_contatos", rows);
    if (r.erro) return toast(r.erro, "erro");
    contatos.push(...r.rows);
    toast(`${entrar.length} ${entrar.length === 1 ? "marca adicionada" : "marcas adicionadas"}${repetidos ? `, ${repetidos} já ${repetidos === 1 ? "estava" : "estavam"} no controle` : ""}.`, "ok");
    desenhar();
  }

  async function copiarDaLista(id) {
    const c = contatos.find((x) => x.id === id);
    const modelo = modeloDaLista();
    if (!c || !modelo) return;
    // salva o que estiver digitado na linha antes de copiar
    const linha = (sel) => el.querySelector(`${sel}[data-id="${CSS.escape(id)}"]`)?.value.trim();
    const nomeDigitado = linha("[data-lista-nome]");
    const produtoDigitado = linha("[data-lista-produto]");
    if ((nomeDigitado && nomeDigitado !== c.marca) || (produtoDigitado !== undefined && produtoDigitado !== (c.produto || ""))) {
      const r = await Dados.salvarAbord("abord_contatos", limparContato({
        ...c, marca: nomeDigitado || c.marca, produto: produtoDigitado ?? c.produto,
      }));
      if (!r.erro) Object.assign(c, r.row);
    }
    const valores = { ...lerLocal(chaveVars(), {}), marca: c.marca };
    if (c.produto) valores.produto = c.produto;
    const texto = preencher(modelo.texto, valores);
    await copiar(texto, camposDe(texto));
    if (c.instagram) window.open(linkPerfil(arroba(c)), "_blank", "noopener");
  }

  async function enviouDaLista(id) {
    const c = contatos.find((x) => x.id === id);
    if (!c) return;
    const r = await Dados.salvarAbord("abord_contatos", limparContato({
      ...c, status: "enviado", primeiro_envio: hoje(), ultimo_envio: hoje(), followups: 0,
    }));
    if (r.erro) return toast(r.erro, "erro");
    Object.assign(c, r.row);
    desenhar();
    // deixa o próximo nome pronto pra conferir
    el.querySelector("[data-lista-nome]")?.focus();
  }

  async function removerDaLista(id) {
    const r = await Dados.apagarAbord("abord_contatos", id);
    if (r.erro) return toast(r.erro, "erro");
    contatos = contatos.filter((x) => x.id !== id);
    desenhar();
  }

  // ---------- CONTROLE ----------
  function telaControle() {
    const doControle = contatos.filter((c) => c.status !== "a_enviar");
    const pend = doControle.filter(vencido);
    const andamento = doControle.filter((c) => statusDe(c.status).ativo);
    const pausadas = doControle.filter((c) => c.status === "pausada");
    const encerradas = doControle.filter((c) => !statusDe(c.status).ativo && c.status !== "pausada");
    const grupos = { pendentes: pend, andamento, pausadas, encerradas, todas: doControle };
    if (filtro === "pendentes" && !pend.length && doControle.length) filtro = "andamento";
    const lista = [...(grupos[filtro] || doControle)].sort(ordenar);

    const botaoFiltro = (v, t, n) => `<button class="abord-filtro ${filtro === v ? "ativo" : ""}" data-acao="filtro" data-v="${v}">${t} <b>${n}</b></button>`;

    return `
      <div class="cabecalho" style="margin-bottom:14px">
        <div class="abord-filtros">
          ${botaoFiltro("pendentes", "Pra hoje", pend.length)}
          ${botaoFiltro("andamento", "Em andamento", andamento.length)}
          ${botaoFiltro("pausadas", "Pausadas", pausadas.length)}
          ${botaoFiltro("encerradas", "Encerradas", encerradas.length)}
          ${botaoFiltro("todas", "Todas", doControle.length)}
        </div>
        <button class="btn btn-primario" data-acao="nova-marca">${icone("mais", 16)} Nova marca</button>
      </div>
      ${lista.length ? `
        <div class="card leads-tabela-card">
          <table class="leads-tabela abord-tabela">
            <thead><tr>
              <th scope="col">Marca</th><th scope="col">Canal</th><th scope="col">Status</th>
              <th scope="col">Última mensagem</th><th scope="col">Próximo passo</th><th scope="col"><span class="sr">Ações</span></th>
            </tr></thead>
            <tbody>${lista.map(linhaContato).join("")}</tbody>
          </table>
        </div>
        <p class="muted abord-dica">Follow-up no 3º e no 5º dia depois da última mensagem. Quando a marca te direciona pro time, mude o status pra "Direcionada pro time": a contagem recomeça. Sem resposta depois do 2º follow-up, o painel sugere pausar e retomar no mês seguinte.</p>` : `
        <div class="card vazio">
          <div class="vazio-icone">${icone("envio", 24)}</div>
          <h2>${doControle.length ? "Nada por aqui" : "Nenhuma marca ainda"}</h2>
          <p>${doControle.length ? "Nenhuma marca nesse filtro." : "As marcas da Lista do dia aparecem aqui quando você toca em \"Enviei\". Também dá pra cadastrar uma por uma."}</p>
          ${doControle.length ? "" : `<button class="btn btn-primario" data-acao="nova-marca">${icone("mais", 16)} Cadastrar marca</button>`}
        </div>`}`;
  }

  function ordenar(a, b) {
    const pa = proximo(a), pb = proximo(b);
    if (pa && pb) return pa.data.localeCompare(pb.data);
    if (pa) return -1;
    if (pb) return 1;
    return String(b.ultimo_envio).localeCompare(String(a.ultimo_envio));
  }

  function seloProximo(c) {
    const p = proximo(c);
    if (!p) return `<span class="muted">-</span>`;
    const atraso = diasEntre(p.data, hoje());
    const nome = p.tipo === "retomar" ? "Retomar" : p.tipo === "pausar" ? "Sem resposta: pausar?" : `${(c.followups || 0) + 1}º follow-up`;
    if (atraso > 0 && p.tipo === "followup") return `<span class="abord-selo selo-atrasado">${nome}: atrasado ${atraso} ${atraso === 1 ? "dia" : "dias"}</span>`;
    if (atraso >= 0) return `<span class="abord-selo ${p.tipo === "pausar" ? "selo-encerrar" : "selo-hoje"}">${nome}${p.tipo === "pausar" ? "" : ": hoje"}</span>`;
    return `<span class="abord-selo">${nome} em ${dataBr(p.data)}</span>`;
  }

  function linhaContato(c) {
    const p = proximo(c);
    const h = hoje();
    const insta = arroba(c) ? `<br><a href="${linkPerfil(arroba(c))}" target="_blank" rel="noopener">@${esc(arroba(c))}</a>` : "";
    const dias = diasEntre(c.ultimo_envio, h);
    const quando = dias <= 0 ? "hoje" : dias === 1 ? "ontem" : `há ${dias} dias`;
    const fus = c.followups ? ` · ${c.followups} follow-up${c.followups > 1 ? "s" : ""}` : "";
    const rotuloBotao = !p ? "" : p.tipo === "retomar" ? "Retomar" : p.tipo === "pausar" ? "Pausar" : "Follow-up";
    return `
      <tr>
        <td data-rotulo="Marca"><strong>${esc(c.marca)}</strong>${insta}${c.produto ? `<br><span class="muted">${esc(c.produto)}</span>` : ""}</td>
        <td data-rotulo="Canal"><span class="chip">${esc(canalDe(c.tipo))}</span></td>
        <td data-rotulo="Status">
          <select class="abord-status" data-id="${esc(c.id)}" aria-label="Status de ${esc(c.marca)}">
            ${STATUS.filter((s) => s.v !== "a_enviar").map((s) => `<option value="${s.v}" ${s.v === c.status ? "selected" : ""}>${s.t}</option>`).join("")}
          </select>
        </td>
        <td data-rotulo="Última mensagem">${esc(dataBr(c.ultimo_envio))} <span class="muted">(${quando}${fus})</span></td>
        <td data-rotulo="Próximo passo">${seloProximo(c)}</td>
        <td class="leads-acoes">
          ${p ? `<button class="btn btn-sm ${vencido(c) ? "btn-primario" : ""}" data-acao="followup" data-id="${esc(c.id)}">${icone("envio", 14)} ${rotuloBotao}</button>` : ""}
          <button class="btn btn-sm" data-acao="editar-marca" data-id="${esc(c.id)}" aria-label="Editar ${esc(c.marca)}">${icone("lapis", 14)}</button>
        </td>
      </tr>`;
  }

  // ---------- MODELOS ----------
  function secaoModelos(tipo, titulo, descricao) {
    const lista = modelos.filter((m) => (tipo === "primeiro" ? ehPrimeiro(m.tipo) : m.tipo === tipo))
      .sort((a, b) => (a.ordem - b.ordem) || String(a.created_at).localeCompare(String(b.created_at)));
    return `
      <section class="abord-secao">
        <div class="cabecalho" style="margin-bottom:12px">
          <div><h2>${titulo}</h2><p class="muted">${descricao}</p></div>
          <button class="btn" data-acao="novo-modelo" data-tipo="${tipo}">${icone("mais", 15)} Novo modelo</button>
        </div>
        ${lista.length ? `<div class="abord-modelos">${lista.map(cartaoModelo).join("")}</div>` : `
          <div class="card abord-vazio">
            <p class="muted">Nenhum modelo ainda. ${perfil === "vaiterestrada" ? "Pro Vai Ter Estrada, a apresentação fala do perfil e das métricas em vez de UGC." : ""}</p>
          </div>`}
      </section>`;
  }

  function cartaoModelo(m) {
    const limite = m.tipo === "plataforma" ? LIMITE_PLATAFORMA : LIMITE_DM;
    const n = tamanho(m.texto);
    const sit = m.tipo === "followup" ? SITUACOES.find((s) => s.v === m.situacao)?.t : "";
    return `
      <article class="card abord-modelo">
        <div class="abord-modelo-topo">
          <h3>${esc(m.titulo)}</h3>
          <span class="abord-contador ${n > limite ? "estourou" : ""}">${num(n)} / ${num(limite)}</span>
        </div>
        ${sit ? `<span class="chip">${esc(sit)}</span>` : ""}
        <p class="abord-texto">${destacar(m.texto)}</p>
        <div class="abord-modelo-acoes">
          <button class="btn btn-sm btn-primario" data-acao="copiar-rapido" data-id="${esc(m.id)}" title="Copia na hora, com os campos que você já preencheu antes">${icone("clipe", 14)} Copiar</button>
          <button class="btn btn-sm" data-acao="usar" data-id="${esc(m.id)}">${icone("envio", 14)} Preencher</button>
          <button class="btn btn-sm" data-acao="editar-modelo" data-id="${esc(m.id)}">${icone("lapis", 14)} Editar</button>
        </div>
      </article>`;
  }

  // mostra {campos} destacados
  const destacar = (t) => esc(t).replace(/\{([^{}\n]{1,30})\}/g, '<mark class="abord-campo">{$1}</mark>');

  // =================================================================
  // EVENTOS
  // =================================================================
  async function aoClicar(e) {
    const b = e.target.closest("[data-acao]");
    if (!b || b.disabled) return;
    const a = b.dataset.acao;
    if (a === "perfil") { perfil = b.dataset.v; gravarLocal(CHAVE_PERFIL, perfil); return render(el, aba); }
    if (a === "aba") { location.hash = `${base}/${b.dataset.v}`; return; }
    if (a === "filtro") { filtro = b.dataset.v; return desenhar(); }
    if (a === "lista-add") return adicionarNaLista();
    if (a === "lista-copiar") return copiarDaLista(b.dataset.id);
    if (a === "lista-enviei") return enviouDaLista(b.dataset.id);
    if (a === "lista-remover") return removerDaLista(b.dataset.id);
    if (a === "nova-marca") return formMarca({});
    if (a === "editar-marca") return formMarca(contatos.find((c) => c.id === b.dataset.id) || {});
    if (a === "followup") { const c = contatos.find((x) => x.id === b.dataset.id); if (c) janelaFollowup(c); return; }
    if (a === "novo-modelo") return formModelo({ tipo: b.dataset.tipo });
    if (a === "editar-modelo") return formModelo(modelos.find((m) => m.id === b.dataset.id) || {});
    if (a === "usar") { const m = modelos.find((x) => x.id === b.dataset.id); if (m) janelaUsar(m); }
    if (a === "copiar-rapido") {
      const m = modelos.find((x) => x.id === b.dataset.id);
      if (!m) return;
      const texto = preencher(m.texto, lerLocal(chaveVars(), {}));
      const faltando = camposDe(texto);
      // se tiver campo sem preencher, abre a janela pra completar
      if (faltando.length) return janelaUsar(m);
      return copiar(texto, []);
    }
  }

  // campos da lista que salvam enquanto digita (sem redesenhar a tela)
  function aoDigitar(e) {
    const v = e.target.closest("[data-lista-var]");
    if (v) {
      const guardar = lerLocal(chaveVars(), {});
      guardar[v.dataset.listaVar] = v.value;
      gravarLocal(chaveVars(), guardar);
    }
  }

  async function aoMudar(e) {
    // nome da marca na lista do dia
    const nome = e.target.closest("[data-lista-nome]");
    if (nome) {
      const c = contatos.find((x) => x.id === nome.dataset.id);
      const novo = nome.value.trim();
      if (!c || !novo || novo === c.marca) return;
      const r = await Dados.salvarAbord("abord_contatos", limparContato({ ...c, marca: novo }));
      if (r.erro) return toast(r.erro, "erro");
      Object.assign(c, r.row);
      return;
    }
    const prod = e.target.closest("[data-lista-produto]");
    if (prod) {
      const c = contatos.find((x) => x.id === prod.dataset.id);
      const novo = prod.value.trim();
      if (!c || novo === (c.produto || "")) return;
      const r = await Dados.salvarAbord("abord_contatos", limparContato({ ...c, produto: novo }));
      if (r.erro) return toast(r.erro, "erro");
      Object.assign(c, r.row);
      return;
    }
    if (e.target.matches("[data-lista-modelo]")) {
      const salvos = lerLocal(CHAVE_MODELO_LISTA, {});
      salvos[perfil] = e.target.value;
      gravarLocal(CHAVE_MODELO_LISTA, salvos);
      return desenhar();
    }
    if (e.target.matches("[data-lista-meta]")) {
      gravarLocal(CHAVE_META, Math.max(1, Number(e.target.value) || 50));
      return desenhar();
    }
    // status mudou direto na tabela
    const s = e.target.closest(".abord-status");
    if (!s) return;
    const c = contatos.find((x) => x.id === s.dataset.id);
    if (!c) return;
    const mudou = { ...c, status: s.value };
    if (statusDe(s.value).ativo) { mudou.ultimo_envio = hoje(); mudou.followups = 0; mudou.retomar_em = null; }
    if (s.value === "pausada" && !c.retomar_em) mudou.retomar_em = somaDias(hoje(), RETOMAR_PADRAO);
    const r = await Dados.salvarAbord("abord_contatos", limparContato(mudou));
    if (r.erro) return toast(r.erro, "erro");
    Object.assign(c, r.row);
    toast(`${c.marca}: ${statusDe(c.status).t}.`, "ok");
    desenhar();
  }

  const limparContato = (c) => ({
    id: c.id, perfil, marca: c.marca, instagram: c.instagram || "", produto: c.produto || "",
    tipo: CANAIS[c.tipo] ? c.tipo : "instagram", status: c.status || "enviado", contato: c.contato || "",
    primeiro_envio: c.primeiro_envio || hoje(), ultimo_envio: c.ultimo_envio || hoje(),
    followups: c.followups || 0, notas: c.notas || "", retomar_em: c.retomar_em || null,
  });

  // =================================================================
  // JANELAS
  // =================================================================
  function abrirJanela(html, aoAbrir) {
    const fundo = document.createElement("div");
    fundo.className = "modal-fundo";
    fundo.innerHTML = html;
    document.body.appendChild(fundo);
    const fechar = () => { fundo.remove(); document.removeEventListener("keydown", tecla); };
    const tecla = (ev) => { if (ev.key === "Escape") fechar(); };
    document.addEventListener("keydown", tecla);
    fundo.addEventListener("click", (ev) => { if (ev.target === fundo || ev.target.closest("[data-fechar]")) fechar(); });
    aoAbrir(fundo, fechar);
  }

  const cabJanela = (titulo) => `
    <div class="modal-cab">
      <h2>${esc(titulo)}</h2>
      <button type="button" class="btn-icone" data-fechar aria-label="Fechar">${icone("x", 18)}</button>
    </div>`;

  // ---------- cadastrar / editar marca ----------
  function formMarca(c) {
    const novo = !c.id;
    abrirJanela(`
      <form class="modal">
        ${cabJanela(novo ? "Nova marca" : "Editar marca")}
        <div class="linha-2">
          <label class="campo"><span class="rotulo">Marca</span>
            <input type="text" name="marca" required maxlength="80" value="${esc(c.marca || "")}" placeholder="Ex: Felps"></label>
          <label class="campo"><span class="rotulo">@ no Instagram</span>
            <input type="text" name="instagram" maxlength="60" value="${esc(c.instagram || "")}" placeholder="@marca"></label>
        </div>
        <label class="campo"><span class="rotulo">Produto da ideia</span>
          <input type="text" name="produto" maxlength="120" value="${esc(c.produto || "")}" placeholder="Ex: linha Azeite de Abacate"></label>
        <div class="linha-2">
          <label class="campo"><span class="rotulo">Canal</span>
            <select name="tipo">${Object.entries(CANAIS).map(([v, t]) => `<option value="${v}" ${(CANAIS[c.tipo] ? c.tipo : "instagram") === v ? "selected" : ""}>${t}</option>`).join("")}</select></label>
          <label class="campo"><span class="rotulo">Status</span>
            <select name="status">${STATUS.map((s) => `<option value="${s.v}" ${(c.status || "enviado") === s.v ? "selected" : ""}>${s.t}</option>`).join("")}</select></label>
        </div>
        <div class="linha-2">
          <label class="campo"><span class="rotulo">Primeira mensagem</span>
            <input type="date" name="primeiro_envio" value="${esc(c.primeiro_envio || hoje())}"></label>
          <label class="campo"><span class="rotulo">Última mensagem</span>
            <input type="date" name="ultimo_envio" value="${esc(c.ultimo_envio || hoje())}"></label>
        </div>
        <div class="linha-2">
          <label class="campo"><span class="rotulo">Contato do time (opcional)</span>
            <input type="text" name="contato" maxlength="120" value="${esc(c.contato || "")}" placeholder="Nome ou e-mail"></label>
          <label class="campo"><span class="rotulo">Retomar em (se pausada)</span>
            <input type="date" name="retomar_em" value="${esc(c.retomar_em || "")}"></label>
        </div>
        <label class="campo"><span class="rotulo">Notas (opcional)</span>
          <textarea name="notas" placeholder="O que a marca respondeu, ideia enviada, valores...">${esc(c.notas || "")}</textarea></label>
        <div class="modal-acoes">
          ${novo ? "" : `<button type="button" class="btn btn-perigo" data-apagar>${icone("lixo", 15)} Apagar</button>`}
          <span style="flex:1"></span>
          <button type="button" class="btn" data-fechar>Cancelar</button>
          <button type="submit" class="btn btn-primario">Salvar</button>
        </div>
      </form>`, (fundo, fechar) => {
      const f = fundo.querySelector("form");
      f.marca.focus();
      fundo.querySelector("[data-apagar]")?.addEventListener("click", async () => {
        if (!confirm(`Apagar ${c.marca} do controle?`)) return;
        const r = await Dados.apagarAbord("abord_contatos", c.id);
        if (r.erro) return toast(r.erro, "erro");
        contatos = contatos.filter((x) => x.id !== c.id);
        fechar(); desenhar();
      });
      f.addEventListener("submit", async (ev) => {
        ev.preventDefault();
        const marca = f.marca.value.trim();
        if (!marca) return f.marca.focus();
        if (f.ultimo_envio.value < f.primeiro_envio.value) return toast("A última mensagem não pode ser antes da primeira.", "erro");
        let retomar = f.retomar_em.value || null;
        if (f.status.value === "pausada" && !retomar) retomar = somaDias(hoje(), RETOMAR_PADRAO);
        const r = await Dados.salvarAbord("abord_contatos", limparContato({
          ...c, marca, instagram: f.instagram.value.trim().replace(/^@/, ""), produto: f.produto.value.trim(),
          tipo: f.tipo.value, status: f.status.value, contato: f.contato.value.trim(),
          primeiro_envio: f.primeiro_envio.value, ultimo_envio: f.ultimo_envio.value, notas: f.notas.value.trim(),
          retomar_em: retomar,
        }));
        if (r.erro) return toast(r.erro, "erro");
        const i = contatos.findIndex((x) => x.id === r.row.id);
        if (i >= 0) contatos[i] = r.row; else contatos.push(r.row);
        toast(`${marca} salva no controle.`, "ok");
        fechar();
        if (aba !== "controle") { location.hash = `${base}/controle`; return; }
        filtro = vencido(r.row) ? "pendentes" : "todas";
        desenhar();
      });
    });
  }

  // ---------- criar / editar modelo ----------
  function formModelo(m) {
    const novo = !m.id;
    const tipo = ehPrimeiro(m.tipo) ? "primeiro" : (m.tipo || "primeiro");
    abrirJanela(`
      <form class="modal modal-largo">
        ${cabJanela(novo ? `Novo modelo: ${TIPOS[tipo]}` : "Editar modelo")}
        <div class="linha-2">
          <label class="campo"><span class="rotulo">Nome do modelo</span>
            <input type="text" name="titulo" required maxlength="80" value="${esc(m.titulo || "")}" placeholder="Ex: Primeiro contato"></label>
          <label class="campo"><span class="rotulo">Tipo</span>
            <select name="tipo">${Object.entries(TIPOS).map(([v, t]) => `<option value="${v}" ${tipo === v ? "selected" : ""}>${t}</option>`).join("")}</select></label>
        </div>
        <label class="campo" data-so-followup ${tipo === "followup" ? "" : "hidden"}><span class="rotulo">Quando usar</span>
          <select name="situacao">${SITUACOES.map((s) => `<option value="${s.v}" ${(m.situacao || "dm_1") === s.v ? "selected" : ""}>${s.t}</option>`).join("")}</select></label>
        <label class="campo"><span class="rotulo">Texto <span class="abord-contador" data-contador></span></span>
          <textarea name="texto" rows="10" required placeholder="Oi, {marca}! ...">${esc(m.texto || "")}</textarea></label>
        <p class="muted abord-dica">Escreva entre chaves o que muda a cada marca: {marca}, {produto}, {gancho}... Na hora de usar, o painel pede pra você preencher.</p>
        ${perfil === "vaiterestrada" ? `<p class="muted abord-dica">Números que entram sozinhos (atualizados pelo robô, últimos 30 dias): {alcance}, {visualizações}, {compartilhamentos}, {salvamentos}, {seguidores} e {público}.</p>` : ""}
        <div class="modal-acoes">
          ${novo ? "" : `<button type="button" class="btn btn-perigo" data-apagar>${icone("lixo", 15)} Apagar</button>`}
          <span style="flex:1"></span>
          <button type="button" class="btn" data-fechar>Cancelar</button>
          <button type="submit" class="btn btn-primario">Salvar</button>
        </div>
      </form>`, (fundo, fechar) => {
      const f = fundo.querySelector("form");
      const contar = () => {
        const lim = f.tipo.value === "plataforma" ? LIMITE_PLATAFORMA : LIMITE_DM;
        const n = tamanho(f.texto.value);
        const c = fundo.querySelector("[data-contador]");
        c.textContent = `${num(n)} / ${num(lim)}`;
        c.classList.toggle("estourou", n > lim);
      };
      contar();
      f.texto.addEventListener("input", contar);
      f.tipo.addEventListener("change", () => { fundo.querySelector("[data-so-followup]").hidden = f.tipo.value !== "followup"; contar(); });
      f.titulo.focus();
      fundo.querySelector("[data-apagar]")?.addEventListener("click", async () => {
        if (!confirm(`Apagar o modelo "${m.titulo}"?`)) return;
        const r = await Dados.apagarAbord("abord_modelos", m.id);
        if (r.erro) return toast(r.erro, "erro");
        modelos = modelos.filter((x) => x.id !== m.id);
        fechar(); desenhar();
      });
      f.addEventListener("submit", async (ev) => {
        ev.preventDefault();
        const titulo = f.titulo.value.trim(), texto = f.texto.value.trim();
        if (!titulo || !texto) return;
        if (f.tipo.value === "plataforma" && tamanho(texto) > LIMITE_PLATAFORMA && !confirm(`O texto passou de ${LIMITE_PLATAFORMA} caracteres e não vai caber na plataforma. Salvar mesmo assim?`)) return;
        const r = await Dados.salvarAbord("abord_modelos", {
          id: m.id, perfil, tipo: f.tipo.value, situacao: f.tipo.value === "followup" ? f.situacao.value : "",
          titulo, texto, ordem: m.ordem || 0,
        });
        if (r.erro) return toast(r.erro, "erro");
        const i = modelos.findIndex((x) => x.id === r.row.id);
        if (i >= 0) modelos[i] = r.row; else modelos.push(r.row);
        toast("Modelo salvo.", "ok");
        fechar(); desenhar();
      });
    });
  }

  // ---------- preencher e copiar ----------
  // Parte comum: campos + prévia + contador. Devolve funções pra ler o texto final.
  function montarPreenchimento(caixa, getTexto, limite, iniciais) {
    const lembrados = lerLocal(chaveVars(), {});
    const valores = { ...lembrados, ...iniciais };
    const desenharCampos = () => {
      const campos = camposDe(getTexto()).filter((k) => !ehAuto(k));
      caixa.querySelector("[data-campos]").innerHTML = campos.length ? campos.map((k) => CAMPOS_CURTOS.includes(k) ? `
        <label class="campo"><span class="rotulo">${esc(k)}</span>
          <input type="text" data-campo="${esc(k)}" value="${esc(valores[k] || "")}" placeholder="${esc(k)}"></label>` : `
        <label class="campo campo-largo"><span class="rotulo">${esc(k)}</span>
          <textarea rows="2" data-campo="${esc(k)}" placeholder="${esc(k)}">${esc(valores[k] || "")}</textarea></label>`).join("") : "";
      atualizar();
    };
    const atualizar = () => {
      const final = preencher(getTexto(), valores);
      const lim = limite();
      const n = tamanho(final);
      caixa.querySelector("[data-previa]").innerHTML = destacar(final);
      const c = caixa.querySelector("[data-contador]");
      c.textContent = `${num(n)} / ${num(lim)}`;
      c.classList.toggle("estourou", n > lim);
    };
    caixa.addEventListener("input", (ev) => {
      const k = ev.target.dataset?.campo;
      if (k == null) return;
      valores[k] = ev.target.value;
      atualizar();
    });
    desenharCampos();
    return {
      final: () => preencher(getTexto(), valores),
      faltando: () => camposDe(preencher(getTexto(), valores)),
      valores,
      redesenhar: desenharCampos,
      lembrar: () => {
        const guardar = { ...lerLocal(chaveVars(), {}) };
        for (const [k, v] of Object.entries(valores)) if (!CAMPOS_DA_MARCA.includes(k) && v) guardar[k] = v;
        gravarLocal(chaveVars(), guardar);
      },
    };
  }

  async function copiar(texto, faltando) {
    try {
      await navigator.clipboard.writeText(texto);
    } catch {
      const t = document.createElement("textarea");
      t.value = texto; document.body.appendChild(t); t.select();
      try { document.execCommand("copy"); } catch { /* nada */ }
      t.remove();
    }
    if (faltando.length) toast(`Copiado, mas ainda falta preencher: ${faltando.map((k) => `{${k}}`).join(", ")}`, "aviso");
    else toast("Texto copiado. É só colar na mensagem.", "ok");
  }

  // ---------- salvar no controle o que acabou de ser copiado ----------
  // "Holy Foods", "holyfoods" e "@holyfoods" viram a mesma marca
  const chaveMarca = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/^@/, "").replace(/[^a-z0-9]/g, "");
  const ehEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s || "").trim());

  async function registrarUso(m, valores) {
    const nome = String(valores.marca || "").trim();
    if (!nome) { toast("Copiado. Pra salvar no controle, preencha o nome da marca.", "aviso"); return; }
    const k = chaveMarca(nome);
    const c = contatos.find((x) => chaveMarca(x.marca) === k || (x.instagram && chaveMarca(x.instagram) === k));
    const contato = String(valores.contato || "").trim();
    const produto = String(valores.produto || "").trim();
    const especial = camposDe(m.texto).includes("data especial") ? String(valores["data especial"] || "").trim() : "";
    const h = hoje();

    // o que a mensagem muda no acompanhamento
    let mud;
    if (m.tipo === "followup") {
      if (m.situacao === "retomar") {
        mud = { status: c?.contato || contato ? "time" : "enviado", followups: 0, retomar_em: null };
      } else {
        const st = m.situacao?.startsWith("time") ? "time" : m.situacao === "proposta" ? "proposta" : "enviado";
        const ativo = c && statusDe(c.status).ativo && c.status !== "a_enviar";
        mud = { status: ativo ? c.status : st, followups: ativo ? (c.followups || 0) + 1 : 1 };
      }
    } else if (m.tipo === "conversa") {
      // falando com alguém do time (tem {contato}) ou conversando pela DM
      mud = { status: /\{\s*contato\s*\}/.test(m.texto) ? "time" : "conversando", followups: 0 };
    } else {
      // primeiro contato ou plataforma (de novo = recomeça a contagem)
      mud = { status: "enviado", followups: 0, retomar_em: null };
    }

    const nota = `${dataBr(h)}: ${m.titulo}${especial ? ` (${especial})` : ""}`;
    const base = c || {
      marca: nome, instagram: "", produto: "", contato: "", notas: "", primeiro_envio: h,
      tipo: m.tipo === "plataforma" ? "plataforma" : "instagram",
    };
    const novo = {
      ...base, ...mud, ultimo_envio: h,
      produto: produto || base.produto || "",
      contato: contato || base.contato || "",
      notas: base.notas ? `${base.notas}\n${nota}` : nota,
    };
    if (c?.status === "a_enviar") novo.primeiro_envio = h;
    // contato do time por e-mail: o canal passa a ser e-mail
    if (contato && ehEmail(contato) && /\{\s*contato\s*\}/.test(m.texto)) novo.tipo = "email";

    const r = await Dados.salvarAbord("abord_contatos", limparContato(novo));
    if (r.erro) return toast(r.erro, "erro");
    if (c) Object.assign(c, r.row); else contatos.push(r.row);
    toast(c ? `Copiado e atualizado no controle: ${c.marca} ✓` : `Copiado e ${nome} entrou no controle ✓`, "ok");
    desenhar();
  }

  function janelaUsar(m) {
    const limite = () => (m.tipo === "plataforma" ? LIMITE_PLATAFORMA : LIMITE_DM);
    const podeRegistrar = true;
    // texto sem {marca}: pede a marca só pra saber onde salvar no controle
    const pedeMarca = !camposDe(m.texto).includes("marca");
    abrirJanela(`
      <div class="modal modal-largo">
        ${cabJanela(m.titulo)}
        ${pedeMarca ? `
          <label class="campo"><span class="rotulo">Marca (pra salvar no controle)</span>
            <input type="text" data-marca-registro list="abord-marcas-lista" placeholder="Nome da marca" autocomplete="off"></label>
          <datalist id="abord-marcas-lista">${contatos.map((c) => `<option value="${esc(c.marca)}">`).join("")}</datalist>` : ""}
        <div class="abord-campos" data-campos></div>
        <div class="abord-previa-cab"><span class="rotulo">Como vai ficar</span><span class="abord-contador" data-contador></span></div>
        <div class="abord-previa" data-previa></div>
        <div class="modal-acoes">
          <span style="flex:1"></span>
          <button type="button" class="btn" data-copiar>${icone("clipe", 15)} Copiar</button>
          ${podeRegistrar ? `<button type="button" class="btn btn-primario" data-registrar>Copiar e salvar no controle</button>` : ""}
        </div>
      </div>`, (fundo, fechar) => {
      const p = montarPreenchimento(fundo, () => m.texto, limite, {});
      fundo.querySelector("[data-campos] input")?.focus();
      fundo.querySelector("[data-copiar]").addEventListener("click", () => { p.lembrar(); copiar(p.final(), p.faltando()); });
      fundo.querySelector("[data-registrar]")?.addEventListener("click", async () => {
        p.lembrar();
        await copiar(p.final(), p.faltando());
        const marcaExtra = fundo.querySelector("[data-marca-registro]")?.value.trim();
        fechar();
        await registrarUso(m, marcaExtra ? { ...p.valores, marca: marcaExtra } : p.valores);
      });
    });
  }

  function janelaFollowup(c) {
    const p0 = proximo(c);
    const fus = modelos.filter((m) => m.tipo === "followup");
    const sugerida = situacaoSugerida(c);
    let escolhido = fus.find((m) => m.situacao === sugerida) || fus[0];
    const pausar = p0?.tipo === "pausar";
    const retomar = p0?.tipo === "retomar";
    const titulo = retomar ? `Retomar: ${c.marca}` : pausar ? `Sem resposta: ${c.marca}` : `${(c.followups || 0) + 1}º follow-up: ${c.marca}`;
    abrirJanela(`
      <div class="modal modal-largo">
        ${cabJanela(titulo)}
        <p class="muted" style="margin-top:-6px">${esc(statusDe(c.status).t)}. Última mensagem em ${esc(dataBr(c.ultimo_envio))}${c.followups ? `, ${c.followups} follow-up${c.followups > 1 ? "s" : ""} já enviado${c.followups > 1 ? "s" : ""}` : ""}.</p>
        ${pausar ? `
          <p class="alerta alerta-atencao">Os 2 follow-ups já foram e a marca não respondeu. Melhor parar de mandar mensagem e retomar mais pra frente.</p>
          <label class="campo"><span class="rotulo">Retomar contato em</span>
            <input type="date" data-retomar value="${somaDias(hoje(), RETOMAR_PADRAO)}"></label>` : fus.length ? `
          <label class="campo"><span class="rotulo">Mensagem</span>
            <select data-modelo>${fus.map((m) => `<option value="${esc(m.id)}" ${m === escolhido ? "selected" : ""}>${esc(m.titulo)}${m.situacao === sugerida ? " (sugerida)" : ""}</option>`).join("")}</select></label>
          <div class="abord-campos" data-campos></div>
          <div class="abord-previa-cab"><span class="rotulo">Como vai ficar</span><span class="abord-contador" data-contador></span></div>
          <div class="abord-previa" data-previa></div>` : `
          <p class="alerta alerta-atencao">Você ainda não tem modelos de follow-up neste perfil. Crie na aba Follow-ups.</p>`}
        <div class="modal-acoes">
          ${pausar ? `
            <button type="button" class="btn" data-encerrar>Encerrar</button>
            <span style="flex:1"></span>
            <button type="button" class="btn btn-primario" data-pausar>Pausar até essa data</button>` : `
            <span style="flex:1"></span>
            ${fus.length ? `<button type="button" class="btn" data-copiar>${icone("clipe", 15)} Copiar</button>` : ""}
            <button type="button" class="btn btn-primario" data-enviado>${retomar ? "Enviei, retomar contato" : "Enviei o follow-up"}</button>`}
        </div>
      </div>`, (fundo, fechar) => {
      let p = null;
      if (!pausar && fus.length) {
        p = montarPreenchimento(fundo, () => escolhido.texto, () => LIMITE_DM, {
          marca: c.marca, produto: c.produto, contato: c.contato, data: dataBr(c.ultimo_envio),
        });
        fundo.querySelector("[data-modelo]").addEventListener("change", (ev) => {
          escolhido = fus.find((m) => m.id === ev.target.value);
          p.redesenhar();
        });
        fundo.querySelector("[data-copiar]").addEventListener("click", () => { p.lembrar(); copiar(p.final(), p.faltando()); });
      }
      const salvar = async (mudancas, msg) => {
        const r = await Dados.salvarAbord("abord_contatos", limparContato({ ...c, ...mudancas }));
        if (r.erro) return toast(r.erro, "erro");
        Object.assign(c, r.row);
        toast(msg, "ok");
        fechar(); desenhar();
      };
      fundo.querySelector("[data-enviado]")?.addEventListener("click", () => {
        p?.lembrar();
        if (retomar) {
          salvar({ status: "enviado", followups: 0, ultimo_envio: hoje(), retomar_em: null }, `Contato com ${c.marca} retomado.`);
        } else {
          salvar({ followups: (c.followups || 0) + 1, ultimo_envio: hoje() }, `Follow-up de ${c.marca} registrado.`);
        }
      });
      fundo.querySelector("[data-pausar]")?.addEventListener("click", () => {
        const data = fundo.querySelector("[data-retomar]").value || somaDias(hoje(), RETOMAR_PADRAO);
        salvar({ status: "pausada", retomar_em: data }, `${c.marca} pausada até ${dataBr(data)}.`);
      });
      fundo.querySelector("[data-encerrar]")?.addEventListener("click", () =>
        salvar({ status: "sem_retorno", retomar_em: null }, `${c.marca} foi pra encerradas.`));
    });
  }

  // Quantos follow-ups (e retomadas) vencem hoje (usado na tela de Início)
  async function pendentesHoje() {
    const lista = (await Promise.all(PERFIS.map((p) => Dados.listarAbord("abord_contatos", p.v)))).flat();
    return lista.filter((c) => c.status !== "a_enviar" && vencido(c)).length;
  }

  return { render, pendentesHoje };
})();
