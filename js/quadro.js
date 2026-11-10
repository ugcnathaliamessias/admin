// =====================================================================
// quadro.js: 🗂️ Quadro (estilo Trello). Substitui o Banco de ideias.
//   Colunas: Começar → 20% → 40% → 80% → Concluído
//   - Arrasta o cartão (computador) ou usa as setinhas (celular)
//   - O painel cria cartões sozinho:
//       📨 follow-up / retomar / pausar que venceu (dos dois perfis)
//       🚀 marcas esperando na Lista do dia
//     e manda pra "Concluído" quando você resolve lá em Marcas & prospecção.
// Tabela: quadro_cartoes.
// =====================================================================
window.Quadro = (() => {
  const { esc, toast } = App;

  const COLUNAS = [
    { v: "comecar", t: "📌 Começar", cor: "#F9B9C4" },
    { v: "p20", t: "🌱 20%", cor: "#F6C28B" },
    { v: "p40", t: "🌿 40%", cor: "#A6C9DD" },
    { v: "p80", t: "🌳 80%", cor: "#7C9885" },
    { v: "feito", t: "✅ Concluído", cor: "#22896A" },
  ];
  const CATEGORIAS = {
    conteudo: { e: "🎬", t: "Conteúdo", cor: "#F9B9C4", txt: "#5C0016" },
    marcas: { e: "🤝", t: "Marcas", cor: "#A6C9DD", txt: "#123447" },
    pessoal: { e: "🌷", t: "Pessoal", cor: "#CFE0D4", txt: "#24412F" },
    negocio: { e: "💼", t: "Negócio", cor: "#F8D2A8", txt: "#4A2200" },
  };
  const PERFIS = { "": "", nathalia: "Nathalia", vaiterestrada: "🏕️ Vai Ter Estrada" };
  const FORMATOS = [["reels", "Reels"], ["carrossel", "Carrossel"], ["post", "Post"], ["story", "Story"], ["live", "Live"], ["outro", "Outro"]];
  const MAX_FEITOS = 15;

  let el = null;
  let cartoes = [];
  let filtro = "todos";
  let verTodosFeitos = false;
  let arrastando = null;

  const pad = (n) => String(n).padStart(2, "0");
  const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const hoje = () => iso(new Date());
  const dataBr = (s) => { if (!s) return ""; const [, m, d] = String(s).split("-"); return `${d}/${m}`; };
  const idx = (v) => COLUNAS.findIndex((c) => c.v === v);
  const ordenar = (l) => l.sort((a, b) => (a.ordem - b.ordem) || String(a.created_at).localeCompare(String(b.created_at)));
  const daColuna = (v) => ordenar(cartoes.filter((c) => c.coluna === v));
  const menorOrdem = (v) => { const l = daColuna(v); return l.length ? l[0].ordem - 1 : 0; };

  // =================================================================
  // TELA
  // =================================================================
  async function render(alvo) {
    el = alvo;
    el.onclick = aoClicar;
    el.innerHTML = `<div class="cabecalho"><div><h1>🗂️ Quadro</h1></div></div><div class="card"><p class="muted">Carregando...</p></div>`;
    const lista = await Dados.listar("quadro_cartoes");
    if (lista === null) { el.innerHTML = `<p class="alerta alerta-erro">Não consegui carregar o quadro. Confira se o 25_quadro.sql foi rodado e recarregue a página.</p>`; return; }
    cartoes = lista;
    desenhar(true);
    // cartões automáticos (follow-ups e lista do dia); redesenha se mudou algo
    try { if (await sincronizar()) desenhar(false); } catch (e) { console.warn("Quadro: não deu pra sincronizar", e); }
  }

  function desenhar(focar) {
    const passa = (c) => filtro === "todos" || c.categoria === filtro;
    const conta = (f) => cartoes.filter((c) => c.coluna !== "feito" && (f === "todos" || c.categoria === f)).length;
    const chip = (v, t) => `<button class="ideia-filtro ${filtro === v ? "ativo" : ""}" data-acao="filtro" data-v="${v}">${t} <b>${conta(v)}</b></button>`;

    el.innerHTML = `
      <div class="cabecalho"><div><h1>🗂️ Quadro</h1><p class="muted">Tudo o que você precisa fazer, do começo ao fim. Arrasta o cartão conforme for andando 💪</p></div></div>
      ${Dados.usaSupabase() ? "" : `<p class="alerta alerta-atencao">Modo de teste local: fica salvo só neste navegador.</p>`}
      <form class="card qd-novo" data-novo>
        <input type="text" name="titulo" maxlength="140" placeholder="✍️ Novo cartão... (ex: gravar o vídeo do camping)" aria-label="Novo cartão" required>
        <select name="categoria" aria-label="Categoria">${Object.entries(CATEGORIAS).map(([v, x]) => `<option value="${v}">${x.e} ${x.t}</option>`).join("")}</select>
        <input type="date" name="prazo" aria-label="Prazo (opcional)">
        <button class="btn btn-primario" type="submit">＋ Adicionar</button>
      </form>
      <div class="ideia-filtros qd-filtros">
        ${chip("todos", "Todos")}
        ${Object.entries(CATEGORIAS).map(([v, x]) => chip(v, `${x.e} ${x.t}`)).join("")}
      </div>
      <div class="qd-quadro">
        ${COLUNAS.map((col) => {
          let lista = daColuna(col.v).filter(passa);
          const total = lista.length;
          if (col.v === "feito") {
            lista = lista.sort((a, b) => String(b.feito_em || b.updated_at).localeCompare(String(a.feito_em || a.updated_at)));
            if (!verTodosFeitos) lista = lista.slice(0, MAX_FEITOS);
          }
          return `
          <section class="qd-coluna" data-coluna="${col.v}" style="--cor-col:${col.cor}">
            <header class="qd-col-cab"><h2>${col.t}</h2><span class="qd-conta">${total}</span></header>
            <div class="qd-lista" data-lista="${col.v}">
              ${lista.map(cartao).join("") || `<p class="qd-vazio">${col.v === "comecar" ? "Nada pra começar 🎉" : "Arraste um cartão pra cá"}</p>`}
              ${col.v === "feito" && total > MAX_FEITOS ? `<button class="link-btn qd-mais" data-acao="todos-feitos">${verTodosFeitos ? "Mostrar só os últimos" : `Ver todos (${total})`}</button>` : ""}
            </div>
          </section>`;
        }).join("")}
      </div>
      <p class="muted abord-dica">🤖 Os cartões com robozinho são criados sozinhos: follow-ups que venceram e marcas esperando na Lista do dia. Quando você resolve lá em Marcas &amp; prospecção, eles vão sozinhos pra Concluído.</p>`;

    const f = el.querySelector("[data-novo]");
    f.addEventListener("submit", async (ev) => {
      ev.preventDefault();
      const titulo = f.titulo.value.trim();
      if (!titulo) return;
      const r = await Dados.salvar("quadro_cartoes", {
        titulo, notas: "", coluna: "comecar", categoria: f.categoria.value, perfil: "",
        prazo: f.prazo.value || null, ordem: menorOrdem("comecar"), origem: "manual", origem_id: "", feito_em: null,
      });
      if (r.erro) return toast(r.erro, "erro");
      cartoes.push(r.row);
      toast("📌 Cartão criado!", "ok");
      desenhar(true);
    });
    ligarArrastar();
    if (focar) f.titulo.focus();
  }

  function cartao(c) {
    const cat = CATEGORIAS[c.categoria] || CATEGORIAS.conteudo;
    const i = idx(c.coluna);
    const auto = c.origem === "followup" || c.origem === "lista";
    const atrasado = c.prazo && c.prazo < hoje() && c.coluna !== "feito";
    return `
      <article class="qd-cartao ${c.coluna === "feito" ? "feito" : ""}" draggable="true" data-id="${esc(c.id)}" data-acao="abrir" style="--cor-cat:${cat.cor}">
        <div class="qd-cartao-topo">
          <span class="qd-tag" style="background:${cat.cor};color:${cat.txt}">${cat.e} ${cat.t}</span>
          ${c.perfil ? `<span class="qd-perfil">${esc(PERFIS[c.perfil] || c.perfil)}</span>` : ""}
          ${auto ? `<span class="qd-auto" title="Criado sozinho pelo painel">🤖</span>` : ""}
        </div>
        <p class="qd-titulo">${esc(c.titulo)}</p>
        ${c.notas && !auto ? `<p class="qd-notas">${esc(c.notas)}</p>` : ""}
        <div class="qd-rodape">
          ${c.prazo ? `<span class="qd-prazo ${atrasado ? "atrasado" : ""}">📅 ${esc(dataBr(c.prazo))}</span>` : "<span></span>"}
          <span class="qd-setas">
            ${i > 0 ? `<button class="btn-icone" data-acao="mover" data-dir="-1" data-id="${esc(c.id)}" aria-label="Voltar uma coluna" title="Voltar">‹</button>` : ""}
            ${i < COLUNAS.length - 1 ? `<button class="btn-icone" data-acao="mover" data-dir="1" data-id="${esc(c.id)}" aria-label="Avançar uma coluna" title="Avançar">›</button>` : ""}
          </span>
        </div>
      </article>`;
  }

  // =================================================================
  // MOVER (setinhas e arrastar)
  // =================================================================
  // 🤖 cartão de follow-up indo pra Concluído: pergunta se é pra registrar
  // em Marcas & prospecção (assim o próximo follow-up é contado a partir de hoje)
  async function moverPara(c, coluna, ordem) {
    if (coluna === "feito" && c.coluna !== "feito" && c.origem === "followup") {
      const escolha = await perguntarFollowup(c);
      if (escolha === "cancelar") return desenhar(false);
      if (escolha === "controle") {
        if (c.perfil) { try { localStorage.setItem("painel_abord_perfil", JSON.stringify(c.perfil)); } catch { /* nada */ } }
        location.hash = "#abordagens/controle";
        return;
      }
      if (escolha !== "mover") {
        const [id] = String(c.origem_id).split(":");
        const r = await Abordagens.registrarAcao(c.perfil, id, escolha);
        if (r.erro) { toast(r.erro, "erro"); return desenhar(false); }
        toast(escolha === "followup" ? "📨 Follow-up registrado! O próximo vai aparecer sozinho no dia certo."
          : escolha === "retomar" ? "🔁 Contato retomado! A contagem recomeçou."
          : escolha === "pausar" ? "⏸️ Marca pausada por 30 dias." : "Marca encerrada.", "ok");
      }
    }
    return moverDireto(c, coluna, ordem);
  }

  function perguntarFollowup(c) {
    const tipo = String(c.origem_id).split(":")[1] || "followup";
    const marca = c.titulo.replace(/^.*?:\s*/, "").replace(/ não respondeu.*$/, "").replace(/^⏸️\s*/, "");
    const opcoes = tipo === "pausar"
      ? [["pausar", "⏸️ Pausar 30 dias", true], ["encerrar", "Encerrar", false], ["mover", "Só mover o cartão", false]]
      : tipo === "retomar"
        ? [["retomar", "Sim, registrar a retomada", true], ["controle", "A marca respondeu: abrir o Controle", false], ["mover", "Só mover o cartão", false]]
        : [["followup", "Sim, registrar e contar o próximo", true], ["controle", "A marca respondeu: abrir o Controle", false], ["mover", "Só mover o cartão", false]];
    const pergunta = tipo === "pausar" ? `${marca} não respondeu os 2 follow-ups. O que fazer?`
      : tipo === "retomar" ? `Você retomou o contato com ${marca}?`
      : `Você mandou o follow-up pra ${marca}?`;
    return new Promise((resolver) => {
      let escolhido = "cancelar";
      abrirJanela(`
        <div class="modal">
          ${cab("📨 Concluir cartão")}
          <p style="margin-top:-4px">${esc(pergunta)}</p>
          ${tipo === "followup" ? `<p class="muted abord-dica">Registrando, a contagem do próximo follow-up começa hoje.</p>` : ""}
          <div class="qd-escolhas">
            ${opcoes.map(([v, t, prim]) => `<button type="button" class="btn ${prim ? "btn-primario" : ""}" data-escolha="${v}">${esc(t)}</button>`).join("")}
            <button type="button" class="btn" data-fechar>Cancelar</button>
          </div>
        </div>`, (fundo, fechar) => {
        fundo.querySelectorAll("[data-escolha]").forEach((b) => b.addEventListener("click", () => { escolhido = b.dataset.escolha; fechar(); }));
        // quando a janela some (por botão, Esc ou clique fora), devolve a escolha
        const obs = new MutationObserver(() => { if (!document.body.contains(fundo)) { obs.disconnect(); resolver(escolhido); } });
        obs.observe(document.body, { childList: true });
      });
    });
  }

  async function moverDireto(c, coluna, ordem) {
    const antes = { coluna: c.coluna, ordem: c.ordem, feito_em: c.feito_em };
    c.coluna = coluna;
    c.ordem = ordem ?? menorOrdem(coluna);
    c.feito_em = coluna === "feito" ? (antes.coluna === "feito" ? antes.feito_em : new Date().toISOString()) : null;
    desenhar(false);
    const r = await Dados.salvar("quadro_cartoes", c);
    if (r.erro) { Object.assign(c, antes); desenhar(false); return toast(r.erro, "erro"); }
    Object.assign(c, r.row);
    if (coluna === "feito" && antes.coluna !== "feito") toast("🎉 Concluído!", "ok");
  }

  function ligarArrastar() {
    el.querySelectorAll(".qd-cartao").forEach((card) => {
      card.addEventListener("dragstart", (ev) => {
        arrastando = card.dataset.id;
        card.classList.add("arrastando");
        ev.dataTransfer.effectAllowed = "move";
        try { ev.dataTransfer.setData("text/plain", arrastando); } catch { /* nada */ }
      });
      card.addEventListener("dragend", () => { card.classList.remove("arrastando"); arrastando = null; el.querySelectorAll(".sobre").forEach((x) => x.classList.remove("sobre")); });
    });
    el.querySelectorAll(".qd-coluna").forEach((col) => {
      col.addEventListener("dragover", (ev) => { if (!arrastando) return; ev.preventDefault(); col.classList.add("sobre"); });
      col.addEventListener("dragleave", (ev) => { if (!col.contains(ev.relatedTarget)) col.classList.remove("sobre"); });
      col.addEventListener("drop", (ev) => {
        ev.preventDefault();
        col.classList.remove("sobre");
        const c = cartoes.find((x) => x.id === arrastando);
        if (!c) return;
        const destino = col.dataset.coluna;
        // solto em cima de um cartão: entra antes dele; senão vai pro fim da coluna
        const alvo = ev.target.closest(".qd-cartao");
        const lista = daColuna(destino).filter((x) => x.id !== c.id);
        let ordem;
        if (alvo && alvo.dataset.id !== c.id) {
          const i = lista.findIndex((x) => x.id === alvo.dataset.id);
          const ant = lista[i - 1];
          ordem = ant ? (ant.ordem + lista[i].ordem) / 2 : lista[i].ordem - 1;
        } else {
          ordem = lista.length ? lista[lista.length - 1].ordem + 1 : 0;
        }
        moverPara(c, destino, ordem);
      });
    });
  }

  // =================================================================
  // CLIQUES
  // =================================================================
  async function aoClicar(e) {
    const b = e.target.closest("[data-acao]");
    if (!b) return;
    const a = b.dataset.acao;
    if (a === "filtro") { filtro = b.dataset.v; return desenhar(false); }
    if (a === "todos-feitos") { verTodosFeitos = !verTodosFeitos; return desenhar(false); }
    const c = cartoes.find((x) => x.id === b.dataset.id);
    if (!c) return;
    if (a === "mover") {
      e.stopPropagation();
      const i = idx(c.coluna) + Number(b.dataset.dir);
      if (i < 0 || i >= COLUNAS.length) return;
      return moverPara(c, COLUNAS[i].v);
    }
    if (a === "abrir") return janela(c);
  }

  // ---------- janela do cartão ----------
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
  const cab = (t) => `<div class="modal-cab"><h2>${esc(t)}</h2><button type="button" class="btn-icone" data-fechar aria-label="Fechar">✕</button></div>`;

  function janela(c) {
    const auto = c.origem === "followup" || c.origem === "lista";
    const destinoAuto = c.origem === "lista" ? "#abordagens/lista" : "#abordagens/controle";
    abrirJanela(`
      <form class="modal">
        ${cab(auto ? "🤖 Cartão automático" : "✏️ Cartão")}
        ${auto ? `<p class="alerta alerta-atencao" style="margin-top:-4px">Esse cartão veio de Marcas &amp; prospecção. Quando você mandar a mensagem e registrar lá, ele vai sozinho pra Concluído.</p>` : ""}
        <label class="campo"><span class="rotulo">O que fazer</span><input type="text" name="titulo" maxlength="140" required value="${esc(c.titulo)}"></label>
        <div class="linha-2">
          <label class="campo"><span class="rotulo">Coluna</span><select name="coluna">${COLUNAS.map((x) => `<option value="${x.v}" ${c.coluna === x.v ? "selected" : ""}>${x.t}</option>`).join("")}</select></label>
          <label class="campo"><span class="rotulo">Prazo</span><input type="date" name="prazo" value="${esc(c.prazo || "")}"></label>
        </div>
        <div class="linha-2">
          <label class="campo"><span class="rotulo">Categoria</span><select name="categoria">${Object.entries(CATEGORIAS).map(([v, x]) => `<option value="${v}" ${c.categoria === v ? "selected" : ""}>${x.e} ${x.t}</option>`).join("")}</select></label>
          <label class="campo"><span class="rotulo">Perfil</span><select name="perfil">${Object.entries({ "": "Nenhum", nathalia: "Nathalia (UGC)", vaiterestrada: "Vai Ter Estrada" }).map(([v, t]) => `<option value="${v}" ${(c.perfil || "") === v ? "selected" : ""}>${t}</option>`).join("")}</select></label>
        </div>
        <label class="campo"><span class="rotulo">Notas (opcional)</span><textarea name="notas" rows="4">${esc(c.notas || "")}</textarea></label>
        <div class="qd-janela-extra">
          ${auto ? `<button type="button" class="btn" data-ir>➡️ Abrir em Marcas &amp; prospecção</button>` : ""}
          ${!auto && c.categoria === "conteudo" ? `<button type="button" class="btn" data-calendario>📅 Mandar pro calendário</button>` : ""}
        </div>
        <div class="modal-acoes">
          <button type="button" class="btn btn-perigo" data-apagar>🗑️ Apagar</button>
          <span style="flex:1"></span>
          <button type="button" class="btn" data-fechar>Cancelar</button>
          <button type="submit" class="btn btn-primario">Salvar</button>
        </div>
      </form>`, (fundo, fechar) => {
      const f = fundo.querySelector("form");
      fundo.querySelector("[data-ir]")?.addEventListener("click", () => {
        // abre Marcas & prospecção já no perfil do cartão
        if (c.perfil) { try { localStorage.setItem("painel_abord_perfil", JSON.stringify(c.perfil)); } catch { /* nada */ } }
        fechar();
        location.hash = destinoAuto;
      });
      fundo.querySelector("[data-calendario]")?.addEventListener("click", () => { fechar(); janelaCalendario(c); });
      fundo.querySelector("[data-apagar]").addEventListener("click", async () => {
        if (!confirm(`Apagar "${c.titulo}"?`)) return;
        // cartão automático apagado: guarda como "feito" escondido pra não voltar
        const r = auto
          ? await Dados.salvar("quadro_cartoes", { ...c, coluna: "feito", feito_em: c.feito_em || new Date().toISOString(), titulo: c.titulo })
          : await Dados.apagar("quadro_cartoes", c.id);
        if (r.erro) return toast(r.erro, "erro");
        if (auto) Object.assign(c, r.row); else cartoes = cartoes.filter((x) => x.id !== c.id);
        fechar(); desenhar(false);
      });
      f.addEventListener("submit", async (ev) => {
        ev.preventDefault();
        const coluna = f.coluna.value;
        const mudouColuna = coluna !== c.coluna;
        // follow-up concluído pela janela: mesma pergunta do arrastar
        if (auto && c.origem === "followup" && mudouColuna && coluna === "feito") {
          fechar();
          return moverPara(c, "feito");
        }
        const r = await Dados.salvar("quadro_cartoes", {
          ...c, titulo: f.titulo.value.trim(), notas: f.notas.value.trim(), categoria: f.categoria.value,
          perfil: f.perfil.value, prazo: f.prazo.value || null, coluna,
          ordem: mudouColuna ? menorOrdem(coluna) : c.ordem,
          feito_em: coluna === "feito" ? (c.feito_em || new Date().toISOString()) : null,
        });
        if (r.erro) return toast(r.erro, "erro");
        Object.assign(c, r.row);
        toast(coluna === "feito" && mudouColuna ? "🎉 Concluído!" : "Cartão salvo.", "ok");
        fechar(); desenhar(false);
      });
    });
  }

  function janelaCalendario(c) {
    abrirJanela(`
      <form class="modal">
        ${cab("📅 Mandar pro calendário")}
        <p class="muted" style="margin-top:-6px">Vai pro Calendário como "Ideia". As notas do cartão vão junto.</p>
        <label class="campo"><span class="rotulo">Título do conteúdo</span><input type="text" name="titulo" maxlength="140" required value="${esc(c.titulo)}"></label>
        <div class="linha-2">
          <label class="campo"><span class="rotulo">Data</span><input type="date" name="data" required value="${esc(c.prazo || hoje())}"></label>
          <label class="campo"><span class="rotulo">Formato</span><select name="formato">${FORMATOS.map(([v, t]) => `<option value="${v}">${t}</option>`).join("")}</select></label>
        </div>
        <div class="modal-acoes"><span style="flex:1"></span><button type="button" class="btn" data-fechar>Cancelar</button><button type="submit" class="btn btn-primario">📅 Mandar</button></div>
      </form>`, (fundo, fechar) => {
      const f = fundo.querySelector("form");
      f.addEventListener("submit", async (ev) => {
        ev.preventDefault();
        const r = await Dados.salvarPost({ titulo: f.titulo.value.trim(), data: f.data.value, formato: f.formato.value, status: "ideia", link: "", notas: c.notas || "" });
        if (r.erro) return toast(r.erro, "erro");
        toast("📅 Foi pro calendário!", "ok");
        fechar();
      });
    });
  }

  // =================================================================
  // 🤖 CARTÕES AUTOMÁTICOS
  // =================================================================
  const TITULO_ACAO = {
    followup: (a) => `📨 ${a.n}º follow-up: ${a.marca}`,
    pausar: (a) => `⏸️ ${a.marca} não respondeu: pausar ou encerrar`,
    retomar: (a) => `🔁 Retomar contato: ${a.marca}`,
  };

  // Devolve true se mudou alguma coisa
  async function sincronizar() {
    if (!window.Abordagens?.acoesPendentes) return false;
    const { acoes, filas, hoje: h } = await Abordagens.acoesPendentes();
    let mudou = false;
    const salvar = async (row) => {
      const r = await Dados.salvar("quadro_cartoes", row);
      if (r.erro) { console.warn(r.erro); return null; }
      const i = cartoes.findIndex((x) => x.id === r.row.id);
      if (i >= 0) cartoes[i] = r.row; else cartoes.push(r.row);
      mudou = true;
      return r.row;
    };
    const agora = new Date().toISOString();

    // 📨 follow-ups / pausar / retomar que já venceram
    const chave = (a) => `${a.id}:${a.tipo}:${a.data}`;
    const todas = new Set(acoes.map(chave));
    for (const a of acoes.filter((x) => x.data <= h)) {
      if (cartoes.some((c) => c.origem === "followup" && c.origem_id === chave(a))) continue;
      await salvar({
        titulo: TITULO_ACAO[a.tipo](a), notas: "", coluna: "comecar", categoria: "marcas", perfil: a.perfil,
        prazo: a.data, ordem: menorOrdem("comecar"), origem: "followup", origem_id: chave(a), feito_em: null,
      });
    }
    // já resolvido em Marcas & prospecção: vai pra Concluído
    for (const c of cartoes.filter((x) => x.origem === "followup" && x.coluna !== "feito" && !todas.has(x.origem_id))) {
      await salvar({ ...c, coluna: "feito", feito_em: agora });
    }

    // 🚀 lista do dia (um cartão por perfil, que vai passando de um dia pro outro)
    for (const f of filas) {
      const abertos = cartoes.filter((c) => c.origem === "lista" && c.perfil === f.perfil && c.coluna !== "feito");
      const titulo = `🚀 Abordar marcas da Lista do dia (${f.fila} na fila)`;
      if (!f.fila) {
        for (const c of abertos) await salvar({ ...c, coluna: "feito", feito_em: agora });
        continue;
      }
      const idHoje = `lista:${f.perfil}:${h}`;
      if (abertos.length) {
        const c = abertos[0];
        if (c.titulo !== titulo || c.origem_id !== idHoje || c.prazo !== h) await salvar({ ...c, titulo, origem_id: idHoje, prazo: h });
      } else if (!cartoes.some((c) => c.origem === "lista" && c.origem_id === idHoje)) {
        await salvar({
          titulo, notas: "", coluna: "comecar", categoria: "marcas", perfil: f.perfil, prazo: h,
          ordem: menorOrdem("comecar"), origem: "lista", origem_id: idHoje, feito_em: null,
        });
      }
    }
    return mudou;
  }

  // Cartões que ainda não foram concluídos (tela de Início)
  async function contarAbertos() {
    const l = await Dados.listar("quadro_cartoes");
    return (l || []).filter((c) => c.coluna !== "feito").length;
  }

  // Cartões pra hoje (prazo até hoje e ainda não concluídos) — tela de Início
  async function contarHoje() {
    const l = await Dados.listar("quadro_cartoes");
    const h = hoje();
    return (l || []).filter((c) => c.coluna !== "feito" && c.prazo && c.prazo <= h).length;
  }

  return { render, contarAbertos, contarHoje };
})();
