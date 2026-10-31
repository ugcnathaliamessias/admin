// =====================================================================
// calendario.js: Calendário de conteúdo.
//   - Visão do mês (no celular vira uma lista por dia)
//   - Cada conteúdo tem data, título, formato, status, link e notas
//   - Salvo na tabela cal_posts (no teste local, só neste navegador)
// =====================================================================
window.Calendario = (() => {
  const { esc, icone, toast } = App;

  const STATUS = [
    { v: "ideia", t: "Ideia" },
    { v: "roteiro", t: "Roteiro" },
    { v: "gravando", t: "Gravando" },
    { v: "editando", t: "Editando" },
    { v: "agendado", t: "Agendado" },
    { v: "publicado", t: "Publicado" },
  ];
  const FORMATOS = [
    { v: "reels", t: "Reels" },
    { v: "carrossel", t: "Carrossel" },
    { v: "post", t: "Post" },
    { v: "story", t: "Story" },
    { v: "live", t: "Live" },
    { v: "outro", t: "Outro" },
  ];
  const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
  const DIAS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

  const nomeStatus = (v) => STATUS.find((s) => s.v === v)?.t || v;
  const nomeFormato = (v) => FORMATOS.find((f) => f.v === v)?.t || v;
  const pad = (n) => String(n).padStart(2, "0");
  const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const hojeIso = () => iso(new Date());
  const dataBr = (s) => { const [a, m, d] = s.split("-"); return `${d}/${m}/${a}`; };

  let el = null;
  let mes = new Date(); mes.setDate(1);   // mês mostrado
  let posts = [];

  async function render(alvo) {
    el = alvo;
    el.onclick = aoClicar;
    await carregar();
  }

  async function carregar() {
    const ini = new Date(mes.getFullYear(), mes.getMonth(), 1);
    const fim = new Date(mes.getFullYear(), mes.getMonth() + 1, 0);
    el.innerHTML = cabecalho() + `<div class="card"><p class="muted">Carregando...</p></div>`;
    posts = await Dados.listarPosts(iso(ini), iso(fim));
    desenhar(ini, fim);
  }

  function cabecalho() {
    return `
      <div class="cabecalho">
        <div>
          <h1>Calendário</h1>
          <p class="muted">Planeje seus conteúdos do mês e acompanhe cada um até publicar.</p>
        </div>
        <button class="btn btn-primario" data-acao="novo">${icone("mais", 16)} Novo conteúdo</button>
      </div>`;
  }

  function desenhar(ini, fim) {
    const vazios = (ini.getDay() + 6) % 7; // semana começa na segunda
    const porDia = {};
    for (const p of posts) (porDia[p.data] = porDia[p.data] || []).push(p);
    const hoje = hojeIso();

    const resumo = STATUS.map((s) => {
      const n = posts.filter((p) => p.status === s.v).length;
      return `<span class="cal-resumo-item"><span class="cal-ponto st-${s.v}"></span>${s.t}: <b>${n}</b></span>`;
    }).join("");

    let celulas = "";
    for (let i = 0; i < vazios; i++) celulas += `<div class="cal-dia cal-fora"></div>`;
    for (let d = 1; d <= fim.getDate(); d++) {
      const dia = iso(new Date(mes.getFullYear(), mes.getMonth(), d));
      const itens = (porDia[dia] || []).map(chip).join("");
      celulas += `
        <div class="cal-dia ${dia === hoje ? "cal-hoje" : ""}" data-acao="dia" data-dia="${dia}" title="Clique pra adicionar um conteúdo">
          <span class="cal-num">${d}</span>
          <div class="cal-itens">${itens}</div>
        </div>`;
    }

    const lista = Object.keys(porDia).sort().map((dia) => `
      <div class="cal-lista-dia">
        <div class="cal-lista-data ${dia === hoje ? "cal-hoje-txt" : ""}">${dataBr(dia)}</div>
        ${porDia[dia].map(chip).join("")}
      </div>`).join("");

    el.innerHTML = cabecalho() + `
      ${Dados.usaSupabase() ? "" : `<p class="alerta alerta-atencao">Modo de teste local: o calendário fica salvo só neste navegador.</p>`}
      <div class="card cal-card">
        <div class="cal-topo">
          <div class="cal-nav">
            <button class="btn-icone" data-acao="anterior" aria-label="Mês anterior">‹</button>
            <h2 class="cal-titulo">${MESES[mes.getMonth()]} ${mes.getFullYear()}</h2>
            <button class="btn-icone" data-acao="proximo" aria-label="Próximo mês">›</button>
          </div>
          <button class="btn btn-sm" data-acao="hoje">Hoje</button>
        </div>
        <div class="cal-resumo">${resumo}</div>
        <div class="cal-grade">
          ${DIAS.map((d) => `<div class="cal-semana">${d}</div>`).join("")}
          ${celulas}
        </div>
        <div class="cal-lista">
          ${lista || `<p class="muted">Nenhum conteúdo neste mês. Toque em "Novo conteúdo" pra começar.</p>`}
        </div>
      </div>`;
  }

  function chip(p) {
    return `<button type="button" class="cal-chip st-${esc(p.status)}" data-acao="editar" data-id="${esc(p.id)}" title="${esc(nomeStatus(p.status))}: ${esc(p.titulo)}">
      <span class="cal-formato">${esc(nomeFormato(p.formato))}</span>${esc(p.titulo)}
    </button>`;
  }

  async function aoClicar(e) {
    const b = e.target.closest("[data-acao]");
    if (!b) return;
    const a = b.dataset.acao;
    if (a === "anterior") { mes = new Date(mes.getFullYear(), mes.getMonth() - 1, 1); return carregar(); }
    if (a === "proximo") { mes = new Date(mes.getFullYear(), mes.getMonth() + 1, 1); return carregar(); }
    if (a === "hoje") { mes = new Date(); mes.setDate(1); return carregar(); }
    if (a === "novo") return abrirForm({ data: hojeIso() });
    if (a === "editar") { e.stopPropagation(); const p = posts.find((x) => x.id === b.dataset.id); if (p) abrirForm(p); return; }
    if (a === "dia") return abrirForm({ data: b.dataset.dia });
  }

  // ---------- formulário (janela) ----------
  function abrirForm(p) {
    const novo = !p.id;
    const fundo = document.createElement("div");
    fundo.className = "modal-fundo";
    fundo.innerHTML = `
      <form class="modal" role="dialog" aria-modal="true" aria-labelledby="cal-form-titulo">
        <div class="modal-cab">
          <h2 id="cal-form-titulo">${novo ? "Novo conteúdo" : "Editar conteúdo"}</h2>
          <button type="button" class="btn-icone" data-fechar aria-label="Fechar">${icone("x", 18)}</button>
        </div>
        <label class="campo"><span class="rotulo">Título</span>
          <input type="text" name="titulo" required maxlength="140" value="${esc(p.titulo || "")}" placeholder="Ex: Bastidores da campanha do café"></label>
        <div class="linha-2">
          <label class="campo"><span class="rotulo">Data</span>
            <input type="date" name="data" required value="${esc(p.data || hojeIso())}"></label>
          <label class="campo"><span class="rotulo">Formato</span>
            <select name="formato">${FORMATOS.map((f) => `<option value="${f.v}" ${p.formato === f.v ? "selected" : ""}>${f.t}</option>`).join("")}</select></label>
        </div>
        <label class="campo"><span class="rotulo">Status</span>
          <select name="status">${STATUS.map((s) => `<option value="${s.v}" ${(p.status || "ideia") === s.v ? "selected" : ""}>${s.t}</option>`).join("")}</select></label>
        <label class="campo"><span class="rotulo">Link (opcional)</span>
          <input type="url" name="link" value="${esc(p.link || "")}" placeholder="https://..."></label>
        <label class="campo"><span class="rotulo">Notas (opcional)</span>
          <textarea name="notas" placeholder="Roteiro, legenda, ideias...">${esc(p.notas || "")}</textarea></label>
        <div class="modal-acoes">
          ${novo ? "" : `<button type="button" class="btn btn-perigo" data-apagar>${icone("lixo", 15)} Apagar</button>`}
          <span style="flex:1"></span>
          <button type="button" class="btn" data-fechar>Cancelar</button>
          <button type="submit" class="btn btn-primario">Salvar</button>
        </div>
      </form>`;
    document.body.appendChild(fundo);
    const form = fundo.querySelector("form");
    form.titulo.focus();

    const fechar = () => { fundo.remove(); document.removeEventListener("keydown", esc_); };
    const esc_ = (ev) => { if (ev.key === "Escape") fechar(); };
    document.addEventListener("keydown", esc_);
    fundo.addEventListener("click", (ev) => { if (ev.target === fundo || ev.target.closest("[data-fechar]")) fechar(); });

    fundo.querySelector("[data-apagar]")?.addEventListener("click", async () => {
      if (!confirm(`Apagar "${p.titulo}"?`)) return;
      const r = await Dados.apagarPost(p.id);
      if (r.erro) return toast(r.erro, "erro");
      toast("Conteúdo apagado.", "ok");
      fechar();
      carregar();
    });

    form.addEventListener("submit", async (ev) => {
      ev.preventDefault();
      const titulo = form.titulo.value.trim();
      if (!titulo) { form.titulo.focus(); return; }
      const link = form.link.value.trim();
      if (link && !/^https?:\/\//i.test(link)) { toast("O link precisa começar com https://", "erro"); return; }
      const r = await Dados.salvarPost({
        id: p.id, titulo, data: form.data.value, formato: form.formato.value,
        status: form.status.value, link, notas: form.notas.value.trim(),
      });
      if (r.erro) return toast(r.erro, "erro");
      toast(r.local ? "Salvo neste navegador (modo de teste)." : "Conteúdo salvo.", r.local ? "aviso" : "ok");
      fechar();
      // pula pro mês do conteúdo salvo
      const [a, m] = form.data.value.split("-").map(Number);
      mes = new Date(a, m - 1, 1);
      carregar();
    });
  }

  return { render };
})();
