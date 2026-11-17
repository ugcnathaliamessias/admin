// =====================================================================
// viagem.js: Instagram › Vai Ter Estrada › 🇵🇾 Viagem Paraguai
// Projeto separado das abordagens normais: marcas e serviços de Foz do
// Iguaçu, Paraguai e Argentina pra viagem de 13 a 17/12/2026.
//   - Contagem e cronograma (1ª mensagem, follow-up, fechar, gravar)
//   - Marcas por tipo, com prioridade, proposta e status
//   - Mensagens prontas (copiar já preenchido) e "Enviei"
// As marcas ficam em abord_contatos (perfil vaiterestrada) com a 1ª linha
// das notas começando por "🇵🇾 Viagem Foz/Paraguai": prioridade, proposta
// e o nº da mensagem saem dali. Elas NÃO aparecem na Lista do dia normal;
// depois do "Enviei" entram no Controle e os follow-ups vão pro Quadro.
// =====================================================================
window.Viagem = (() => {
  const { esc, toast } = App;

  const MARCA = /Viagem Foz\/Paraguai/;
  const ehDaViagem = (c) => MARCA.test(String(c?.notas || "").split("\n")[0]);

  const IDA = "2026-12-13";
  const VOLTA = "2026-12-17";
  const ETAPAS = [
    { ate: "2026-11-22", t: "1ª mensagem pras prioridade A" },
    { ate: "2026-11-26", t: "1ª mensagem pras prioridade B" },
    { ate: "2026-12-02", t: "Follow-ups (A de 27 a 29/11, B até 02/12)" },
    { ate: "2026-12-05", t: "Fechar tudo por escrito (entregas, datas, o que recebe)" },
    { ate: "2026-12-12", t: "Comprar passagens e montar a agenda de gravação" },
    { ate: VOLTA, t: "Gravar em Foz, no Paraguai e na Argentina" },
    { ate: "2026-12-31", t: "Entregar e postar" },
  ];

  const TIPOS = [
    { n: "1", t: "📱 Lojas no Paraguai" },
    { n: "2", t: "🏨 Hotéis e resorts" },
    { n: "3", t: "🏕️ Camping, hostel e Airbnb" },
    { n: "4", t: "🎢 Passeios e atrações" },
    { n: "7", t: "🧭 Turismo oficial" },
    { n: "5", t: "🍽️ Onde comer" },
    { n: "6", t: "🚐 Transfer, agências e câmbio" },
  ];

  const STATUS = [
    { v: "a_enviar", t: "A contatar" },
    { v: "enviado", t: "Mensagem enviada" },
    { v: "time", t: "Direcionada pro time" },
    { v: "conversando", t: "Respondeu / conversando" },
    { v: "proposta", t: "Proposta enviada" },
    { v: "fechou", t: "Parceria fechada 🎉" },
    { v: "recusou", t: "Sem interesse" },
    { v: "pausada", t: "Pausada" },
    { v: "sem_retorno", t: "Encerrada" },
  ];
  const RESPONDEU = ["time", "conversando", "proposta"];

  const ABRE = "Oi, {saudação}! Tudo bem? Aqui é a Nath, do Vai Ter Estrada 🏕️";
  const KIT = "Nosso mídia kit, com vídeos e números atualizados: https://vaiterestrada.github.io/midiakit/";
  const MENSAGENS = {
    1: { t: "Loja", texto: `${ABRE}

Eu e o João criamos conteúdo sobre viagens, camping e experiências de verdade. Entre 13 e 17 de dezembro a gente vai pra Foz e pro Paraguai com uma missão: trocar de celular (iPhone Pro Max) e, se der, levar MacBook e drone pros nossos conteúdos.

A ideia é mostrar essa compra de verdade, do começo ao fim: a loja, o atendimento, o preço, a garantia e o unboxing. E a gente queria que isso acontecesse aí na {marca}.

Nos últimos 30 dias alcançamos {alcance} contas, com um público que planeja e viaja de verdade. ${KIT}

Com quem a gente fala sobre conteúdo e influência?` },
    2: { t: "Hotel ou resort", texto: `${ABRE}

Eu e o João criamos conteúdo sobre viagens, camping e hospedagens. Entre 13 e 17 de dezembro a gente vai estar em Foz e no Paraguai, montando uma série: "da barraca ao all inclusive em Foz".

A gente adoraria contar a história do {marca}: a chegada, a estrutura, o que está incluso e os detalhes que fazem valer a viagem, bem no comecinho das férias de dezembro.

Nos últimos 30 dias alcançamos {alcance} contas, público de {público}. ${KIT}

Com quem a gente fala sobre conteúdo e influência? Pode ser e-mail ou WhatsApp 😊` },
    3: { t: "Camping ou hostel", texto: `${ABRE}

A gente cria conteúdo de camping e estrada, e entre 13 e 17 de dezembro vai estar em Foz do Iguaçu. Uma das perguntas que mais aparecem pra gente é "onde acampar perto das Cataratas?", e o {marca} é um dos lugares que mais aparecem nas buscas.

Queria saber se a gente pode passar aí pra gravar a estrutura e mostrar como funciona, do jeito que a gente faz nos nossos vídeos: a chegada, as áreas, o que tem pra quem vem de barraca ou motorhome. O conteúdo fica com vocês também.

${KIT}

Com quem a gente fala sobre isso?` },
    4: { t: "Passeio ou atração", texto: `${ABRE}

Eu e o João vamos estar em Foz entre 13 e 17 de dezembro, gravando uma série sobre a região, e o {marca} está no nosso roteiro. A gente queria mostrar a experiência de verdade, do jeito que a gente faz nos nossos vídeos: a chegada, o passeio e o que faz valer a visita.

Nos últimos 30 dias alcançamos {alcance} contas. ${KIT}

Vocês têm alguma ação com criadores de conteúdo? Com quem a gente fala?` },
    5: { t: "Restaurante", texto: `${ABRE}

Eu e o João vamos estar em Foz entre 13 e 17 de dezembro gravando uma série sobre a viagem, e o {marca} é parada obrigatória na nossa lista. A gente queria mostrar a experiência completa, do ambiente ao prato.

${KIT}

Vocês topam uma parceria em troca de conteúdo? Com quem a gente fala? 😊` },
    6: { t: "Transfer ou agência", texto: `${ABRE}

Entre 13 e 17 de dezembro eu e o João vamos pra Foz e pro Paraguai, e uma dúvida que todo mundo tem é "como se locomover entre Foz, o Paraguai e as atrações?". A gente queria responder isso mostrando o serviço da {marca} na prática.

Nos últimos 30 dias alcançamos {alcance} contas. ${KIT}

Com quem a gente fala sobre conteúdo e influência?` },
    7: { t: "Visit Iguassu", texto: `Olá, equipe Visit Iguassu! Tudo bem? Aqui é a Nath, do Vai Ter Estrada 🏕️

Eu e o João criamos conteúdo sobre viagens, camping e hospedagens, com um público adulto que planeja e viaja de verdade, principalmente da Grande SP. Entre 13 e 17 de dezembro vamos estar em Foz gravando uma série sobre a região: "da barraca ao all inclusive em Foz", com compras no Paraguai e o lado argentino.

Vimos o projeto Influencers Experience e adoraríamos participar, com apoio de hospedagem e atrações associadas. ${KIT}

Podemos mandar uma proposta com o roteiro?` },
    f: { t: "Follow-up", texto: `Oi, {saudação}! Passando aqui de novo 😊 A nossa viagem pra Foz está chegando (13 a 17/12) e estamos fechando o roteiro de gravações essa semana. Ainda dá tempo de incluir o {marca}. Com quem a gente pode falar?` },
  };

  let el = null;
  let contatos = [];
  let numeros = {};
  let filtroTipo = "todos";
  let filtroStatus = "todos";

  // ---------- datas ----------
  const pad = (n) => String(n).padStart(2, "0");
  const hoje = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
  const paraData = (s) => { const [a, m, d] = String(s).split("-").map(Number); return new Date(a, m - 1, d); };
  const diasAte = (s) => Math.round((paraData(s) - paraData(hoje())) / 864e5);
  const dataBr = (s) => { const [, m, d] = String(s).split("-"); return `${d}/${m}`; };

  // ---------- o que vem nas notas ----------
  function info(c) {
    const l1 = String(c.notas || "").split("\n")[0];
    const pri = (l1.match(/prioridade ([AB])/) || [])[1] || "B";
    const n = (l1.match(/nº (\d)/) || [])[1] || "4";
    const prop = ((l1.match(/prioridade [AB]\. (.*?)(?: Mensagem:|$)/) || [])[1] || "").trim();
    return { pri, n, prop };
  }
  const arroba = (c) => String(c.instagram || "").replace(/^@/, "");
  function saudacao(c) {
    const nome = String(c.contato || "").split(/[·|,;]/).map((s) => s.trim())
      .find((s) => /[A-Za-zÀ-ú]/.test(s) && !/@|https?:|\d{4}/.test(s));
    return nome || "pessoal";
  }
  function mensagem(c, qual) {
    const m = MENSAGENS[qual];
    const valores = { ...numeros, marca: c.marca, "saudação": saudacao(c), saudacao: saudacao(c) };
    return m.texto.replace(/\{([^{}\n]{1,30})\}/g, (x, k) => valores[k.trim()] || x);
  }

  // =================================================================
  async function render(alvo) {
    el = alvo;
    el.onclick = aoClicar;
    el.onchange = aoMudar;
    el.innerHTML = `<div class="card"><p class="muted">Carregando a viagem...</p></div>`;
    const [lista, nums] = await Promise.all([
      Dados.listarAbord("abord_contatos", "vaiterestrada"),
      Abordagens.numerosVte ? Abordagens.numerosVte() : {},
    ]);
    contatos = lista.filter(ehDaViagem);
    numeros = nums || {};
    desenhar();
  }

  function desenhar() {
    el.innerHTML = blocoTopo() + blocoMarcas() + blocoMensagens();
  }

  // ---------- contagem + cronograma ----------
  function blocoTopo() {
    const faltam = diasAte(IDA);
    const h = hoje();
    const atual = ETAPAS.findIndex((e) => h <= e.ate);
    const cont = (f) => contatos.filter(f).length;
    const kpis = [
      ["Marcas", contatos.length],
      ["A contatar", cont((c) => c.status === "a_enviar")],
      ["Enviadas", cont((c) => c.status === "enviado")],
      ["Responderam", cont((c) => RESPONDEU.includes(c.status))],
      ["Fechadas", cont((c) => c.status === "fechou")],
    ];
    const contagem = faltam > 0 ? `faltam <strong>${faltam} dias</strong> pra viagem`
      : diasAte(VOLTA) >= 0 ? "<strong>é agora!</strong> Bora gravar" : "viagem feita 🎉";
    return `
      <div class="viagem-topo card">
        <div class="viagem-titulo">
          <div>
            <h2>🇵🇾 Foz do Iguaçu · Paraguai · Argentina</h2>
            <p class="muted">13 a 17/12 (previsão, passagens no começo de dezembro) · ${contagem}</p>
            <p class="muted viagem-meta">Missão: iPhone Pro Max → MacBook → drone → câmera pequena (Osmo Action)</p>
          </div>
        </div>
        <div class="viagem-kpis">${kpis.map(([r, v]) => `<div class="viagem-kpi"><span class="kpi-valor">${v}</span><span class="muted">${r}</span></div>`).join("")}</div>
        <ol class="viagem-etapas">
          ${ETAPAS.map((e, i) => `<li class="${i < atual ? "feita" : i === atual ? "agora" : ""}"><span>até ${dataBr(e.ate)}</span>${esc(e.t)}${i === atual ? ' <span class="selo selo-ok">agora</span>' : ""}</li>`).join("")}
        </ol>
      </div>`;
  }

  // ---------- marcas ----------
  function blocoMarcas() {
    const lista = contatos.filter((c) => {
      const i = info(c);
      if (filtroTipo !== "todos" && i.n !== filtroTipo) return false;
      if (filtroStatus === "contatar") return c.status === "a_enviar";
      if (filtroStatus === "andamento") return ["enviado", ...RESPONDEU].includes(c.status);
      if (filtroStatus === "fechadas") return c.status === "fechou";
      return true;
    });
    const filtros = `
      <div class="viagem-filtros">
        <select data-filtro="tipo" aria-label="Tipo">
          <option value="todos">Todos os tipos</option>
          ${TIPOS.map((t) => `<option value="${t.n}" ${filtroTipo === t.n ? "selected" : ""}>${t.t}</option>`).join("")}
        </select>
        <select data-filtro="status" aria-label="Status">
          ${[["todos", "Todos os status"], ["contatar", "A contatar"], ["andamento", "Em andamento"], ["fechadas", "Fechadas"]]
            .map(([v, t]) => `<option value="${v}" ${filtroStatus === v ? "selected" : ""}>${t}</option>`).join("")}
        </select>
      </div>`;
    const grupos = TIPOS.map((t) => {
      const doTipo = lista.filter((c) => info(c).n === t.n)
        .sort((a, b) => info(a).pri.localeCompare(info(b).pri) || a.marca.localeCompare(b.marca));
      if (!doTipo.length) return "";
      return `<h3 class="viagem-grupo">${t.t} <span class="muted">(${doTipo.length})</span></h3>
        <div class="viagem-lista">${doTipo.map(linhaMarca).join("")}</div>`;
    }).join("");
    return `
      <div class="viagem-cab-secao">
        <h2>Marcas da viagem</h2>
        ${filtros}
      </div>
      ${grupos || `<div class="card vazio"><p>Nenhuma marca nesse filtro.</p></div>`}`;
  }

  function linhaMarca(c) {
    const i = info(c);
    const h = arroba(c);
    const link = h ? `<a href="https://www.instagram.com/${encodeURIComponent(h)}/" target="_blank" rel="noopener">@${esc(h)}</a>` : `<span class="muted">sem Instagram</span>`;
    const naoEnviada = c.status === "a_enviar";
    const envio = naoEnviada ? "" : `<span class="muted">· 1ª msg ${dataBr(c.primeiro_envio)}${c.followups ? ` · ${c.followups} follow-up${c.followups > 1 ? "s" : ""}` : ""}</span>`;
    return `
      <div class="card viagem-marca ${c.status === "fechou" ? "fechada" : ""}">
        <div class="viagem-marca-info">
          <div class="viagem-marca-nome"><strong>${esc(c.marca)}</strong> <span class="chip viagem-pri-${i.pri}">${i.pri}</span> ${link} ${envio}</div>
          <div class="muted viagem-prop">${esc(i.prop || c.produto || "")}</div>
          <details class="viagem-previa">
            <summary>Ver a mensagem (${esc(MENSAGENS[naoEnviada ? i.n : "f"].t)})</summary>
            <pre>${esc(mensagem(c, naoEnviada ? i.n : "f"))}</pre>
          </details>
        </div>
        <div class="viagem-marca-acoes">
          <select data-status="${esc(c.id)}" aria-label="Status de ${esc(c.marca)}">
            ${STATUS.map((s) => `<option value="${s.v}" ${s.v === c.status ? "selected" : ""}>${s.t}</option>`).join("")}
          </select>
          <button class="btn btn-sm" data-acao="copiar" data-id="${esc(c.id)}" data-qual="${naoEnviada ? i.n : "f"}">📋 ${naoEnviada ? "Copiar mensagem" : "Copiar follow-up"}</button>
          ${naoEnviada ? `<button class="btn btn-sm btn-primario" data-acao="enviei" data-id="${esc(c.id)}">Enviei</button>` : ""}
        </div>
      </div>`;
  }

  // ---------- mensagens ----------
  function blocoMensagens() {
    return `
      <h2 class="viagem-cab-secao">Mensagens da viagem</h2>
      <p class="muted">O botão "Copiar mensagem" de cada marca já usa a mensagem certa e preenche o nome. Aqui ficam os textos pra consultar.</p>
      <div class="viagem-msgs">
        ${Object.entries(MENSAGENS).map(([k, m]) => `
          <details class="card viagem-msg">
            <summary><strong>${k === "f" ? "🔁" : k + "."} ${esc(m.t)}</strong></summary>
            <pre>${esc(m.texto)}</pre>
          </details>`).join("")}
      </div>`;
  }

  // ---------- ações ----------
  async function copiarTexto(t) {
    try { await navigator.clipboard.writeText(t); }
    catch {
      const a = document.createElement("textarea");
      a.value = t; document.body.appendChild(a); a.select(); document.execCommand("copy"); a.remove();
    }
  }

  async function salvar(c, mud, msg) {
    const r = await Dados.salvarAbord("abord_contatos", { ...c, ...mud });
    if (r.erro) return toast(r.erro, "erro");
    Object.assign(c, r.row || mud);
    desenhar();
    if (msg) toast(msg, "ok");
  }

  async function aoClicar(ev) {
    const b = ev.target.closest("[data-acao]");
    if (!b) return;
    const c = contatos.find((x) => x.id === b.dataset.id);
    if (!c) return;
    if (b.dataset.acao === "copiar") {
      const texto = mensagem(c, b.dataset.qual);
      await copiarTexto(texto);
      const falta = [...texto.matchAll(/\{([^{}\n]{1,30})\}/g)].map((m) => m[1]);
      const nome = MENSAGENS[b.dataset.qual].t.toLowerCase();
      toast(falta.length ? `Copiado. Falta preencher: ${falta.join(", ")}` : `Mensagem de ${nome} copiada ✓`, falta.length ? "aviso" : "ok");
    } else if (b.dataset.acao === "enviei") {
      const h = hoje();
      await salvar(c, {
        status: "enviado", primeiro_envio: h, ultimo_envio: h, followups: 0,
        notas: `${c.notas}\n${dataBr(h)}: 1ª mensagem (aba Viagem Paraguai).`,
      }, `${c.marca} foi pro Controle. O follow-up aparece no Quadro.`);
    }
  }

  async function aoMudar(ev) {
    const f = ev.target.dataset.filtro;
    if (f === "tipo") { filtroTipo = ev.target.value; return desenhar(); }
    if (f === "status") { filtroStatus = ev.target.value; return desenhar(); }
    const id = ev.target.dataset.status;
    if (!id) return;
    const c = contatos.find((x) => x.id === id);
    if (!c) return;
    const novo = ev.target.value;
    const mud = { status: novo };
    if (c.status === "a_enviar" && novo !== "a_enviar") { mud.primeiro_envio = hoje(); mud.ultimo_envio = hoje(); }
    await salvar(c, mud, "Status atualizado.");
  }

  return { render, ehDaViagem };
})();
