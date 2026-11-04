// =====================================================================
// ideias.js: 💡 Banco de ideias.
//   - Campo rápido: escreve a ideia, escolhe a etiqueta e Enter
//   - Filtros por etiqueta e favoritas, busca
//   - "Virar conteúdo": manda a ideia pro Calendário
//   - "Lembrete": cria uma tarefa com data
// Tabela: ideias (no teste local, no navegador).
// =====================================================================
window.Ideias = (() => {
  const { esc, toast } = App;

  const ETIQUETAS = {
    conteudo: { e: "💜", t: "Conteúdo" },
    gancho: { e: "🪝", t: "Gancho" },
    negocio: { e: "💼", t: "Negócio" },
    colab: { e: "🤝", t: "Colab" },
  };
  const FORMATOS = [["reels", "Reels"], ["carrossel", "Carrossel"], ["post", "Post"], ["story", "Story"], ["live", "Live"], ["outro", "Outro"]];
  const CHAVE_ETIQ = "painel_ideia_etiqueta";

  let el = null;
  let ideias = [];
  let filtro = "todas";
  let busca = "";

  const pad = (n) => String(n).padStart(2, "0");
  const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const hoje = () => iso(new Date());
  const quando = (s) => {
    const d = Math.round((Date.now() - new Date(s).getTime()) / 864e5);
    return d <= 0 ? "hoje" : d === 1 ? "ontem" : d < 30 ? `há ${d} dias` : new Date(s).toLocaleDateString("pt-BR");
  };
  const etiquetaPadrao = () => { try { return localStorage.getItem(CHAVE_ETIQ) || "conteudo"; } catch { return "conteudo"; } };

  async function render(alvo) {
    el = alvo;
    el.onclick = aoClicar;
    el.innerHTML = `<div class="cabecalho"><div><h1>💡 Banco de ideias</h1></div></div><div class="card"><p class="muted">Carregando...</p></div>`;
    const lista = await Dados.listar("ideias");
    if (lista === null) { el.innerHTML = `<p class="alerta alerta-erro">Não consegui carregar as ideias. Confira se o 14_gestao_e_ideias.sql foi rodado e recarregue a página.</p>`; return; }
    ideias = lista.sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
    desenhar(true);
  }

  function filtradas() {
    const b = busca.trim().toLowerCase();
    return ideias.filter((i) =>
      (filtro === "todas" || (filtro === "favoritas" ? i.favorita : i.etiqueta === filtro)) &&
      (!b || i.texto.toLowerCase().includes(b)));
  }

  function desenhar(focar) {
    const lista = filtradas();
    const etiq = etiquetaPadrao();
    const conta = (f) => (f === "todas" ? ideias.length : f === "favoritas" ? ideias.filter((i) => i.favorita).length : ideias.filter((i) => i.etiqueta === f).length);
    const chip = (v, t) => `<button class="ideia-filtro ${filtro === v ? "ativo" : ""}" data-acao="filtro" data-v="${v}">${t} <b>${conta(v)}</b></button>`;

    el.innerHTML = `
      <div class="cabecalho"><div><h1>💡 Banco de ideias</h1><p class="muted">Solta a ideia aqui pra não perder nenhuma. Organiza depois.</p></div></div>
      ${Dados.usaSupabase() ? "" : `<p class="alerta alerta-atencao">Modo de teste local: fica salvo só neste navegador.</p>`}
      <form class="card ideia-nova" data-nova>
        <div class="ideia-etiquetas" role="group" aria-label="Etiqueta da ideia">
          ${Object.entries(ETIQUETAS).map(([v, x]) => `<button type="button" class="ideia-etiq ${etiq === v ? "ativo" : ""}" data-etiq="${v}">${x.e} ${x.t}</button>`).join("")}
        </div>
        <div class="ideia-campo">
          <textarea name="texto" rows="2" maxlength="1000" placeholder="✨ Solta uma ideia aqui... (ex: trend do áudio novo pra skincare)" aria-label="Nova ideia"></textarea>
          <button class="btn btn-primario" type="submit">Guardar 💡</button>
        </div>
        <span class="muted abord-dica">Enter guarda · Shift + Enter pula linha</span>
      </form>
      <div class="ideia-barra">
        <div class="ideia-filtros">
          ${chip("todas", "Todas")}${chip("favoritas", "⭐ Favoritas")}
          ${Object.entries(ETIQUETAS).map(([v, x]) => chip(v, `${x.e} ${x.t}`)).join("")}
        </div>
        <input type="search" class="ideia-busca" data-busca placeholder="🔍 Buscar" value="${esc(busca)}" aria-label="Buscar ideias">
      </div>
      ${lista.length ? `<div class="ideias-grade">${lista.map(cartao).join("")}</div>` : `
        <div class="card vazio"><div class="vazio-emoji">💭</div><h2>${ideias.length ? "Nenhuma ideia nesse filtro" : "Sua primeira ideia mora aqui"}</h2>
          <p>${ideias.length ? "Tente outro filtro ou busca." : "Viu uma trend, pensou num gancho, lembrou de uma marca? Escreve aí em cima e toca em Guardar."}</p></div>`}`;

    const f = el.querySelector("[data-nova]");
    const txt = f.texto;
    txt.addEventListener("keydown", (ev) => { if (ev.key === "Enter" && !ev.shiftKey) { ev.preventDefault(); f.requestSubmit(); } });
    f.addEventListener("submit", async (ev) => {
      ev.preventDefault();
      const texto = txt.value.trim();
      if (!texto) return txt.focus();
      const r = await Dados.salvar("ideias", { texto, etiqueta: etiquetaPadrao(), favorita: false });
      if (r.erro) return toast(r.erro, "erro");
      ideias.unshift(r.row);
      toast("💡 Ideia guardada!", "ok");
      desenhar(true);
    });
    el.querySelector("[data-busca]").addEventListener("input", (ev) => {
      busca = ev.target.value;
      const pos = ev.target.selectionStart;
      desenhar(false);
      const novo = el.querySelector("[data-busca]");
      novo.focus(); novo.setSelectionRange(pos, pos);
    });
    if (focar) txt.focus();
  }

  function cartao(i) {
    const x = ETIQUETAS[i.etiqueta] || ETIQUETAS.conteudo;
    return `
      <article class="card ideia-card ideia-${esc(i.etiqueta)}">
        <div class="ideia-topo">
          <span class="ideia-tag">${x.e} ${x.t}</span>
          <span class="muted ideia-quando">${esc(quando(i.created_at))}</span>
        </div>
        <p class="ideia-texto">${esc(i.texto)}</p>
        ${i.post_id ? `<a class="ideia-virou" href="#calendario">📅 Já está no calendário</a>` : ""}
        <div class="ideia-acoes">
          ${i.post_id ? "" : `<button class="btn btn-sm" data-acao="conteudo" data-id="${esc(i.id)}">📅 Virar conteúdo</button>`}
          <button class="btn btn-sm" data-acao="lembrete" data-id="${esc(i.id)}">🔔 Lembrete</button>
          <span style="flex:1"></span>
          <button class="btn-icone ${i.favorita ? "favorita" : ""}" data-acao="favorita" data-id="${esc(i.id)}" aria-label="${i.favorita ? "Tirar dos favoritos" : "Favoritar"}" title="Favoritar">${i.favorita ? "⭐" : "☆"}</button>
          <button class="btn-icone" data-acao="editar" data-id="${esc(i.id)}" aria-label="Editar ideia" title="Editar">✏️</button>
          <button class="btn-icone" data-acao="apagar" data-id="${esc(i.id)}" aria-label="Apagar ideia" title="Apagar">🗑️</button>
        </div>
      </article>`;
  }

  // ---------- janela ----------
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
  const resumo = (t, n = 60) => { const s = String(t).replace(/\s+/g, " ").trim(); return s.length > n ? s.slice(0, n - 1) + "…" : s; };

  async function aoClicar(e) {
    const etq = e.target.closest("[data-etiq]");
    if (etq) {
      try { localStorage.setItem(CHAVE_ETIQ, etq.dataset.etiq); } catch { /* nada */ }
      el.querySelectorAll("[data-etiq]").forEach((b) => b.classList.toggle("ativo", b === etq));
      el.querySelector("[data-nova] textarea").focus();
      return;
    }
    const b = e.target.closest("[data-acao]");
    if (!b) return;
    const a = b.dataset.acao;
    if (a === "filtro") { filtro = b.dataset.v; return desenhar(false); }
    const i = ideias.find((x) => x.id === b.dataset.id);
    if (!i) return;

    if (a === "favorita") {
      const r = await Dados.salvar("ideias", { ...i, favorita: !i.favorita });
      if (r.erro) return toast(r.erro, "erro");
      Object.assign(i, r.row);
      return desenhar(false);
    }
    if (a === "apagar") {
      if (!confirm("Apagar essa ideia?")) return;
      const r = await Dados.apagar("ideias", i.id);
      if (r.erro) return toast(r.erro, "erro");
      ideias = ideias.filter((x) => x.id !== i.id);
      toast("Ideia apagada.", "ok");
      return desenhar(false);
    }
    if (a === "editar") {
      return abrirJanela(`
        <form class="modal">
          ${cab("✏️ Editar ideia")}
          <label class="campo"><span class="rotulo">Ideia</span><textarea name="texto" rows="5" maxlength="1000" required>${esc(i.texto)}</textarea></label>
          <label class="campo"><span class="rotulo">Etiqueta</span><select name="etiqueta">${Object.entries(ETIQUETAS).map(([v, x]) => `<option value="${v}" ${i.etiqueta === v ? "selected" : ""}>${x.e} ${x.t}</option>`).join("")}</select></label>
          <div class="modal-acoes"><span style="flex:1"></span><button type="button" class="btn" data-fechar>Cancelar</button><button type="submit" class="btn btn-primario">Salvar</button></div>
        </form>`, (fundo, fechar) => {
        const f = fundo.querySelector("form");
        f.texto.focus();
        f.addEventListener("submit", async (ev) => {
          ev.preventDefault();
          const r = await Dados.salvar("ideias", { ...i, texto: f.texto.value.trim(), etiqueta: f.etiqueta.value });
          if (r.erro) return toast(r.erro, "erro");
          Object.assign(i, r.row);
          fechar(); desenhar(false);
        });
      });
    }
    if (a === "conteudo") {
      return abrirJanela(`
        <form class="modal">
          ${cab("📅 Virar conteúdo")}
          <p class="muted" style="margin-top:-6px">Vai pro Calendário como "Ideia". A ideia completa fica nas notas.</p>
          <label class="campo"><span class="rotulo">Título do conteúdo</span><input type="text" name="titulo" maxlength="140" required value="${esc(resumo(i.texto))}"></label>
          <div class="linha-2">
            <label class="campo"><span class="rotulo">Data</span><input type="date" name="data" required value="${hoje()}"></label>
            <label class="campo"><span class="rotulo">Formato</span><select name="formato">${FORMATOS.map(([v, t]) => `<option value="${v}">${t}</option>`).join("")}</select></label>
          </div>
          <div class="modal-acoes"><span style="flex:1"></span><button type="button" class="btn" data-fechar>Cancelar</button><button type="submit" class="btn btn-primario">📅 Mandar pro calendário</button></div>
        </form>`, (fundo, fechar) => {
        const f = fundo.querySelector("form");
        f.titulo.focus();
        f.addEventListener("submit", async (ev) => {
          ev.preventDefault();
          const r = await Dados.salvarPost({ titulo: f.titulo.value.trim(), data: f.data.value, formato: f.formato.value, status: "ideia", link: "", notas: i.texto });
          if (r.erro) return toast(r.erro, "erro");
          const r2 = await Dados.salvar("ideias", { ...i, post_id: r.row.id });
          if (!r2.erro) Object.assign(i, r2.row);
          toast("📅 Foi pro calendário!", "ok");
          fechar(); desenhar(false);
        });
      });
    }
    if (a === "lembrete") {
      const amanha = new Date(); amanha.setDate(amanha.getDate() + 1);
      return abrirJanela(`
        <form class="modal">
          ${cab("🔔 Lembrete")}
          <p class="muted" style="margin-top:-6px">Vira uma tarefa com data, e aparece no Início no dia.</p>
          <label class="campo"><span class="rotulo">Me lembrar de</span><input type="text" name="titulo" maxlength="140" required value="💡 ${esc(resumo(i.texto, 80))}"></label>
          <label class="campo"><span class="rotulo">Quando</span><input type="date" name="prazo" required value="${iso(amanha)}"></label>
          <div class="modal-acoes"><span style="flex:1"></span><button type="button" class="btn" data-fechar>Cancelar</button><button type="submit" class="btn btn-primario">🔔 Criar lembrete</button></div>
        </form>`, (fundo, fechar) => {
        const f = fundo.querySelector("form");
        f.addEventListener("submit", async (ev) => {
          ev.preventDefault();
          const r = await Dados.salvar("ges_tarefas", { titulo: f.titulo.value.trim(), prazo: f.prazo.value, prioridade: "media", feita: false, notas: i.texto });
          if (r.erro) return toast(r.erro, "erro");
          toast("🔔 Lembrete criado nas Tarefas.", "ok");
          fechar();
        });
      });
    }
  }

  async function contar() {
    const l = await Dados.listar("ideias");
    return (l || []).length;
  }

  return { render, contar };
})();
