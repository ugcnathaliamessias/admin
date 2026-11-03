// =====================================================================
// abordagens.js: área "Abordagens" (menu lateral).
//   - Perfil: Nathalia (UGC) ou Vai Ter Estrada, cada um com seus textos
//   - Controle: marcas abordadas, datas e aviso de follow-up
//   - Modelos: marcas (fria / quente), plataformas (até 900 caracteres)
//     e follow-ups. Campos como {marca} e {produto} se preenchem na hora.
// Tabelas: abord_modelos e abord_contatos (no teste local, no navegador).
// =====================================================================
window.Abordagens = (() => {
  const { esc, icone, toast, num } = App;

  const PERFIS = [
    { v: "nathalia", t: "Nathalia (UGC)" },
    { v: "vaiterestrada", t: "Vai Ter Estrada" },
  ];
  const ABAS = [
    { v: "controle", t: "Controle" },
    { v: "marcas", t: "Marcas" },
    { v: "plataformas", t: "Plataformas" },
    { v: "followups", t: "Follow-ups" },
  ];
  const TIPOS = { fria: "Marca fria", quente: "Marca quente", conversa: "Depois que a marca responde", plataforma: "Plataforma", followup: "Follow-up" };
  const LIMITE_PLATAFORMA = 900;
  const LIMITE_DM = 1000; // limite de uma mensagem no direct do Instagram

  const SITUACOES = [
    { v: "sem_resposta_1", t: "1ª mensagem sem resposta" },
    { v: "ultimo", t: "Último follow-up" },
    { v: "ideia", t: "Depois de mandar a ideia" },
    { v: "time", t: "Depois de falar com o time de marketing" },
    { v: "proposta", t: "Depois de mandar a proposta" },
  ];
  const STATUS = [
    { v: "a_enviar", t: "A enviar", ativo: false },
    { v: "enviado", t: "1ª mensagem enviada", ativo: true },
    { v: "conversando", t: "Respondeu, ideia enviada", ativo: true },
    { v: "time", t: "Direcionada pro time", ativo: true },
    { v: "proposta", t: "Proposta enviada", ativo: true },
    { v: "fechou", t: "Fechou", ativo: false },
    { v: "recusou", t: "Sem interesse", ativo: false },
    { v: "sem_retorno", t: "Sem retorno (encerrada)", ativo: false },
  ];
  // Dias de espera antes de cada follow-up (1º, 2º). Depois disso, sugere encerrar.
  const ESPERA = { padrao: [3, 5], time: [5, 7], proposta: [4, 7] };
  // Campos que mudam a cada marca (não ficam lembrados)
  const CAMPOS_DA_MARCA = ["marca", "produto", "contato", "data"];
  // Campos de uma linha; o resto vira caixa de texto maior
  const CAMPOS_CURTOS = [...CAMPOS_DA_MARCA, "portfólio", "portfolio", "link", "nome"];

  const CHAVE_PERFIL = "painel_abord_perfil";
  const lerLocal = (k, p) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : p; } catch { return p; } };
  const gravarLocal = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* nada */ } };

  let el = null;
  let aba = "controle";
  let perfil = lerLocal(CHAVE_PERFIL, "nathalia");
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

  // ---------- follow-up ----------
  function proximo(c) {
    if (!statusDe(c.status).ativo) return null;
    const esperas = ESPERA[c.status] || ESPERA.padrao;
    const n = c.followups || 0;
    if (n >= esperas.length) return { data: somaDias(c.ultimo_envio, 7), encerrar: true };
    return { data: somaDias(c.ultimo_envio, esperas[n]), encerrar: false };
  }
  const vencido = (c) => { const p = proximo(c); return !!p && p.data <= hoje(); };

  function situacaoSugerida(c) {
    if ((c.followups || 0) >= 1) return "ultimo";
    return { conversando: "ideia", time: "time", proposta: "proposta" }[c.status] || "sem_resposta_1";
  }

  // ---------- campos {variaveis} ----------
  const RE_CAMPO = /\{([^{}\n]{1,30})\}/g;
  const camposDe = (t) => [...new Set([...String(t || "").matchAll(RE_CAMPO)].map((m) => m[1].trim()))];
  const chaveVars = () => `painel_abord_vars_${perfil}`;
  function preencher(texto, valores) {
    return String(texto || "").replace(RE_CAMPO, (m, k) => {
      const v = valores[k.trim()];
      return v ? v : m;
    });
  }

  // =================================================================
  // TELA
  // =================================================================
  async function render(alvo, sub) {
    el = alvo;
    aba = ABAS.some((a) => a.v === sub) ? sub : "controle";
    el.onclick = aoClicar;
    el.onchange = aoMudar;
    el.innerHTML = cabecalho() + `<div class="card"><p class="muted">Carregando...</p></div>`;
    [modelos, contatos] = await Promise.all([
      Dados.listarAbord("abord_modelos", perfil),
      Dados.listarAbord("abord_contatos", perfil),
    ]);
    desenhar();
  }

  function cabecalho() {
    const pendentes = contatos.filter(vencido).length;
    return `
      <div class="cabecalho">
        <div>
          <h1>Abordagens</h1>
          <p class="muted">Seus textos pra marcas e plataformas, e o controle de quem já recebeu mensagem.</p>
        </div>
        <div class="abord-perfis" role="group" aria-label="Perfil">
          ${PERFIS.map((p) => `<button class="abord-perfil ${p.v === perfil ? "ativo" : ""}" data-acao="perfil" data-v="${p.v}">${p.t}</button>`).join("")}
        </div>
      </div>
      <div class="abas" role="tablist">
        ${ABAS.map((a) => `<button class="aba ${a.v === aba ? "ativa" : ""}" data-acao="aba" data-v="${a.v}" role="tab">${a.t}${a.v === "controle" && pendentes ? ` <span class="abord-bolinha">${pendentes}</span>` : ""}</button>`).join("")}
      </div>
      ${Dados.usaSupabase() ? "" : `<p class="alerta alerta-atencao">Modo de teste local: tudo fica salvo só neste navegador.</p>`}`;
  }

  function desenhar() {
    let corpo = "";
    if (aba === "controle") corpo = telaControle();
    else if (aba === "marcas") corpo = secaoModelos("fria", "Marcas frias", "Marcas que ainda não trabalham com UGC: você se apresenta, explica rapidinho o que é UGC e oferece uma ideia.")
      + secaoModelos("quente", "Marcas quentes", "Marcas que já conhecem UGC ou já fizeram campanha com criadoras: vai direto pra ideia.")
      + secaoModelos("conversa", "Depois que a marca responde", "Vale pra fria e quente: a ideia depois do \"pode mandar\" e a mensagem pro time de marketing.");
    else if (aba === "plataformas") corpo = secaoModelos("plataforma", "Plataformas", `Textos pra candidaturas dentro de plataformas, com limite de ${LIMITE_PLATAFORMA} caracteres.`);
    else corpo = secaoModelos("followup", "Follow-ups", "Mensagens curtas pra quando a marca não respondeu. O Controle sugere a certa pra cada momento.");
    el.innerHTML = cabecalho() + corpo;
  }

  // ---------- CONTROLE ----------
  function telaControle() {
    const pend = contatos.filter(vencido);
    const andamento = contatos.filter((c) => statusDe(c.status).ativo || c.status === "a_enviar");
    const encerradas = contatos.filter((c) => !statusDe(c.status).ativo && c.status !== "a_enviar");
    const grupos = { pendentes: pend, andamento, encerradas, todas: contatos };
    if (filtro === "pendentes" && !pend.length && contatos.length) filtro = "andamento";
    const lista = [...(grupos[filtro] || contatos)].sort(ordenar);

    const botaoFiltro = (v, t, n) => `<button class="abord-filtro ${filtro === v ? "ativo" : ""}" data-acao="filtro" data-v="${v}">${t} <b>${n}</b></button>`;

    return `
      <div class="cabecalho" style="margin-bottom:14px">
        <div class="abord-filtros">
          ${botaoFiltro("pendentes", "Follow-up pra hoje", pend.length)}
          ${botaoFiltro("andamento", "Em andamento", andamento.length)}
          ${botaoFiltro("encerradas", "Encerradas", encerradas.length)}
          ${botaoFiltro("todas", "Todas", contatos.length)}
        </div>
        <button class="btn btn-primario" data-acao="nova-marca">${icone("mais", 16)} Nova marca</button>
      </div>
      ${lista.length ? `
        <div class="card leads-tabela-card">
          <table class="leads-tabela abord-tabela">
            <thead><tr>
              <th scope="col">Marca</th><th scope="col">Tipo</th><th scope="col">Status</th>
              <th scope="col">Último envio</th><th scope="col">Follow-up</th><th scope="col"><span class="sr">Ações</span></th>
            </tr></thead>
            <tbody>${lista.map(linhaContato).join("")}</tbody>
          </table>
        </div>
        <p class="muted abord-dica">Mudar o status reinicia a contagem do follow-up. A espera é de ${ESPERA.padrao[0]} dias pro 1º follow-up e mais ${ESPERA.padrao[1]} pro último. Depois disso, o painel sugere encerrar.</p>` : `
        <div class="card vazio">
          <div class="vazio-icone">${icone("envio", 24)}</div>
          <h2>${contatos.length ? "Nada por aqui" : "Nenhuma marca ainda"}</h2>
          <p>${contatos.length ? "Nenhuma marca nesse filtro." : "Quando mandar uma mensagem pra uma marca, cadastre aqui. O painel avisa o dia certo do follow-up e já deixa a mensagem pronta."}</p>
          ${contatos.length ? "" : `<button class="btn btn-primario" data-acao="nova-marca">${icone("mais", 16)} Cadastrar marca</button>`}
        </div>`}`;
  }

  function ordenar(a, b) {
    const pa = proximo(a), pb = proximo(b);
    if (pa && pb) return pa.data.localeCompare(pb.data);
    if (pa) return -1;
    if (pb) return 1;
    return String(b.ultimo_envio).localeCompare(String(a.ultimo_envio));
  }

  function linhaContato(c) {
    const p = proximo(c);
    const h = hoje();
    let fu = `<span class="muted">-</span>`;
    if (p) {
      const atraso = diasEntre(p.data, h);
      if (p.encerrar && atraso >= 0) fu = `<span class="abord-selo selo-encerrar">Sem resposta: encerrar?</span>`;
      else if (atraso > 0) fu = `<span class="abord-selo selo-atrasado">Atrasado ${atraso} ${atraso === 1 ? "dia" : "dias"}</span>`;
      else if (atraso === 0) fu = `<span class="abord-selo selo-hoje">Hoje</span>`;
      else fu = `<span class="abord-selo">${p.encerrar ? "Encerrar em" : "Em"} ${dataBr(p.data)}</span>`;
    }
    const insta = c.instagram ? `<br><a href="https://www.instagram.com/${encodeURIComponent(c.instagram.replace(/^@/, ""))}/" target="_blank" rel="noopener">@${esc(c.instagram.replace(/^@/, ""))}</a>` : "";
    const dias = diasEntre(c.ultimo_envio, h);
    const quando = dias <= 0 ? "hoje" : dias === 1 ? "ontem" : `há ${dias} dias`;
    const fus = c.followups ? ` · ${c.followups} follow-up${c.followups > 1 ? "s" : ""}` : "";
    return `
      <tr>
        <td data-rotulo="Marca"><strong>${esc(c.marca)}</strong>${insta}${c.produto ? `<br><span class="muted">${esc(c.produto)}</span>` : ""}</td>
        <td data-rotulo="Tipo"><span class="chip">${esc(TIPOS[c.tipo] || c.tipo)}</span></td>
        <td data-rotulo="Status">
          <select class="abord-status" data-id="${esc(c.id)}" aria-label="Status de ${esc(c.marca)}">
            ${STATUS.map((s) => `<option value="${s.v}" ${s.v === c.status ? "selected" : ""}>${s.t}</option>`).join("")}
          </select>
        </td>
        <td data-rotulo="Último envio">${esc(dataBr(c.ultimo_envio))} <span class="muted">(${quando}${fus})</span></td>
        <td data-rotulo="Follow-up">${fu}</td>
        <td class="leads-acoes">
          ${p ? `<button class="btn btn-sm ${vencido(c) ? "btn-primario" : ""}" data-acao="followup" data-id="${esc(c.id)}">${icone("envio", 14)} ${p.encerrar && vencido(c) ? "Último toque" : "Follow-up"}</button>` : ""}
          <button class="btn btn-sm" data-acao="editar-marca" data-id="${esc(c.id)}" aria-label="Editar ${esc(c.marca)}">${icone("lapis", 14)}</button>
        </td>
      </tr>`;
  }

  // ---------- MODELOS ----------
  function secaoModelos(tipo, titulo, descricao) {
    const lista = modelos.filter((m) => m.tipo === tipo).sort((a, b) => (a.ordem - b.ordem) || String(a.created_at).localeCompare(String(b.created_at)));
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
          <button class="btn btn-sm btn-primario" data-acao="usar" data-id="${esc(m.id)}">${icone("envio", 14)} Usar</button>
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
    if (!b) return;
    const a = b.dataset.acao;
    if (a === "perfil") { perfil = b.dataset.v; gravarLocal(CHAVE_PERFIL, perfil); return render(el, aba); }
    if (a === "aba") { location.hash = `#abordagens/${b.dataset.v}`; return; }
    if (a === "filtro") { filtro = b.dataset.v; return desenhar(); }
    if (a === "nova-marca") return formMarca({});
    if (a === "editar-marca") return formMarca(contatos.find((c) => c.id === b.dataset.id) || {});
    if (a === "followup") { const c = contatos.find((x) => x.id === b.dataset.id); if (c) janelaFollowup(c); return; }
    if (a === "novo-modelo") return formModelo({ tipo: b.dataset.tipo });
    if (a === "editar-modelo") return formModelo(modelos.find((m) => m.id === b.dataset.id) || {});
    if (a === "usar") { const m = modelos.find((x) => x.id === b.dataset.id); if (m) janelaUsar(m); }
  }

  // status mudou direto na tabela
  async function aoMudar(e) {
    const s = e.target.closest(".abord-status");
    if (!s) return;
    const c = contatos.find((x) => x.id === s.dataset.id);
    if (!c) return;
    const mudou = { ...c, status: s.value };
    if (statusDe(s.value).ativo) { mudou.ultimo_envio = hoje(); mudou.followups = 0; }
    const r = await Dados.salvarAbord("abord_contatos", limparContato(mudou));
    if (r.erro) return toast(r.erro, "erro");
    Object.assign(c, r.row);
    toast(`${c.marca}: ${statusDe(c.status).t}.`, "ok");
    desenhar();
  }

  const limparContato = (c) => ({
    id: c.id, perfil, marca: c.marca, instagram: c.instagram || "", produto: c.produto || "",
    tipo: c.tipo || "fria", status: c.status || "enviado", contato: c.contato || "",
    primeiro_envio: c.primeiro_envio || hoje(), ultimo_envio: c.ultimo_envio || hoje(),
    followups: c.followups || 0, notas: c.notas || "",
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
  function formMarca(c, aoSalvar) {
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
          <label class="campo"><span class="rotulo">Tipo</span>
            <select name="tipo">${["fria", "quente", "plataforma"].map((t) => `<option value="${t}" ${(c.tipo || "fria") === t ? "selected" : ""}>${TIPOS[t]}</option>`).join("")}</select></label>
          <label class="campo"><span class="rotulo">Status</span>
            <select name="status">${STATUS.map((s) => `<option value="${s.v}" ${(c.status || "enviado") === s.v ? "selected" : ""}>${s.t}</option>`).join("")}</select></label>
        </div>
        <div class="linha-2">
          <label class="campo"><span class="rotulo">Primeira mensagem</span>
            <input type="date" name="primeiro_envio" value="${esc(c.primeiro_envio || hoje())}"></label>
          <label class="campo"><span class="rotulo">Última mensagem</span>
            <input type="date" name="ultimo_envio" value="${esc(c.ultimo_envio || hoje())}"></label>
        </div>
        <label class="campo"><span class="rotulo">Contato do time (opcional)</span>
          <input type="text" name="contato" maxlength="120" value="${esc(c.contato || "")}" placeholder="Nome ou e-mail de quem te atendeu"></label>
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
        const r = await Dados.salvarAbord("abord_contatos", limparContato({
          ...c, marca, instagram: f.instagram.value.trim().replace(/^@/, ""), produto: f.produto.value.trim(),
          tipo: f.tipo.value, status: f.status.value, contato: f.contato.value.trim(),
          primeiro_envio: f.primeiro_envio.value, ultimo_envio: f.ultimo_envio.value, notas: f.notas.value.trim(),
        }));
        if (r.erro) return toast(r.erro, "erro");
        const i = contatos.findIndex((x) => x.id === r.row.id);
        if (i >= 0) contatos[i] = r.row; else contatos.push(r.row);
        toast(`${marca} salva no controle.`, "ok");
        fechar();
        if (aba !== "controle") { location.hash = "#abordagens/controle"; return; }
        filtro = vencido(r.row) ? "pendentes" : "andamento";
        desenhar();
        aoSalvar?.(r.row);
      });
    });
  }

  // ---------- criar / editar modelo ----------
  function formModelo(m) {
    const novo = !m.id;
    const tipo = m.tipo || "fria";
    abrirJanela(`
      <form class="modal modal-largo">
        ${cabJanela(novo ? `Novo modelo: ${TIPOS[tipo]}` : "Editar modelo")}
        <div class="linha-2">
          <label class="campo"><span class="rotulo">Nome do modelo</span>
            <input type="text" name="titulo" required maxlength="80" value="${esc(m.titulo || "")}" placeholder="Ex: 1ª mensagem"></label>
          <label class="campo"><span class="rotulo">Tipo</span>
            <select name="tipo">${Object.entries(TIPOS).map(([v, t]) => `<option value="${v}" ${tipo === v ? "selected" : ""}>${t}</option>`).join("")}</select></label>
        </div>
        <label class="campo" data-so-followup ${tipo === "followup" ? "" : "hidden"}><span class="rotulo">Quando usar</span>
          <select name="situacao">${SITUACOES.map((s) => `<option value="${s.v}" ${(m.situacao || "sem_resposta_1") === s.v ? "selected" : ""}>${s.t}</option>`).join("")}</select></label>
        <label class="campo"><span class="rotulo">Texto <span class="abord-contador" data-contador></span></span>
          <textarea name="texto" rows="10" required placeholder="Oi, {marca}! ...">${esc(m.texto || "")}</textarea></label>
        <p class="muted abord-dica">Escreva entre chaves o que muda a cada marca: {marca}, {produto}, {ideia}... Na hora de usar, o painel pede pra você preencher.</p>
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
      const campos = camposDe(getTexto());
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

  function janelaUsar(m) {
    const limite = () => (m.tipo === "plataforma" ? LIMITE_PLATAFORMA : LIMITE_DM);
    const podeRegistrar = ["fria", "quente", "plataforma"].includes(m.tipo);
    abrirJanela(`
      <div class="modal modal-largo">
        ${cabJanela(m.titulo)}
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
        fechar();
        formMarca({
          marca: p.valores.marca || "", produto: p.valores.produto || "",
          tipo: m.tipo === "plataforma" ? "plataforma" : m.tipo, status: "enviado",
          primeiro_envio: hoje(), ultimo_envio: hoje(),
        });
      });
    });
  }

  function janelaFollowup(c) {
    const fus = modelos.filter((m) => m.tipo === "followup");
    const sugerida = situacaoSugerida(c);
    let escolhido = fus.find((m) => m.situacao === sugerida) || fus[0];
    const p0 = proximo(c);
    abrirJanela(`
      <div class="modal modal-largo">
        ${cabJanela(`Follow-up: ${c.marca}`)}
        <p class="muted" style="margin-top:-6px">${esc(statusDe(c.status).t)}. Última mensagem em ${esc(dataBr(c.ultimo_envio))}${c.followups ? `, ${c.followups} follow-up${c.followups > 1 ? "s" : ""} já enviado${c.followups > 1 ? "s" : ""}` : ""}.
          ${p0?.encerrar ? " Este é o último toque. Se não responder, marque como sem retorno." : ""}</p>
        ${fus.length ? `
          <label class="campo"><span class="rotulo">Mensagem</span>
            <select data-modelo>${fus.map((m) => `<option value="${esc(m.id)}" ${m === escolhido ? "selected" : ""}>${esc(m.titulo)}${m.situacao === sugerida ? " (sugerida)" : ""}</option>`).join("")}</select></label>
          <div class="abord-campos" data-campos></div>
          <div class="abord-previa-cab"><span class="rotulo">Como vai ficar</span><span class="abord-contador" data-contador></span></div>
          <div class="abord-previa" data-previa></div>` : `
          <p class="alerta alerta-atencao">Você ainda não tem modelos de follow-up neste perfil. Crie na aba Follow-ups.</p>`}
        <div class="modal-acoes">
          ${p0?.encerrar ? `<button type="button" class="btn" data-encerrar>Marcar sem retorno</button>` : ""}
          <span style="flex:1"></span>
          ${fus.length ? `<button type="button" class="btn" data-copiar>${icone("clipe", 15)} Copiar</button>` : ""}
          <button type="button" class="btn btn-primario" data-enviado>Enviei o follow-up</button>
        </div>
      </div>`, (fundo, fechar) => {
      let p = null;
      if (fus.length) {
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
      fundo.querySelector("[data-enviado]").addEventListener("click", () => {
        p?.lembrar();
        salvar({ followups: (c.followups || 0) + 1, ultimo_envio: hoje(), status: c.status === "a_enviar" ? "enviado" : c.status },
          `Follow-up de ${c.marca} registrado.`);
      });
      fundo.querySelector("[data-encerrar]")?.addEventListener("click", () =>
        salvar({ status: "sem_retorno" }, `${c.marca} foi pra encerradas.`));
    });
  }

  // Quantos follow-ups vencem hoje (usado na tela de Início)
  async function pendentesHoje() {
    const lista = (await Promise.all(PERFIS.map((p) => Dados.listarAbord("abord_contatos", p.v)))).flat();
    return lista.filter(vencido).length;
  }

  return { render, pendentesHoje };
})();
