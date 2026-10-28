// =====================================================================
// automacoes.js: sub-aba "Automações" (o "ManyChat").
//   - Lista de automações
//   - Editor visual (gatilho + resposta + construtor de conversa)
//   - Prévia ao vivo num mockup de celular
//
// Como a conversa vira o "flow" salvo no banco (seção 7 do prompt):
//   Mensagem 1 = "Sua mensagem" + "Texto do botão" (primeiro item de steps)
//   "Um link"            -> o botão da Mensagem 1 tem { url }
//   "Continua a conversa" -> o botão da Mensagem 1 tem { next } e os
//                           passos seguintes vêm do construtor.
// =====================================================================
window.Automacoes = (() => {
  const { esc, icone, toast, $ } = App;

  const EMOJIS = ["🫶", "👀", "😍", "🥰", "😂", "😮", "🔥", "✨", "💌", "👉", "🙌", "💕"];
  const LIMITE_TITULO = 20;   // o Instagram corta o título do botão em 20
  const MAX_BOTOES = 3;       // máximo de botões anexados por mensagem
  const pareceLink = (s) => /^(https?:\/\/|www\.)\S+$/i.test(String(s || "").trim()) || /^\S+\.(com|br|net|org|io|me|app|link|ly)(\/\S*)?$/i.test(String(s || "").trim());
  const linkValido = (s) => /^https?:\/\/\S+\.\S+/i.test(String(s || "").trim());

  let elLista = null;     // onde a lista está desenhada
  let ed = null;          // estado do editor aberto
  let instantaneo = "";   // "foto" do que estava salvo, pra saber se mudou
  let cachePosts = null;  // posts do Instagram (carrega 1x)

  // =================================================================
  // LISTA
  // =================================================================
  async function renderLista(el) {
    elLista = el;
    el.innerHTML = `<div class="card"><p class="muted">Carregando automações...</p></div>`;
    const lista = await Dados.listarAutomacoes();

    const topo = `
      <div class="cabecalho" style="margin-bottom:16px">
        <div>
          <h2>Suas automações</h2>
          <p class="muted">Quando alguém comenta a palavra, a pessoa recebe sua mensagem no direct.</p>
        </div>
        <button class="btn btn-primario" data-acao="nova">${icone("mais", 16)} Nova automação</button>
      </div>`;

    if (!lista.length) {
      el.innerHTML = topo + `
        <div class="card vazio">
          <div class="vazio-icone">${icone("chat", 24)}</div>
          <h2>Nenhuma automação ainda</h2>
          <p>Crie a primeira: escolha uma palavra, escreva a mensagem e veja a prévia de como ela chega no direct.</p>
          <button class="btn btn-primario" data-acao="nova">${icone("mais", 16)} Nova automação</button>
        </div>`;
    } else {
      el.innerHTML = topo + `<div class="lista">${lista.map(linhaLista).join("")}</div>`;
    }

    el.onclick = async (e) => {
      const b = e.target.closest("[data-acao]");
      if (!b) return;
      const id = b.dataset.id;
      if (b.dataset.acao === "nova") abrirEditor(null);
      if (b.dataset.acao === "editar") abrirEditor(lista.find((a) => a.id === id));
      if (b.dataset.acao === "apagar") {
        const a = lista.find((x) => x.id === id);
        if (!confirm(`Apagar a automação "${a?.nome || ""}"? Isso não pode ser desfeito.`)) return;
        const r = await Dados.apagarAutomacao(id);
        if (r.erro) toast(r.erro, "erro"); else { toast("Automação apagada.", "ok"); renderLista(el); }
      }
    };
    el.onchange = async (e) => {
      const t = e.target;
      if (t.dataset.acao !== "ativa") return;
      const r = await Dados.alternarAtiva(t.dataset.id, t.checked);
      if (r.erro) { toast(r.erro, "erro"); t.checked = !t.checked; return; }
      toast(t.checked ? "Automação ligada." : "Automação desligada.", "ok");
      const sel = t.closest(".linha-auto").querySelector(".selo");
      sel.className = `selo ${t.checked ? "selo-ok" : "selo-off"}`;
      sel.textContent = t.checked ? "Ligada" : "Desligada";
    };
  }

  function linhaLista(a) {
    const palavras = a.match_any
      ? `<span class="chip">qualquer palavra</span>`
      : (a.keyword || "").split(",").map((k) => k.trim()).filter(Boolean).slice(0, 4).map((k) => `<span class="chip">${esc(k)}</span>`).join(" ");
    const passos = a.flow?.steps?.length || 0;
    const tipo = a.flow?.steps?.[0]?.buttons?.[0]?.url ? "Um link" : passos > 1 ? `Conversa (${passos} mensagens)` : "Mensagem";
    return `
      <div class="card linha-auto">
        <div class="info">
          <div class="nome">${esc(a.nome || "Sem nome")} <span class="selo ${a.active ? "selo-ok" : "selo-off"}">${a.active ? "Ligada" : "Desligada"}</span></div>
          <div class="det" style="margin-top:4px">${palavras || '<span class="muted">sem palavra</span>'} <span style="margin-left:6px">${tipo}</span></div>
        </div>
        <div class="acoes">
          <label class="interruptor" title="Ligar ou desligar">
            <input type="checkbox" data-acao="ativa" data-id="${a.id}" ${a.active ? "checked" : ""}><span class="trilho"></span>
          </label>
          <button class="btn btn-sm" data-acao="editar" data-id="${a.id}">${icone("lapis", 14)} Editar</button>
          <button class="btn btn-sm btn-perigo" data-acao="apagar" data-id="${a.id}" aria-label="Apagar">${icone("lixo", 14)}</button>
        </div>
      </div>`;
  }

  // =================================================================
  // ESTADO DO EDITOR <-> LINHA DO BANCO
  // =================================================================
  function novoEstado() {
    return {
      id: null, nome: "", keywords: [], match_any: false, active: true, media_ids: [],
      respostas: [""],
      m1Id: 1,
      message: "",
      button_on: true,       // botão LIGADO por padrão
      button_title: "",
      acao: "link",          // "link" | "conversa"
      link: "",
      asset_ids: [],
      passos: [],            // Mensagem 2 em diante
      proxId: 2,
    };
  }

  function novoPasso() {
    return { id: ed.proxId++, message: "", buttons: [], depois: { tipo: "", next: "", segundos: 30 } };
  }

  // Lê uma automação salva e monta o estado do editor
  function deRow(row) {
    const s = novoEstado();
    if (!row) return s;
    const steps = row.flow?.steps || [];
    const m1 = steps[0] || {};
    const b = (m1.buttons || [])[0];
    s.id = row.id;
    s.nome = row.nome || "";
    s.keywords = (row.keyword || "").split(",").map((k) => k.trim()).filter(Boolean);
    s.match_any = !!row.match_any;
    s.active = row.active !== false;
    s.media_ids = row.media_ids || [];
    s.respostas = [row.public_reply || "", ...(row.public_reply_variants || [])];
    s.m1Id = m1.id ?? 1;
    s.message = m1.message || "";
    s.button_on = !!b;
    s.button_title = b?.title || "";
    s.acao = b && (b.kind === "link" || b.url !== undefined) ? "link" : b ? "conversa" : "link";
    s.link = b?.url || "";
    s.asset_ids = row.asset_ids || m1.assets || [];
    s.passos = steps.slice(1).map((p) => ({
      id: p.id,
      message: p.message || "",
      buttons: (p.buttons || []).map((x) => ({
        title: x.title || "",
        // "kind" é o estado próprio do destino (não depende da URL estar preenchida)
        kind: x.kind || (x.url !== undefined ? "link" : x.next !== undefined && x.next !== null ? "next" : "end"),
        next: x.next ?? "",
        url: x.url || "",
      })),
      depois: p.collect ? { tipo: p.collect.field, next: p.collect.next ?? "", segundos: 30 }
        : p.delay ? { tipo: "delay", next: p.delay.next ?? "", segundos: p.delay.seconds || 30 }
        : { tipo: "", next: "", segundos: 30 },
    }));
    const ids = steps.map((p) => Number(p.id)).filter((n) => !isNaN(n));
    s.proxId = Math.max(1, s.m1Id, ...ids) + 1;
    return s;
  }

  // Monta o "flow" a partir do estado do editor
  function montarFlow() {
    const m1 = { id: ed.m1Id, message: ed.message, buttons: [], assets: ed.asset_ids };
    const conversa = ed.button_on && ed.acao === "conversa";
    if (ed.button_on) {
      if (ed.acao === "link") m1.buttons.push({ title: ed.button_title.trim(), kind: "link", url: ed.link.trim() });
      else m1.buttons.push({ title: ed.button_title.trim(), kind: "next", next: ed.passos[0]?.id ?? null });
    }
    const steps = [m1];
    if (conversa) {
      for (const p of ed.passos) {
        const passo = {
          id: p.id,
          message: p.message,
          buttons: p.buttons.map((b) =>
            b.kind === "link" ? { title: b.title.trim(), kind: "link", url: b.url.trim() }
            : b.kind === "next" ? { title: b.title.trim(), kind: "next", next: b.next === "" ? null : Number(b.next) }
            : { title: b.title.trim(), kind: "end" }   // encerrar: não é enviado
          ),
        };
        const d = p.depois;
        if ((d.tipo === "email" || d.tipo === "telefone")) passo.collect = { field: d.tipo, next: d.next === "" ? null : Number(d.next) };
        if (d.tipo === "delay" && d.next !== "") passo.delay = { seconds: Math.max(1, Number(d.segundos) || 30), next: Number(d.next) };
        steps.push(passo);
      }
    }
    return { steps };
  }

  function montarRow() {
    const respostas = ed.respostas.map((r) => r.trim());
    return {
      id: ed.id,
      nome: ed.nome.trim() || (ed.keywords[0] ? `Automação: ${ed.keywords[0]}` : "Nova automação"),
      keyword: ed.keywords.join(", "),
      match_any: ed.match_any,
      active: ed.active,
      media_ids: ed.media_ids,
      public_reply: respostas[0] || "",
      public_reply_variants: respostas.slice(1).filter(Boolean),
      flow: montarFlow(),
      asset_ids: ed.asset_ids,
    };
  }

  const mudou = () => !!ed && JSON.stringify(montarRow()) !== instantaneo;

  // =================================================================
  // ABRIR / FECHAR
  // =================================================================
  function abrirEditor(row) {
    ed = deRow(row);
    instantaneo = JSON.stringify(montarRow());
    const el = $("#editor");
    el.innerHTML = `
      <div class="editor-topo">
        <button class="btn btn-sm" data-acao="voltar">${icone("voltar", 15)} Voltar</button>
        <input class="nome-auto" type="text" data-path="nome" placeholder="Nome da automação (ex: Guia grátis)" value="${esc(ed.nome)}" aria-label="Nome da automação">
        <span class="espaco"></span>
        <div class="botoes-topo">
          <button class="btn btn-sm previa-toggle" data-acao="ir-previa">Ver prévia</button>
          <label class="interruptor" title="Automação ligada">
            <input type="checkbox" data-path="active" ${ed.active ? "checked" : ""}><span class="trilho"></span><span class="muted" style="font-size:13px">Ligada</span>
          </label>
          <button class="btn btn-primario btn-sm" data-acao="salvar">Salvar</button>
        </div>
      </div>
      <div class="editor-corpo">
        <div class="editor-form"><div class="editor-form-inner" id="ed-form"></div></div>
        <aside class="editor-previa" id="ed-previa-col">
          <div class="previa-titulo"><span class="rotulo">Prévia ao vivo</span></div>
          <div class="celular">
            <div class="cel-topo">
              <div class="cel-avatar"></div>
              <div><div class="cel-nome">sua_conta</div><div class="cel-sub">Instagram</div></div>
            </div>
            <div class="cel-chat" id="ed-previa"></div>
          </div>
          <p class="previa-legenda">É assim que a DM chega. Botões sem destino não aparecem, porque também não são enviados.</p>
        </aside>
      </div>`;
    el.hidden = false;
    document.body.style.overflow = "hidden";

    // eventos do editor (delegados)
    el.oninput = aoDigitar;
    el.onchange = aoMudar;
    el.onclick = aoClicar;
    el.onkeydown = aoTeclar;
    el.onpaste = (e) => { if (e.target.id === "ed-tag-input") setTimeout(() => adicionarTag(e.target), 0); };

    renderForm();
    carregarPosts();
    carregarArquivos();
  }

  function fecharEditor(forcar = false) {
    if (!forcar && mudou() && !confirm("Você tem alterações não salvas. Sair mesmo assim?")) return false;
    $("#editor").hidden = true;
    $("#editor").innerHTML = "";
    document.body.style.overflow = "";
    ed = null;
    if (elLista && document.body.contains(elLista)) renderLista(elLista);
    return true;
  }

  // Usado pelo "Sair" do menu
  function podeSair() {
    if (!ed) return true;
    return fecharEditor();
  }

  // Avisa ao fechar a aba com algo não salvo
  window.addEventListener("beforeunload", (e) => {
    if (mudou()) { e.preventDefault(); e.returnValue = ""; }
  });

  // =================================================================
  // FORMULÁRIO
  // =================================================================
  function renderForm() {
    const f = $("#ed-form");
    const rolagem = f.closest(".editor-form").scrollTop;
    f.innerHTML = `
      <div id="ed-erros"></div>

      <section class="card bloco">
        <div class="bloco-cab"><span class="bloco-num">1</span><div><h2>O gatilho</h2><p>O que faz a DM disparar</p></div></div>

        <span class="rotulo">Palavras que ativam</span>
        <div class="tags ${ed.match_any ? "desligado" : ""}" id="ed-tags">
          ${ed.keywords.map((k, i) => `<span class="tag">${esc(k)}<button type="button" data-acao="tirar-tag" data-i="${i}" aria-label="Remover ${esc(k)}">×</button></span>`).join("")}
          <input id="ed-tag-input" type="text" placeholder="${ed.keywords.length ? "Adicionar outra" : "Digite uma palavra e aperte Enter"}" ${ed.match_any ? "disabled" : ""}>
        </div>
        <p class="ajuda">Ex: QUERO, GUIA, LINK. Não diferencia maiúsculas nem acentos.</p>
        <label class="interruptor" style="margin-top:12px">
          <input type="checkbox" data-path="match_any" ${ed.match_any ? "checked" : ""}><span class="trilho"></span>
          <span>Qualquer palavra ativa <span class="muted">(qualquer comentário no post dispara)</span></span>
        </label>

        <div class="divisor"></div>
        <span class="rotulo">Em quais posts</span>
        <div id="ed-posts"></div>

        <div class="divisor"></div>
        <span class="rotulo">Resposta no comentário</span>
        <p class="ajuda" style="margin:-2px 0 10px">Texto público que responde quem comentou. Com mais de uma variação, o sistema alterna entre elas.</p>
        ${ed.respostas.map((r, i) => `
          <div class="variacao">
            <span class="letra">${String.fromCharCode(65 + i)}</span>
            <input type="text" data-path="respostas.${i}" value="${esc(r)}" placeholder="${i === 0 ? "Ex: te chamei no direct 💌" : "Outra forma de dizer"}">
            ${i > 0 ? `<button class="btn-icone" data-acao="rm-resp" data-i="${i}" aria-label="Remover variação">${icone("x", 16)}</button>` : ""}
          </div>`).join("")}
        ${ed.respostas.length < 5 ? `<button class="btn btn-texto btn-sm" data-acao="add-resp">${icone("mais", 14)} Adicionar variação A/B</button>` : ""}
      </section>

      <section class="card bloco">
        <div class="bloco-cab"><span class="bloco-num">2</span><div><h2>A resposta</h2><p>O que a pessoa recebe na DM</p></div></div>

        <span class="rotulo">Sua mensagem</span>
        ${barraEmojis("message")}
        <textarea data-path="message" id="campo-message" placeholder="Oi! Que bom que você comentou. Aqui está o que eu prometi 👇">${esc(ed.message)}</textarea>

        <div style="margin-top:14px">
          <label class="interruptor">
            <input type="checkbox" data-path="button_on" ${ed.button_on ? "checked" : ""}><span class="trilho"></span>
            <span>Botão na mensagem</span>
          </label>
        </div>

        ${ed.button_on ? htmlBotaoM1() : `<p class="ajuda" style="margin-top:8px">Sem botão, a pessoa recebe só o texto.</p>`}

        <div class="divisor"></div>
        <span class="rotulo">Anexar um arquivo <span style="text-transform:none;letter-spacing:0;font-weight:400">(opcional)</span></span>
        <div id="ed-arquivos"></div>
      </section>`;
    f.closest(".editor-form").scrollTop = rolagem;
    desenharPosts();
    desenharArquivos();
    atualizarPrevia();
  }

  function htmlBotaoM1() {
    const t = ed.button_title;
    return `
      <label class="campo" style="margin-top:14px">
        <span class="rotulo">Texto do botão ${contador("button_title", t)}</span>
        <input type="text" data-path="button_title" value="${esc(t)}" placeholder="Ex: Quero o guia">
        ${dicaTituloLink(t, ed.acao === "link")}
      </label>

      <span class="rotulo">O que o botão faz quando ela toca</span>
      <div class="opcoes">
        <button type="button" class="opcao ${ed.acao === "link" ? "sel" : ""}" data-acao="acao" data-v="link">
          <span class="radio"></span><span><strong>Um link</strong><span>Ao tocar, a pessoa é levada pra um site.</span></span>
        </button>
        <button type="button" class="opcao ${ed.acao === "conversa" ? "sel" : ""}" data-acao="acao" data-v="conversa">
          <span class="radio"></span><span><strong>Continua a conversa</strong><span>Ao tocar, chegam as próximas mensagens.</span></span>
        </button>
      </div>

      ${ed.acao === "link" ? `
        <label class="campo" style="margin-top:14px">
          <span class="rotulo">Link completo</span>
          <textarea class="link-grande" data-path="link" placeholder="https://seusite.com/pagina">${esc(ed.link)}</textarea>
          <p class="ajuda">Regra de ouro: o link vai AQUI, nunca no nome do botão. A pessoa vê só o nome do botão; o link fica invisível.</p>
        </label>` : htmlConstrutor()}`;
  }

  // ---------- Construtor de sequência (mini-chat) ----------
  function htmlConstrutor() {
    return `
      <div style="margin-top:18px">
        <span class="rotulo">A conversa</span>
        <div class="msg-card referencia">
          <div class="msg-cab"><span class="titulo">Mensagem 1</span><span class="selo">referência</span></div>
          <div class="msg-corpo">
            <div class="msg-ref-texto">${ed.message.trim() ? esc(ed.message) : '<span class="muted">Escreva em "Sua mensagem", lá em cima.</span>'}</div>
            <p class="ajuda">Botão <b>${esc(ed.button_title || "(sem nome)")}</b> leva pra <b>Mensagem 2</b>. Pra mudar o texto, edite lá em cima.</p>
          </div>
        </div>
        ${ed.passos.map(htmlPasso).join("")}
        <button class="btn btn-sm" data-acao="add-passo">${icone("mais", 14)} Adicionar mensagem</button>
      </div>`;
  }

  function htmlPasso(p, i) {
    const n = i + 2;
    const base = `passos.${i}`;
    return `
      <div class="msg-card">
        <div class="msg-cab">
          <span class="titulo">Mensagem ${n}</span>
          <button class="btn-icone" data-acao="rm-passo" data-i="${i}" aria-label="Apagar Mensagem ${n}" title="Apagar mensagem">${icone("lixo", 15)}</button>
        </div>
        <div class="msg-corpo">
          ${barraEmojis(`${base}.message`)}
          <textarea data-path="${base}.message" placeholder="Escreva a Mensagem ${n}">${esc(p.message)}</textarea>
          ${p.buttons.map((b, j) => htmlBotao(p, i, b, j)).join("")}
          ${p.buttons.length < MAX_BOTOES
            ? `<button class="btn btn-texto btn-sm" style="margin-top:8px" data-acao="add-botao" data-i="${i}">${icone("mais", 14)} Adicionar botão</button>`
            : `<p class="ajuda">Máximo de ${MAX_BOTOES} botões anexados por mensagem.</p>`}
          ${htmlDepois(p, i)}
        </div>
      </div>`;
  }

  function htmlBotao(p, i, b, j) {
    const base = `passos.${i}.buttons.${j}`;
    return `
      <div class="botao-linha">
        <div class="linha-flex">
          <label>
            <span class="rotulo">Nome do botão ${contador(`${base}.title`, b.title)}</span>
            <input type="text" data-path="${base}.title" value="${esc(b.title)}" placeholder="Ex: Quero saber mais">
          </label>
          <label>
            <span class="rotulo">Destino</span>
            <select data-path="${base}.kind">
              <option value="next" ${b.kind === "next" ? "selected" : ""}>Ir pra outra mensagem</option>
              <option value="link" ${b.kind === "link" ? "selected" : ""}>Abrir um link</option>
              <option value="end" ${b.kind === "end" ? "selected" : ""}>Encerrar</option>
            </select>
          </label>
          <button class="btn-icone" style="align-self:flex-end;margin-bottom:4px" data-acao="rm-botao" data-i="${i}" data-j="${j}" aria-label="Remover botão">${icone("x", 16)}</button>
        </div>
        ${dicaTituloLink(b.title, b.kind === "link")}
        ${b.kind === "next" ? `
          <label class="campo" style="margin:10px 0 0">
            <span class="rotulo">Vai pra</span>
            <select data-path="${base}.next">
              <option value="" ${b.next === "" ? "selected" : ""}>Escolha a mensagem</option>
              ${ed.passos.map((q, k) => q.id === p.id ? "" : `<option value="${q.id}" ${String(b.next) === String(q.id) ? "selected" : ""}>Mensagem ${k + 2}</option>`).join("")}
              <option value="__nova">+ Criar nova mensagem</option>
            </select>
          </label>` : ""}
        ${b.kind === "link" ? `
          <label class="campo" style="margin:10px 0 0">
            <span class="rotulo">Link completo</span>
            <textarea class="link-grande" data-path="${base}.url" placeholder="https://seusite.com/pagina">${esc(b.url)}</textarea>
          </label>` : ""}
        ${b.kind === "end" ? `<p class="nota-fim">Encerrar não vira um botão: a conversa acaba aqui e esse botão não é enviado.</p>` : ""}
      </div>`;
  }

  // "Depois desta mensagem": pedir um dado ou mandar a próxima sozinha
  function htmlDepois(p, i) {
    const d = p.depois;
    const base = `passos.${i}.depois`;
    const outras = ed.passos.map((q, k) => q.id === p.id ? "" : `<option value="${q.id}" ${String(d.next) === String(q.id) ? "selected" : ""}>Mensagem ${k + 2}</option>`).join("");
    return `
      <div class="extras">
        <span>Depois desta mensagem:</span>
        <select data-path="${base}.tipo">
          <option value="" ${d.tipo === "" ? "selected" : ""}>Esperar um toque</option>
          <option value="email" ${d.tipo === "email" ? "selected" : ""}>Pedir o e-mail</option>
          <option value="telefone" ${d.tipo === "telefone" ? "selected" : ""}>Pedir o telefone</option>
          <option value="delay" ${d.tipo === "delay" ? "selected" : ""}>Mandar outra sozinha</option>
        </select>
        ${d.tipo === "delay" ? `<span>após</span><input type="number" min="1" style="width:80px" data-path="${base}.segundos" value="${esc(d.segundos)}"><span>segundos:</span>` : ""}
        ${d.tipo ? `<select data-path="${base}.next"><option value="">${d.tipo === "delay" ? "Escolha a mensagem" : "Depois, nada"}</option>${outras}<option value="__nova">+ Criar nova mensagem</option></select>` : ""}
      </div>
      ${d.tipo === "email" || d.tipo === "telefone" ? `<p class="ajuda">A próxima resposta da pessoa vira o ${d.tipo === "email" ? "e-mail" : "telefone"} salvo no lead (com validação: se vier estranho, o sistema pede de novo).</p>` : ""}`;
  }

  function contador(path, texto) {
    const n = String(texto || "").length;
    return `<span class="contador ${n > LIMITE_TITULO ? "cheio" : ""}" data-contador="${path}">${n}/${LIMITE_TITULO}</span>`;
  }

  function dicaTituloLink(titulo, ehLink) {
    if (!pareceLink(titulo)) return "";
    return ehLink
      ? ""
      : `<p class="ajuda" style="color:var(--atencao)">Isso parece um link. Escolha "abrir um link" e eu movo pro campo certo.</p>`;
  }

  function barraEmojis(alvo) {
    return `<div class="emojis">${EMOJIS.map((e) => `<button type="button" data-acao="emoji" data-alvo="${alvo}" data-e="${e}" aria-label="Inserir ${e}">${e}</button>`).join("")}</div>`;
  }

  // ---------- Posts ----------
  async function carregarPosts() {
    if (cachePosts === null) {
      const r = await Dados.funcao("ig-media");
      cachePosts = r?.connected ? r.posts || [] : false;
    }
    if (ed) desenharPosts();
  }

  function desenharPosts() {
    const el = $("#ed-posts");
    if (!el) return;
    if (cachePosts === null) { el.innerHTML = `<p class="caixa-info">Carregando seus posts...</p>`; return; }
    if (cachePosts === false || !cachePosts.length) {
      el.innerHTML = `<p class="caixa-info">Conecte seu Instagram pra escolher posts específicos. Sem escolha, a automação vale pra <b>todos os posts</b>.</p>`;
      return;
    }
    el.innerHTML = `
      <p class="ajuda" style="margin:-2px 0 10px">${ed.media_ids.length ? `${ed.media_ids.length} post(s) escolhido(s).` : "Nenhum escolhido = vale pra todos os posts."}</p>
      <div class="posts">${cachePosts.map((p) => `
        <button type="button" class="post ${ed.media_ids.includes(p.id) ? "sel" : ""}" data-acao="post" data-id="${esc(p.id)}" title="${esc(p.caption)}">
          ${p.thumb ? `<img src="${esc(p.thumb)}" alt="" loading="lazy">` : ""}
        </button>`).join("")}
      </div>`;
  }

  // ---------- Arquivos ----------
  let cacheArquivos = null;
  async function carregarArquivos() {
    cacheArquivos = await Dados.listarArquivos();
    if (ed) desenharArquivos();
  }

  function desenharArquivos() {
    const el = $("#ed-arquivos");
    if (!el) return;
    if (!Dados.usaSupabase()) {
      el.innerHTML = `<p class="caixa-info">A biblioteca de arquivos (PDF, áudio, foto, vídeo) funciona depois de configurar o Supabase, seguindo o LEIA-ME.</p>`;
      return;
    }
    const lista = cacheArquivos || [];
    el.innerHTML = `
      ${lista.length ? `<div class="arquivos">${lista.map((a) => `
        <label class="arquivo">
          <input type="checkbox" data-acao="asset" data-id="${a.id}" ${ed.asset_ids.includes(a.id) ? "checked" : ""}>
          ${icone("clipe", 15)} <span>${esc(a.nome)}</span> <span class="muted" style="margin-left:auto">${esc(a.tipo)}</span>
        </label>`).join("")}</div>` : `<p class="ajuda">Sua biblioteca está vazia.</p>`}
      <label class="btn btn-sm" style="margin-top:10px">
        ${icone("mais", 14)} Enviar arquivo pra biblioteca
        <input type="file" data-acao="upload" hidden accept="image/*,audio/*,video/*,application/pdf">
      </label>
      <p class="ajuda">Pelas regras do Instagram, o arquivo da Mensagem 1 chega logo depois que a pessoa interage (toca no botão ou responde).</p>`;
  }

  // =================================================================
  // EVENTOS
  // =================================================================
  function setPath(path, valor) {
    const ks = path.split(".");
    let o = ed;
    for (let i = 0; i < ks.length - 1; i++) o = o[ks[i]];
    o[ks[ks.length - 1]] = valor;
  }
  function getPath(path) {
    return path.split(".").reduce((o, k) => (o == null ? o : o[k]), ed);
  }

  // Digitando: atualiza o estado e a prévia, sem redesenhar (não perde o foco)
  function aoDigitar(e) {
    const t = e.target;
    const path = t.dataset.path;
    if (!path || !ed) return;
    if (t.tagName === "SELECT") return; // selects tratados no "change"
    setPath(path, t.type === "checkbox" ? t.checked : t.value);
    const c = document.querySelector(`[data-contador="${path}"]`);
    if (c) {
      const n = t.value.length;
      c.textContent = `${n}/${LIMITE_TITULO}`;
      c.classList.toggle("cheio", n > LIMITE_TITULO);
    }
    if (path === "message") {
      const ref = document.querySelector(".msg-ref-texto");
      if (ref) ref.innerHTML = ed.message.trim() ? esc(ed.message) : '<span class="muted">Escreva em "Sua mensagem", lá em cima.</span>';
    }
    atualizarPrevia();
  }

  // Mudanças de estrutura: redesenha o formulário
  function aoMudar(e) {
    const t = e.target;
    if (!ed) return;

    if (t.dataset.acao === "asset") {
      ed.asset_ids = t.checked ? [...ed.asset_ids, t.dataset.id] : ed.asset_ids.filter((x) => x !== t.dataset.id);
      atualizarPrevia();
      return;
    }
    if (t.dataset.acao === "upload") { enviarArquivo(t); return; }

    const path = t.dataset.path;
    if (!path) return;
    let valor = t.type === "checkbox" ? t.checked : t.value;

    // "+ Criar nova mensagem" num seletor de destino
    if (valor === "__nova") {
      const p = novoPasso();
      ed.passos.push(p);
      valor = p.id;
    }
    setPath(path, valor);

    // Escolheu "Abrir um link": se colou um link no NOME, move pro campo certo.
    // O campo do link aparece NA HORA, mesmo vazio (o "kind" guarda a escolha).
    if (/\.kind$/.test(path) && valor === "link") {
      const b = getPath(path.replace(/\.kind$/, ""));
      if (pareceLink(b.title)) {
        if (!b.url) b.url = normalizaLink(b.title);
        b.title = "Acessar";
      }
    }
    // Colou um link no nome de um botão que já é de link: move também
    let redesenhar = false;
    if (/\.title$/.test(path)) {
      const b = getPath(path.replace(/\.title$/, ""));
      if (b.kind === "link" && pareceLink(b.title)) {
        if (!b.url) b.url = normalizaLink(b.title);
        b.title = "Acessar";
        toast("Movi o link pro campo do link e dei o nome \"Acessar\" ao botão.", "ok");
      }
      redesenhar = pareceLink(t.value); // mostra a dica ou o link movido
    }
    if (path === "button_title" && ed.acao === "link" && pareceLink(ed.button_title)) {
      if (!ed.link) ed.link = normalizaLink(ed.button_title);
      ed.button_title = "Acessar";
      toast("Movi o link pro campo do link e dei o nome \"Acessar\" ao botão.", "ok");
    }
    if (path === "button_title") redesenhar = pareceLink(t.value);

    // Só redesenha quando a estrutura muda (senão o foco pula de campo)
    const estrutura = redesenhar || /(^button_on|^match_any)$/.test(path) || t.tagName === "SELECT";
    if (estrutura) renderForm(); else atualizarPrevia();
  }

  function aoClicar(e) {
    const b = e.target.closest("[data-acao]");
    if (!b || !ed) {
      if (e.target.closest("#ed-tags")) $("#ed-tag-input")?.focus();
      return;
    }
    const a = b.dataset.acao;
    const i = Number(b.dataset.i);

    if (a === "voltar") return fecharEditor();
    if (a === "salvar") return salvar();
    if (a === "ir-previa") return $("#ed-previa-col").scrollIntoView({ behavior: "smooth" });

    if (a === "tirar-tag") { ed.keywords.splice(i, 1); renderForm(); $("#ed-tag-input")?.focus(); return; }
    if (a === "add-resp") { ed.respostas.push(""); renderForm(); return; }
    if (a === "rm-resp") { ed.respostas.splice(i, 1); renderForm(); return; }

    if (a === "acao") {
      ed.acao = b.dataset.v;
      if (ed.acao === "link" && pareceLink(ed.button_title)) {
        if (!ed.link) ed.link = normalizaLink(ed.button_title);
        ed.button_title = "Acessar";
      }
      if (ed.acao === "conversa" && !ed.passos.length) ed.passos.push(novoPasso());
      renderForm();
      return;
    }

    if (a === "add-passo") { ed.passos.push(novoPasso()); renderForm(); return; }
    if (a === "rm-passo") {
      const p = ed.passos[i];
      const temConteudo = p.message.trim() || p.buttons.length;
      if (temConteudo && !confirm(`Apagar a Mensagem ${i + 2}?`)) return;
      ed.passos.splice(i, 1);
      // quem apontava pra ela passa a não ter destino
      for (const q of ed.passos) {
        for (const x of q.buttons) if (String(x.next) === String(p.id)) x.next = "";
        if (String(q.depois.next) === String(p.id)) q.depois.next = "";
      }
      renderForm();
      return;
    }
    if (a === "add-botao") {
      ed.passos[i].buttons.push({ title: "", kind: "next", next: "", url: "" });
      renderForm();
      return;
    }
    if (a === "rm-botao") { ed.passos[i].buttons.splice(Number(b.dataset.j), 1); renderForm(); return; }

    if (a === "post") {
      const id = b.dataset.id;
      ed.media_ids = ed.media_ids.includes(id) ? ed.media_ids.filter((x) => x !== id) : [...ed.media_ids, id];
      desenharPosts();
      return;
    }

    if (a === "emoji") {
      const alvo = b.dataset.alvo;
      const campo = document.querySelector(`textarea[data-path="${alvo}"]`);
      if (!campo) return;
      const ini = campo.selectionStart ?? campo.value.length;
      const fim = campo.selectionEnd ?? campo.value.length;
      campo.value = campo.value.slice(0, ini) + b.dataset.e + campo.value.slice(fim);
      const pos = ini + b.dataset.e.length;
      campo.focus();
      campo.setSelectionRange(pos, pos);
      campo.dispatchEvent(new Event("input", { bubbles: true }));
    }
  }

  // Tags: Enter ou vírgula adiciona; Backspace no vazio remove a última
  function aoTeclar(e) {
    const t = e.target;
    if (t.id !== "ed-tag-input") return;
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      adicionarTag(t);
    } else if (e.key === "Backspace" && !t.value && ed.keywords.length) {
      ed.keywords.pop();
      renderForm();
      $("#ed-tag-input")?.focus();
    }
  }

  function adicionarTag(input) {
    const novas = input.value.split(",").map((s) => s.trim()).filter(Boolean);
    if (!novas.length) return;
    for (const n of novas) {
      if (!ed.keywords.some((k) => k.toLowerCase() === n.toLowerCase())) ed.keywords.push(n);
    }
    renderForm();
    $("#ed-tag-input")?.focus();
  }

  const normalizaLink = (s) => {
    const v = String(s || "").trim();
    return /^https?:\/\//i.test(v) ? v : `https://${v}`;
  };

  async function enviarArquivo(input) {
    const arq = input.files?.[0];
    if (!arq) return;
    toast("Enviando arquivo...");
    const r = await Dados.enviarArquivo(arq);
    if (r.erro) { toast(r.erro, "erro"); return; }
    cacheArquivos = [r.row, ...(cacheArquivos || [])];
    ed.asset_ids.push(r.row.id);
    toast("Arquivo enviado e anexado.", "ok");
    renderForm();
  }

  // =================================================================
  // VALIDAÇÃO E SALVAR
  // =================================================================
  function validar() {
    const erros = [];
    const pendente = $("#ed-tag-input")?.value.trim();
    if (pendente) adicionarTag($("#ed-tag-input"));

    if (!ed.match_any && !ed.keywords.length) erros.push("Adicione pelo menos uma palavra que ativa, ou ligue \"Qualquer palavra ativa\".");
    if (!ed.message.trim()) erros.push("Escreva \"Sua mensagem\" (a Mensagem 1).");
    if (ed.button_on) {
      if (!ed.button_title.trim()) erros.push("Dê um nome ao botão da Mensagem 1.");
      if (ed.button_title.length > LIMITE_TITULO) erros.push(`O nome do botão da Mensagem 1 passa de ${LIMITE_TITULO} caracteres.`);
      if (ed.acao === "link" && !linkValido(ed.link)) erros.push("Cole o link completo do botão (começando com https://).");
      if (ed.acao === "conversa") {
        if (!ed.passos.length) erros.push("Adicione a Mensagem 2 da conversa.");
        ed.passos.forEach((p, i) => {
          const n = i + 2;
          if (!p.message.trim()) erros.push(`Escreva o texto da Mensagem ${n}.`);
          p.buttons.forEach((b, j) => {
            const nome = b.title.trim() || `botão ${j + 1}`;
            if (b.kind !== "end" && !b.title.trim()) erros.push(`Dê um nome ao botão ${j + 1} da Mensagem ${n}.`);
            if (b.title.length > LIMITE_TITULO) erros.push(`O botão "${nome}" da Mensagem ${n} passa de ${LIMITE_TITULO} caracteres.`);
            if (b.kind === "link" && !linkValido(b.url)) erros.push(`Cole o link completo do botão "${nome}" da Mensagem ${n}.`);
            if (b.kind === "next" && !ed.passos.some((q) => String(q.id) === String(b.next))) erros.push(`Escolha pra qual mensagem o botão "${nome}" da Mensagem ${n} leva.`);
          });
          if (p.depois.tipo === "delay" && p.depois.next === "") erros.push(`Escolha qual mensagem sai sozinha depois da Mensagem ${n}.`);
        });
      }
    }
    return erros;
  }

  async function salvar() {
    const erros = validar();
    const caixa = $("#ed-erros");
    if (erros.length) {
      caixa.innerHTML = `<div class="alerta alerta-erro"><b>Falta pouco pra salvar:</b><ul>${erros.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></div>`;
      caixa.closest(".editor-form").scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    caixa.innerHTML = "";
    const btn = document.querySelector('[data-acao="salvar"]');
    btn.disabled = true;
    btn.textContent = "Salvando...";
    const r = await Dados.salvarAutomacao(montarRow());
    btn.disabled = false;
    btn.textContent = "Salvar";
    if (r.erro) { toast(r.erro, "erro"); return; }
    ed.id = r.row.id;
    ed.nome = r.row.nome;
    const campoNome = document.querySelector('[data-path="nome"]');
    if (campoNome) campoNome.value = ed.nome;
    instantaneo = JSON.stringify(montarRow());
    if (r.local) {
      toast("Salvo só neste navegador (modo de teste). Pra salvar de verdade, configure o Supabase seguindo o LEIA-ME.", "aviso");
    } else {
      toast("Automação salva.", "ok");
    }
  }

  // =================================================================
  // PRÉVIA AO VIVO
  // =================================================================
  function atualizarPrevia() {
    const el = $("#ed-previa");
    if (!el || !ed) return;
    const conversa = ed.button_on && ed.acao === "conversa";
    const existe = (id) => ed.passos.some((q) => String(q.id) === String(id));

    // Botões que REALMENTE são enviados (sem destino = não aparece)
    const botoesM1 = [];
    const avisos = [];
    if (ed.button_on) {
      const titulo = ed.button_title.trim().slice(0, LIMITE_TITULO) || "Botão";
      if (ed.acao === "link") {
        if (ed.link.trim()) botoesM1.push({ title: titulo, link: true });
        else avisos.push("O botão aparece quando você colar o link.");
      } else if (ed.passos[0]) botoesM1.push({ title: titulo });
    }

    const visiveis = (p) => p.buttons
      .filter((b) => (b.kind === "link" && b.url.trim()) || (b.kind === "next" && existe(b.next)))
      .slice(0, MAX_BOTOES)
      .map((b) => ({ title: b.title.trim().slice(0, LIMITE_TITULO) || "Botão", link: b.kind === "link", next: b.next }));

    const resposta = ed.respostas.find((r) => r.trim());
    const palavra = ed.match_any ? "adorei!" : ed.keywords[0] || "sua palavra";
    let h = `
      <div class="cel-comentario"><b>@alguem</b> comentou: ${esc(palavra)}
        ${resposta ? `<br><span style="margin-left:8px">↳ <b>sua_conta</b>: ${esc(resposta)}</span>` : ""}
      </div>
      <div class="cel-dia">Mensagem direta</div>
      ${bolha(ed.message, botoesM1)}
      ${avisos.map((a) => `<div class="cel-nota">${esc(a)}</div>`).join("")}`;

    // arquivos anexados à Mensagem 1
    for (const id of ed.asset_ids) {
      const a = (cacheArquivos || []).find((x) => x.id === id);
      if (a) h += `<div class="bolha-anexo">${icone("clipe", 13)} ${esc(a.nome)}</div>`;
    }

    if (conversa) {
      ed.passos.forEach((p, i) => {
        // como a pessoa chega aqui?
        let toque = null;
        if (i === 0 && botoesM1[0]) toque = botoesM1[0].title;
        if (!toque) {
          for (const q of ed.passos) {
            const b = visiveis(q).find((x) => String(x.next) === String(p.id));
            if (b) { toque = b.title; break; }
          }
        }
        const porDepois = ed.passos.some((q) => q.depois.tipo && String(q.depois.next) === String(p.id));
        if (toque) h += `<div class="bolha-eu">${esc(toque)}</div>`;
        else if (!porDepois) h += `<div class="cel-nota">Mensagem ${i + 2}: nenhum botão leva até aqui ainda</div>`;

        h += bolha(p.message, visiveis(p), `Mensagem ${i + 2}`);

        const d = p.depois;
        if (d.tipo === "email") h += `<div class="bolha-eu">nome@email.com</div>`;
        if (d.tipo === "telefone") h += `<div class="bolha-eu">(11) 90000-0000</div>`;
        if (d.tipo === "delay" && d.next !== "") h += `<div class="cel-nota">depois de ${esc(d.segundos)}s, chega sozinha:</div>`;
      });
    }

    el.innerHTML = h;
  }

  function bolha(texto, botoes, vazioTxt = "Sua mensagem") {
    const vazio = !String(texto || "").trim();
    return `
      <div class="bolha ${vazio ? "vazia" : ""}">
        <div class="bolha-texto">${vazio ? `${esc(vazioTxt)}...` : esc(texto)}</div>
        ${botoes.map((b) => `<div class="bolha-botao">${b.link ? icone("link", 13) : ""}${esc(b.title)}</div>`).join("")}
      </div>`;
  }

  return { renderLista, podeSair };
})();
