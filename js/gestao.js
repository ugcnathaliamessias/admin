// =====================================================================
// gestao.js: grupo "Gestão" do menu.
//   ✅ Tarefas   (tabela ges_tarefas)
//   🎯 Metas     (tabela ges_metas; algumas contam sozinhas)
//   💳 Financeiro (tabela fin_lancamentos)
// =====================================================================
window.Gestao = (() => {
  const { esc, toast, num } = App;

  // ---------- datas e dinheiro ----------
  const pad = (n) => String(n).padStart(2, "0");
  const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const hoje = () => iso(new Date());
  const dataBr = (s) => { if (!s) return ""; const [a, m, d] = String(s).split("-"); return `${d}/${m}${a !== String(new Date().getFullYear()) ? "/" + a.slice(2) : ""}`; };
  const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
  const reais = (v) => Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  // aceita "1.500,50", "1500.5", "R$ 1500"
  function lerValor(t) {
    let s = String(t || "").replace(/[^\d,.-]/g, "");
    if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
    const n = Number(s);
    return Number.isFinite(n) ? Math.round(n * 100) / 100 : NaN;
  }
  const mesAtual = () => { const d = new Date(); return { ini: iso(new Date(d.getFullYear(), d.getMonth(), 1)), fim: iso(new Date(d.getFullYear(), d.getMonth() + 1, 0)) }; };

  // ---------- janela (modal) ----------
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
  const rodape = (apagar) => `<div class="modal-acoes">${apagar ? `<button type="button" class="btn btn-perigo" data-apagar>🗑️ Apagar</button>` : ""}<span style="flex:1"></span><button type="button" class="btn" data-fechar>Cancelar</button><button type="submit" class="btn btn-primario">Salvar</button></div>`;
  const avisoLocal = () => (Dados.usaSupabase() ? "" : `<p class="alerta alerta-atencao">Modo de teste local: fica salvo só neste navegador.</p>`);
  const erroLeitura = (tela) => `<p class="alerta alerta-erro">Não consegui carregar ${tela}. Confira se o 14_gestao_e_ideias.sql foi rodado e recarregue a página.</p>`;

  // =================================================================
  // ✅ TAREFAS
  // =================================================================
  const PRIORIDADES = { alta: { e: "🔴", t: "Alta" }, media: { e: "🟡", t: "Média" }, baixa: { e: "🟢", t: "Baixa" } };
  const pesoPri = { alta: 0, media: 1, baixa: 2 };
  // cores dos blocos da agenda (f = fundo, t = texto)
  const CORES = [
    { v: "rosa", n: "Rosa", f: "#F9B9C4", t: "#5C0016" },
    { v: "coral", n: "Coral", f: "#F2877F", t: "#FFFFFF" },
    { v: "verde", n: "Verde", f: "#4E6B5B", t: "#FFFFFF" },
    { v: "salvia", n: "Sálvia", f: "#7C9885", t: "#FFFFFF" },
    { v: "esmeralda", n: "Esmeralda", f: "#22896A", t: "#FFFFFF" },
    { v: "laranja", n: "Laranja", f: "#F6A85A", t: "#4A2200" },
    { v: "azul", n: "Azul", f: "#A6C9DD", t: "#123447" },
    { v: "bordo", n: "Bordô", f: "#860120", t: "#FFFFFF" },
  ];
  const corDe = (t) => CORES.find((c) => c.v === t.cor) || CORES[0];
  const DIAS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
  const PX_HORA = 52; // altura de 1 hora na agenda
  const CHAVE_VISAO = "painel_tar_visao";
  const minutos = (h) => { const m = String(h || "").match(/^(\d{1,2}):(\d{2})/); return m ? Number(m[1]) * 60 + Number(m[2]) : null; };
  const hhmm = (min) => `${pad(Math.floor(min / 60) % 24)}:${pad(min % 60)}`;
  const horario = (t) => {
    const s = minutos(t.hora_inicio);
    if (s == null) return "";
    const e = minutos(t.hora_fim);
    return e != null && e > s ? `${hhmm(s)}–${hhmm(e)}` : hhmm(s);
  };
  function segundaDe(d) {
    const x = new Date(d); x.setHours(0, 0, 0, 0);
    x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
    return x;
  }
  const somaDias = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };

  let tarefas = [];
  let visao = "semana";
  let semanaIni = segundaDe(new Date());

  async function telaTarefas(el) {
    el.innerHTML = `<div class="cabecalho"><div><h1>✅ Tarefas</h1><p class="muted">O que precisa ser feito, na ordem certa.</p></div></div><div class="card"><p class="muted">Carregando...</p></div>`;
    const [lista, follow] = await Promise.all([Dados.listar("ges_tarefas"), Abordagens.pendentesHoje().catch(() => 0)]);
    if (lista === null) { el.innerHTML = erroLeitura("as tarefas"); return; }
    tarefas = lista;
    try { visao = localStorage.getItem(CHAVE_VISAO) === "lista" ? "lista" : "semana"; } catch { visao = "semana"; }
    semanaIni = segundaDe(new Date());
    el.onclick = (e) => cliqueTarefas(e, el, follow);
    desenharTarefas(el, follow);
  }

  function desenharTarefas(el, follow) {
    const abas = `
      <div class="abas abas-sub" role="tablist">
        <button class="aba ${visao === "semana" ? "ativa" : ""}" data-visao="semana" role="tab">🗓️ Semana</button>
        <button class="aba ${visao === "lista" ? "ativa" : ""}" data-visao="lista" role="tab">📋 Lista</button>
      </div>`;
    el.innerHTML = `
      <div class="cabecalho"><div><h1>✅ Tarefas</h1><p class="muted">Sua semana por horário, coloridinha 🌷</p></div></div>
      ${avisoLocal()}
      ${follow ? `<a class="card faixa-aviso" href="#abordagens/controle">📨 Você tem <b>${follow} follow-up${follow > 1 ? "s" : ""}</b> pra mandar hoje nas marcas <span>Abrir →</span></a>` : ""}
      ${abas}
      ${visao === "semana" ? htmlSemana() : htmlLista()}`;

    // no celular a semana rola pro lado: já mostra o dia de hoje
    const rolagem = el.querySelector(".sem-rolagem");
    const colHoje = el.querySelector(".sem-dia-cab.hoje");
    if (rolagem && colHoje && rolagem.scrollWidth > rolagem.clientWidth) {
      rolagem.scrollLeft = Math.max(0, colHoje.offsetLeft - 54 - 8);
    }

    el.querySelector("[data-nova]")?.addEventListener("submit", async (ev) => {
      ev.preventDefault();
      const f = ev.target;
      const titulo = f.titulo.value.trim();
      if (!titulo) return;
      const r = await Dados.salvar("ges_tarefas", { titulo, prazo: f.prazo.value || null, prioridade: f.prioridade.value, feita: false, hora_inicio: "", hora_fim: "", cor: "" });
      if (r.erro) return toast(r.erro, "erro");
      tarefas.push(r.row);
      toast("📝 Tarefa adicionada.", "ok");
      desenharTarefas(el, follow);
      el.querySelector('[data-nova] [name="titulo"]').focus();
    });
  }

  // ---------- 🗓️ visão da semana ----------
  // coloca lado a lado as tarefas que acontecem ao mesmo tempo
  function posicionar(evs) {
    evs.sort((a, b) => a.s - b.s || b.e - a.e);
    let grupo = [], faixas = [], fimGrupo = -1;
    const fechar = () => { grupo.forEach((g) => { g.n = faixas.length; }); grupo = []; faixas = []; };
    for (const ev of evs) {
      if (grupo.length && ev.s >= fimGrupo) fechar();
      let i = faixas.findIndex((fim) => fim <= ev.s);
      if (i < 0) { i = faixas.length; faixas.push(ev.e); } else faixas[i] = ev.e;
      ev.faixa = i;
      fimGrupo = grupo.length ? Math.max(fimGrupo, ev.e) : ev.e;
      grupo.push(ev);
    }
    if (grupo.length) fechar();
    return evs;
  }

  function htmlSemana() {
    const h = hoje();
    const dias = DIAS.map((_, i) => iso(somaDias(semanaIni, i)));
    const daSemana = tarefas.filter((t) => t.prazo && t.prazo >= dias[0] && t.prazo <= dias[6]);
    const comHora = daSemana.filter((t) => minutos(t.hora_inicio) != null).map((t) => {
      const s = minutos(t.hora_inicio);
      let e = minutos(t.hora_fim);
      if (e == null || e <= s) e = s + 60;
      return { t, s, e: Math.min(e, 24 * 60) };
    });
    // horário visível: 7h às 22h, cresce se tiver tarefa fora disso
    let hIni = 7, hFim = 22;
    comHora.forEach((ev) => { hIni = Math.min(hIni, Math.floor(ev.s / 60)); hFim = Math.max(hFim, Math.ceil(ev.e / 60)); });
    const altura = (hFim - hIni) * PX_HORA;
    const semHora = (d) => daSemana.filter((t) => t.prazo === d && minutos(t.hora_inicio) == null);
    const fimSemana = somaDias(semanaIni, 6);
    const titulo = `${pad(semanaIni.getDate())}/${pad(semanaIni.getMonth() + 1)} a ${pad(fimSemana.getDate())}/${pad(fimSemana.getMonth() + 1)}`;
    const ehEstaSemana = iso(semanaIni) === iso(segundaDe(new Date()));
    const semData = tarefas.filter((t) => !t.feita && !t.prazo).length;

    const bloco = (ev) => {
      const c = corDe(ev.t);
      const top = ((ev.s - hIni * 60) / 60) * PX_HORA;
      const alt = Math.max(((ev.e - ev.s) / 60) * PX_HORA - 3, 24);
      const larg = 100 / ev.n;
      return `<button type="button" class="sem-bloco ${ev.t.feita ? "feita" : ""}" data-acao="editar" data-id="${esc(ev.t.id)}"
        style="top:${top}px;height:${alt}px;left:calc(${ev.faixa * larg}% + 2px);width:calc(${larg}% - 4px);background:${c.f};color:${c.t}"
        title="${esc(ev.t.titulo)} · ${esc(horario(ev.t))}">
        <span class="sem-bloco-titulo">${ev.t.feita ? "✓ " : ""}${esc(ev.t.titulo)}</span>
        ${alt >= 40 ? `<span class="sem-bloco-hora">${esc(horario(ev.t))}</span>` : ""}
      </button>`;
    };

    return `
      <div class="sem-topo">
        <div class="sem-nav">
          <button class="btn-icone" data-semana="-1" aria-label="Semana anterior">‹</button>
          <strong class="sem-titulo">Semana de ${titulo}</strong>
          <button class="btn-icone" data-semana="1" aria-label="Próxima semana">›</button>
          ${ehEstaSemana ? "" : `<button class="btn btn-sm" data-semana="0">Hoje</button>`}
        </div>
        <button class="btn btn-primario" data-acao="nova" data-dia="${esc(dias.includes(h) ? h : dias[0])}">＋ Nova tarefa</button>
      </div>
      <p class="muted sem-dica">Toque num horário vazio pra criar uma tarefa ali. Toque numa tarefa pra editar, mudar a cor ou concluir.</p>
      <div class="card sem-rolagem">
        <div class="sem-grade" style="--px-hora:${PX_HORA}px">
          <div class="sem-canto"></div>
          ${dias.map((d, i) => `<div class="sem-dia-cab ${d === h ? "hoje" : ""}"><span>${DIAS[i]}</span><b>${Number(d.slice(8))}</b></div>`).join("")}
          <div class="sem-rotulo-todo">Dia todo</div>
          ${dias.map((d) => `<div class="sem-todo" data-dia="${d}">${semHora(d).map((t) => {
            const c = corDe(t);
            return `<button type="button" class="sem-chip ${t.feita ? "feita" : ""}" data-acao="editar" data-id="${esc(t.id)}" style="background:${c.f};color:${c.t}">${t.feita ? "✓ " : ""}${esc(t.titulo)}</button>`;
          }).join("")}</div>`).join("")}
          <div class="sem-horas" style="height:${altura}px">
            ${Array.from({ length: hFim - hIni }, (_, i) => `<span style="top:${i * PX_HORA}px">${pad(hIni + i)}:00</span>`).join("")}
          </div>
          ${dias.map((d, i) => `<div class="sem-coluna ${d === h ? "hoje" : i % 2 ? "" : "par"}" data-dia="${d}" data-h-ini="${hIni}" style="height:${altura}px">
            ${posicionar(comHora.filter((ev) => ev.t.prazo === d)).map(bloco).join("")}
          </div>`).join("")}
        </div>
      </div>
      ${semData ? `<p class="muted sem-dica">🗂️ ${semData} tarefa${semData > 1 ? "s" : ""} sem data: veja na aba <button class="link-btn" data-visao="lista">Lista</button>.</p>` : ""}`;
  }

  // ---------- 📋 visão em lista ----------
  function htmlLista() {
    const h = hoje();
    const abertas = tarefas.filter((t) => !t.feita).sort((a, b) => (pesoPri[a.prioridade] - pesoPri[b.prioridade]) || String(a.prazo || "9").localeCompare(String(b.prazo || "9")) || String(a.hora_inicio || "99").localeCompare(String(b.hora_inicio || "99")));
    const grupos = [
      { t: "⏰ Atrasadas", l: abertas.filter((t) => t.prazo && t.prazo < h), cls: "tar-grupo-atraso" },
      { t: "☀️ Hoje", l: abertas.filter((t) => t.prazo === h).sort((a, b) => String(a.hora_inicio || "99").localeCompare(String(b.hora_inicio || "99"))) },
      { t: "📆 Próximas", l: abertas.filter((t) => t.prazo && t.prazo > h).sort((a, b) => a.prazo.localeCompare(b.prazo) || String(a.hora_inicio || "99").localeCompare(String(b.hora_inicio || "99"))) },
      { t: "🗂️ Sem data", l: abertas.filter((t) => !t.prazo) },
    ];
    const feitas = tarefas.filter((t) => t.feita).sort((a, b) => String(b.feita_em).localeCompare(String(a.feita_em)));
    return `
      <form class="card tar-nova" data-nova>
        <input type="text" name="titulo" maxlength="140" placeholder="✍️ Nova tarefa... (ex: gravar o vídeo da Felps)" aria-label="Nova tarefa" required>
        <input type="date" name="prazo" aria-label="Prazo">
        <select name="prioridade" aria-label="Prioridade">${Object.entries(PRIORIDADES).map(([v, p]) => `<option value="${v}" ${v === "media" ? "selected" : ""}>${p.e} ${p.t}</option>`).join("")}</select>
        <button class="btn btn-primario" type="submit">＋ Adicionar</button>
      </form>
      ${abertas.length ? grupos.filter((g) => g.l.length).map((g) => `
        <section class="tar-grupo ${g.cls || ""}">
          <h2 class="tar-grupo-titulo">${g.t} <span class="muted">${g.l.length}</span></h2>
          <div class="card tar-lista">${g.l.map(linhaTarefa).join("")}</div>
        </section>`).join("") : `
        <div class="card vazio"><div class="vazio-emoji">🎉</div><h2>Tudo em dia!</h2><p>Nenhuma tarefa aberta. Escreva a próxima no campo acima.</p></div>`}
      ${feitas.length ? `
        <details class="tar-feitas"><summary>✔️ Concluídas (${feitas.length})</summary>
          <div class="card tar-lista">${feitas.slice(0, 30).map(linhaTarefa).join("")}</div>
        </details>` : ""}`;
  }

  function linhaTarefa(t) {
    const p = PRIORIDADES[t.prioridade] || PRIORIDADES.media;
    const atrasada = !t.feita && t.prazo && t.prazo < hoje();
    const hora = horario(t);
    return `
      <div class="tar-item ${t.feita ? "feita" : ""}">
        <button class="tar-check" data-acao="alternar" data-id="${esc(t.id)}" aria-label="${t.feita ? "Desmarcar" : "Concluir"}: ${esc(t.titulo)}">${t.feita ? "✓" : ""}</button>
        <span class="tar-cor" style="background:${corDe(t).f}" aria-hidden="true"></span>
        <span class="tar-pri" title="Prioridade ${p.t}">${p.e}</span>
        <span class="tar-titulo">${esc(t.titulo)}${t.notas ? `<span class="tar-notas">${esc(t.notas)}</span>` : ""}</span>
        ${t.prazo ? `<span class="tar-prazo ${atrasada ? "atrasada" : ""}">📅 ${esc(dataBr(t.prazo))}${hora ? ` · ${esc(hora)}` : ""}</span>` : ""}
        <button class="btn-icone" data-acao="editar" data-id="${esc(t.id)}" aria-label="Editar ${esc(t.titulo)}">✏️</button>
      </div>`;
  }

  // ---------- janela de criar / editar ----------
  function janelaTarefa(t, el, follow) {
    const novo = !t.id;
    const corAtual = corDe(t).v;
    abrirJanela(`
      <form class="modal">
        ${cab(novo ? "📝 Nova tarefa" : "✏️ Editar tarefa")}
        <label class="campo"><span class="rotulo">Tarefa</span><input type="text" name="titulo" maxlength="140" required value="${esc(t.titulo || "")}" placeholder="Ex: gravar vídeos do camping"></label>
        <div class="linha-3">
          <label class="campo"><span class="rotulo">Dia</span><input type="date" name="prazo" value="${esc(t.prazo || "")}"></label>
          <label class="campo"><span class="rotulo">Das</span><input type="time" name="hora_inicio" step="900" value="${esc(t.hora_inicio || "")}"></label>
          <label class="campo"><span class="rotulo">Até</span><input type="time" name="hora_fim" step="900" value="${esc(t.hora_fim || "")}"></label>
        </div>
        <p class="muted abord-dica">Sem horário, a tarefa aparece em "Dia todo".</p>
        <div class="campo"><span class="rotulo">Cor</span>
          <div class="tar-cores" role="radiogroup" aria-label="Cor">
            ${CORES.map((c) => `<label class="tar-cor-op" title="${c.n}"><input type="radio" name="cor" value="${c.v}" ${c.v === corAtual ? "checked" : ""}><span style="background:${c.f}"></span><b class="sr">${c.n}</b></label>`).join("")}
          </div>
        </div>
        <div class="linha-2">
          <label class="campo"><span class="rotulo">Prioridade</span><select name="prioridade">${Object.entries(PRIORIDADES).map(([v, p]) => `<option value="${v}" ${(t.prioridade || "media") === v ? "selected" : ""}>${p.e} ${p.t}</option>`).join("")}</select></label>
          ${novo ? "" : `<label class="campo tar-feita-op"><input type="checkbox" name="feita" ${t.feita ? "checked" : ""}> Concluída ✓</label>`}
        </div>
        <label class="campo"><span class="rotulo">Notas (opcional)</span><textarea name="notas">${esc(t.notas || "")}</textarea></label>
        ${rodape(!novo)}
      </form>`, (fundo, fechar) => {
      const f = fundo.querySelector("form");
      if (novo) f.titulo.focus();
      // ao escolher o início, sugere 1 hora de duração
      f.hora_inicio.addEventListener("change", () => {
        const s = minutos(f.hora_inicio.value), e = minutos(f.hora_fim.value);
        if (s != null && (e == null || e <= s)) f.hora_fim.value = hhmm(Math.min(s + 60, 23 * 60 + 45));
      });
      fundo.querySelector("[data-apagar]")?.addEventListener("click", async () => {
        if (!confirm(`Apagar "${t.titulo}"?`)) return;
        const r = await Dados.apagar("ges_tarefas", t.id);
        if (r.erro) return toast(r.erro, "erro");
        tarefas = tarefas.filter((x) => x.id !== t.id);
        fechar(); desenharTarefas(el, follow);
      });
      f.addEventListener("submit", async (ev) => {
        ev.preventDefault();
        const titulo = f.titulo.value.trim();
        if (!titulo) return;
        let ini = f.hora_inicio.value || "", fim = f.hora_fim.value || "";
        if (!ini) fim = "";
        if (ini && fim && minutos(fim) <= minutos(ini)) return toast("O horário de fim precisa ser depois do início.", "erro");
        const feita = novo ? false : f.feita.checked;
        const acabouDeConcluir = feita && !t.feita;
        const r = await Dados.salvar("ges_tarefas", {
          ...t, titulo, prazo: f.prazo.value || null, hora_inicio: ini, hora_fim: fim,
          cor: f.cor.value || "", prioridade: f.prioridade.value, notas: f.notas.value.trim(),
          feita, feita_em: feita ? (t.feita_em || new Date().toISOString()) : null,
        });
        if (r.erro) return toast(r.erro, "erro");
        if (novo) tarefas.push(r.row); else Object.assign(t, r.row);
        toast(novo ? "📝 Tarefa criada." : (acabouDeConcluir ? "🎉 Tarefa concluída!" : "Tarefa salva."), "ok");
        fechar(); desenharTarefas(el, follow);
      });
    });
  }

  async function cliqueTarefas(e, el, follow) {
    // trocar entre semana e lista
    const v = e.target.closest("[data-visao]");
    if (v) {
      visao = v.dataset.visao;
      try { localStorage.setItem(CHAVE_VISAO, visao); } catch { /* nada */ }
      return desenharTarefas(el, follow);
    }
    // navegar entre semanas
    const s = e.target.closest("[data-semana]");
    if (s) {
      const n = Number(s.dataset.semana);
      semanaIni = n === 0 ? segundaDe(new Date()) : somaDias(semanaIni, 7 * n);
      return desenharTarefas(el, follow);
    }
    const b = e.target.closest("[data-acao]");
    if (b?.dataset.acao === "nova") return janelaTarefa({ prazo: b.dataset.dia || hoje(), prioridade: "media" }, el, follow);
    // clique num horário vazio da agenda
    if (!b) {
      const col = e.target.closest(".sem-coluna");
      if (col && e.target === col) {
        const hIni = Number(col.dataset.hIni) || 0;
        const y = e.clientY - col.getBoundingClientRect().top;
        const ini = Math.max(0, Math.min(23 * 60, hIni * 60 + Math.floor(y / (PX_HORA / 2)) * 30));
        return janelaTarefa({ prazo: col.dataset.dia, hora_inicio: hhmm(ini), hora_fim: hhmm(Math.min(ini + 60, 23 * 60 + 45)), prioridade: "media" }, el, follow);
      }
      const todo = e.target.closest(".sem-todo");
      if (todo && e.target === todo) return janelaTarefa({ prazo: todo.dataset.dia, prioridade: "media" }, el, follow);
      return;
    }
    const t = tarefas.find((x) => x.id === b.dataset.id);
    if (!t) return;
    if (b.dataset.acao === "alternar") {
      const feita = !t.feita;
      const r = await Dados.salvar("ges_tarefas", { ...t, feita, feita_em: feita ? new Date().toISOString() : null });
      if (r.erro) return toast(r.erro, "erro");
      Object.assign(t, r.row);
      if (feita) toast("🎉 Tarefa concluída!", "ok");
      return desenharTarefas(el, follow);
    }
    if (b.dataset.acao === "editar") return janelaTarefa(t, el, follow);
  }

  // =================================================================
  // 🎯 METAS
  // =================================================================
  const TIPOS_META = {
    manual: { t: "Eu atualizo", d: "Você mesma soma o progresso com os botões" },
    abordagens_mes: { t: "📨 Abordagens no mês", d: "Conta sozinha as marcas que você abordou este mês" },
    faturamento_mes: { t: "💸 Faturamento no mês", d: "Soma sozinha o que entrou como recebido no Financeiro este mês" },
    posts_mes: { t: "🎬 Conteúdos publicados no mês", d: "Conta sozinha os conteúdos marcados como publicado no Calendário este mês" },
  };
  const EMOJIS_META = ["🎯", "💰", "📨", "🎬", "📈", "⭐", "🤝", "🏆", "💪", "🚀"];
  let metas = [];
  let autos = {};

  async function calcularAutomaticas() {
    const { ini, fim } = mesAtual();
    const [cn, cv, fin, posts] = await Promise.all([
      Dados.listarAbord("abord_contatos", "nathalia"),
      Dados.listarAbord("abord_contatos", "vaiterestrada"),
      Dados.listar("fin_lancamentos"),
      Dados.listarPosts(ini, fim),
    ]);
    const contatos = [...(cn || []), ...(cv || [])];
    return {
      abordagens_mes: contatos.filter((c) => c.status !== "a_enviar" && c.primeiro_envio >= ini && c.primeiro_envio <= fim).length,
      faturamento_mes: (fin || []).filter((l) => l.tipo === "entrada" && l.status === "recebido" && l.data >= ini && l.data <= fim).reduce((s, l) => s + Number(l.valor || 0), 0),
      posts_mes: (posts || []).filter((p) => p.status === "publicado").length,
    };
  }
  const progressoDe = (m) => (m.tipo === "manual" ? Number(m.atual || 0) : Number(autos[m.tipo] || 0));
  const fmtMeta = (m, v) => (m.tipo === "faturamento_mes" ? reais(v) : num(v));

  async function telaMetas(el) {
    el.innerHTML = `<div class="cabecalho"><div><h1>🎯 Metas</h1></div></div><div class="card"><p class="muted">Carregando...</p></div>`;
    const [lista, a] = await Promise.all([Dados.listar("ges_metas"), calcularAutomaticas()]);
    if (lista === null) { el.innerHTML = erroLeitura("as metas"); return; }
    metas = lista; autos = a;
    el.onclick = (e) => cliqueMetas(e, el);
    desenharMetas(el);
  }

  function desenharMetas(el) {
    const ativas = metas.filter((m) => !m.concluida);
    const conquistas = metas.filter((m) => m.concluida);
    el.innerHTML = `
      <div class="cabecalho">
        <div><h1>🎯 Metas</h1><p class="muted">Onde você quer chegar. As metas automáticas contam sozinhas com os dados do painel.</p></div>
        <button class="btn btn-primario" data-acao="nova">＋ Nova meta</button>
      </div>
      ${avisoLocal()}
      ${ativas.length ? `<div class="metas-grade">${ativas.map(cartaoMeta).join("")}</div>` : `
        <div class="card vazio"><div class="vazio-emoji">🎯</div><h2>Qual é a sua próxima meta?</h2>
          <p>Por exemplo: "Mandar 100 abordagens no mês", "Fechar a 1ª campanha paga" ou "Faturar R$ 2.000".</p>
          <button class="btn btn-primario" data-acao="nova">＋ Criar meta</button></div>`}
      ${conquistas.length ? `<h2 class="secao-titulo">🏆 Conquistadas</h2><div class="metas-grade">${conquistas.map(cartaoMeta).join("")}</div>` : ""}`;
  }

  function cartaoMeta(m) {
    const atual = progressoDe(m);
    const alvo = Number(m.alvo || 1);
    const pct = Math.max(0, Math.min(100, Math.round((atual / alvo) * 100)));
    const batida = atual >= alvo;
    const dias = m.prazo ? Math.round((new Date(m.prazo + "T00:00") - new Date(hoje() + "T00:00")) / 864e5) : null;
    return `
      <article class="card meta-card ${batida ? "batida" : ""} ${m.concluida ? "concluida" : ""}">
        <div class="meta-topo">
          <span class="meta-emoji" aria-hidden="true">${esc(m.emoji || "🎯")}</span>
          <div class="meta-info">
            <h3>${esc(m.titulo)}</h3>
            <span class="muted">${m.tipo === "manual" ? "" : `🔄 ${esc(TIPOS_META[m.tipo]?.t || "")}`}${dias !== null && !m.concluida ? ` ${m.tipo === "manual" ? "" : "· "}${dias < 0 ? "⌛ prazo passou" : dias === 0 ? "⏳ vence hoje" : `⏳ faltam ${dias} dia${dias > 1 ? "s" : ""}`}` : ""}</span>
          </div>
          <button class="btn-icone" data-acao="editar" data-id="${esc(m.id)}" aria-label="Editar meta">✏️</button>
        </div>
        <div class="meta-barra" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"><span style="width:${pct}%"></span></div>
        <div class="meta-numeros"><b>${fmtMeta(m, atual)}</b> <span class="muted">de ${fmtMeta(m, alvo)} · ${pct}%</span></div>
        ${m.concluida ? `<p class="meta-ok">🏆 Conquistada!</p>` : `
          <div class="meta-acoes">
            ${m.tipo === "manual" ? `<button class="btn btn-sm" data-acao="menos" data-id="${esc(m.id)}" aria-label="Diminuir">−1</button><button class="btn btn-sm" data-acao="mais" data-id="${esc(m.id)}" aria-label="Aumentar">＋1</button>` : ""}
            <span style="flex:1"></span>
            ${batida ? `<button class="btn btn-sm btn-primario" data-acao="concluir" data-id="${esc(m.id)}">🎉 Marcar como conquistada</button>` : ""}
          </div>`}
      </article>`;
  }

  async function cliqueMetas(e, el) {
    const b = e.target.closest("[data-acao]");
    if (!b) return;
    const a = b.dataset.acao;
    if (a === "nova") return formMeta(el, {});
    const m = metas.find((x) => x.id === b.dataset.id);
    if (!m) return;
    if (a === "editar") return formMeta(el, m);
    if (a === "mais" || a === "menos") {
      const atual = Math.max(0, Number(m.atual || 0) + (a === "mais" ? 1 : -1));
      const r = await Dados.salvar("ges_metas", { ...m, atual });
      if (r.erro) return toast(r.erro, "erro");
      Object.assign(m, r.row);
      if (a === "mais" && atual === Number(m.alvo)) toast("🎉 Meta batida! Que orgulho!", "ok");
      return desenharMetas(el);
    }
    if (a === "concluir") {
      const r = await Dados.salvar("ges_metas", { ...m, concluida: true });
      if (r.erro) return toast(r.erro, "erro");
      Object.assign(m, r.row);
      toast("🏆 Conquista guardada!", "ok");
      return desenharMetas(el);
    }
  }

  function formMeta(el, m) {
    const nova = !m.id;
    const tipo = m.tipo || "manual";
    abrirJanela(`
      <form class="modal">
        ${cab(nova ? "🎯 Nova meta" : "✏️ Editar meta")}
        <div class="campo"><span class="rotulo">Emoji</span>
          <div class="meta-emojis">${EMOJIS_META.map((x) => `<button type="button" class="meta-emoji-op ${(m.emoji || "🎯") === x ? "ativo" : ""}" data-emoji="${x}">${x}</button>`).join("")}</div>
          <input type="hidden" name="emoji" value="${esc(m.emoji || "🎯")}"></div>
        <label class="campo"><span class="rotulo">Meta</span><input type="text" name="titulo" maxlength="100" required value="${esc(m.titulo || "")}" placeholder="Ex: Mandar 100 abordagens no mês"></label>
        <label class="campo"><span class="rotulo">Como conta o progresso</span>
          <select name="tipo">${Object.entries(TIPOS_META).map(([v, t]) => `<option value="${v}" ${tipo === v ? "selected" : ""}>${t.t}</option>`).join("")}</select>
          <span class="muted abord-dica" data-tipo-desc>${esc(TIPOS_META[tipo].d)}</span></label>
        <div class="linha-2">
          <label class="campo"><span class="rotulo">Quanto quer chegar</span><input type="text" inputmode="decimal" name="alvo" required value="${m.alvo != null ? String(m.alvo).replace(".", ",") : ""}" placeholder="Ex: 100"></label>
          <label class="campo"><span class="rotulo">Prazo (opcional)</span><input type="date" name="prazo" value="${esc(m.prazo || "")}"></label>
        </div>
        <label class="campo" data-so-manual ${tipo === "manual" ? "" : "hidden"}><span class="rotulo">Quanto já fez</span><input type="text" inputmode="decimal" name="atual" value="${m.atual != null ? String(m.atual).replace(".", ",") : "0"}"></label>
        ${rodape(!nova)}
      </form>`, (fundo, fechar) => {
      const f = fundo.querySelector("form");
      f.titulo.focus();
      fundo.querySelectorAll("[data-emoji]").forEach((x) => x.addEventListener("click", () => {
        f.emoji.value = x.dataset.emoji;
        fundo.querySelectorAll("[data-emoji]").forEach((y) => y.classList.toggle("ativo", y === x));
      }));
      f.tipo.addEventListener("change", () => {
        fundo.querySelector("[data-tipo-desc]").textContent = TIPOS_META[f.tipo.value].d;
        fundo.querySelector("[data-so-manual]").hidden = f.tipo.value !== "manual";
      });
      fundo.querySelector("[data-apagar]")?.addEventListener("click", async () => {
        if (!confirm(`Apagar a meta "${m.titulo}"?`)) return;
        const r = await Dados.apagar("ges_metas", m.id);
        if (r.erro) return toast(r.erro, "erro");
        metas = metas.filter((x) => x.id !== m.id);
        fechar(); desenharMetas(el);
      });
      f.addEventListener("submit", async (ev) => {
        ev.preventDefault();
        const alvo = lerValor(f.alvo.value), atual = lerValor(f.atual.value || "0");
        if (!(alvo > 0)) return toast("Coloque quanto você quer chegar (um número maior que zero).", "erro");
        const r = await Dados.salvar("ges_metas", {
          ...m, titulo: f.titulo.value.trim(), emoji: f.emoji.value, tipo: f.tipo.value, alvo,
          atual: Number.isFinite(atual) ? atual : 0, prazo: f.prazo.value || null, concluida: !!m.concluida,
        });
        if (r.erro) return toast(r.erro, "erro");
        const i = metas.findIndex((x) => x.id === r.row.id);
        if (i >= 0) metas[i] = r.row; else metas.push(r.row);
        toast(nova ? "🎯 Meta criada. Bora!" : "Meta salva.", "ok");
        fechar(); desenharMetas(el);
      });
    });
  }

  // =================================================================
  // 💳 FINANCEIRO
  // =================================================================
  const FONTES = {
    ugc: { e: "🎬", t: "UGC" },
    publi: { e: "📢", t: "Publicidade" },
    afiliacao: { e: "🔗", t: "Afiliação" },
    produto: { e: "💻", t: "Produtos digitais" },
    outro: { e: "✨", t: "Outros" },
  };
  let lancs = [];
  let mesFin = new Date(); mesFin.setDate(1);

  async function telaFinanceiro(el) {
    el.innerHTML = `<div class="cabecalho"><div><h1>💳 Financeiro</h1></div></div><div class="card"><p class="muted">Carregando...</p></div>`;
    const lista = await Dados.listar("fin_lancamentos");
    if (lista === null) { el.innerHTML = erroLeitura("o financeiro"); return; }
    lancs = lista;
    el.onclick = (e) => cliqueFin(e, el);
    desenharFin(el);
  }

  function desenharFin(el) {
    const ini = iso(new Date(mesFin.getFullYear(), mesFin.getMonth(), 1));
    const fim = iso(new Date(mesFin.getFullYear(), mesFin.getMonth() + 1, 0));
    const ano = String(mesFin.getFullYear());
    const doMes = lancs.filter((l) => l.data >= ini && l.data <= fim).sort((a, b) => a.data.localeCompare(b.data));
    const soma = (arr) => arr.reduce((s, l) => s + Number(l.valor || 0), 0);
    const recebido = soma(doMes.filter((l) => l.tipo === "entrada" && l.status === "recebido"));
    const pago = soma(doMes.filter((l) => l.tipo === "saida" && l.status === "pago"));
    const pendentes = lancs.filter((l) => l.tipo === "entrada" && l.status === "a_receber");
    const atrasados = pendentes.filter((l) => l.data < hoje());
    const fontes = Object.entries(FONTES).map(([k, f]) => {
      const doAno = lancs.filter((l) => l.tipo === "entrada" && l.fonte === k && String(l.data).startsWith(ano));
      return { k, ...f, total: soma(doAno.filter((l) => l.status === "recebido")), qtd: doAno.length };
    });

    el.innerHTML = `
      <div class="cabecalho">
        <div><h1>💳 Financeiro</h1><p class="muted">O que entrou, o que falta receber e de onde vem o seu dinheiro.</p></div>
        <div class="fin-botoes">
          <button class="btn" data-acao="nova-saida">➖ Saída</button>
          <button class="btn btn-primario" data-acao="nova-entrada">＋ Entrada</button>
        </div>
      </div>
      ${avisoLocal()}
      ${atrasados.length ? `<div class="card faixa-aviso faixa-atraso">⏰ <b>${atrasados.length}</b> pagamento${atrasados.length > 1 ? "s" : ""} atrasado${atrasados.length > 1 ? "s" : ""}, somando <b>${reais(soma(atrasados))}</b>. Vale cobrar a marca!</div>` : ""}
      <div class="fin-mes">
        <button class="btn-icone" data-acao="mes-ant" aria-label="Mês anterior">‹</button>
        <h2>${MESES[mesFin.getMonth()]} ${mesFin.getFullYear()}</h2>
        <button class="btn-icone" data-acao="mes-prox" aria-label="Próximo mês">›</button>
      </div>
      <div class="fin-kpis">
        <div class="card kpi"><span class="rotulo">💸 Recebido no mês</span><div class="kpi-valor fin-verde">${reais(recebido)}</div></div>
        <div class="card kpi"><span class="rotulo">⏳ A receber (total)</span><div class="kpi-valor">${reais(soma(pendentes))}</div><div class="kpi-sub">${pendentes.length} pagamento${pendentes.length === 1 ? "" : "s"}</div></div>
        <div class="card kpi"><span class="rotulo">🧾 Gastos no mês</span><div class="kpi-valor">${reais(pago)}</div></div>
        <div class="card kpi"><span class="rotulo">💰 Saldo do mês</span><div class="kpi-valor ${recebido - pago < 0 ? "fin-vermelho" : "fin-verde"}">${reais(recebido - pago)}</div></div>
      </div>
      <h2 class="secao-titulo">Suas fontes de renda em ${ano}</h2>
      <div class="fin-fontes">${fontes.map((f) => `
        <div class="card fin-fonte">
          <span class="fin-fonte-emoji">${f.e}</span>
          <strong>${f.t}</strong>
          <span class="muted">${f.qtd} trabalho${f.qtd === 1 ? "" : "s"} · ${reais(f.total)} recebido</span>
        </div>`).join("")}</div>
      <h2 class="secao-titulo">Lançamentos de ${MESES[mesFin.getMonth()].toLowerCase()}</h2>
      ${doMes.length ? `<div class="card fin-lista">${doMes.map(linhaFin).join("")}</div>` : `
        <div class="card vazio"><div class="vazio-emoji">🪙</div><h2>Nada lançado neste mês</h2><p>Quando fechar um trabalho, lance como entrada "a receber". Quando o dinheiro cair, toque em "Recebi".</p></div>`}`;
  }

  function linhaFin(l) {
    const entrada = l.tipo === "entrada";
    const f = FONTES[l.fonte] || FONTES.outro;
    const pend = l.status === "a_receber" || l.status === "a_pagar";
    const atrasado = pend && l.data < hoje();
    return `
      <div class="fin-item">
        <span class="fin-item-emoji">${entrada ? f.e : "🧾"}</span>
        <div class="fin-item-info">
          <strong>${esc(l.descricao)}</strong>
          <span class="muted">${l.marca ? esc(l.marca) + " · " : ""}${entrada ? f.t + " · " : ""}${pend ? (atrasado ? "⏰ venceu " : "vence ") : ""}${esc(dataBr(l.data))}</span>
        </div>
        <span class="fin-chip ${pend ? (atrasado ? "atrasado" : "pendente") : "ok"}">${pend ? (entrada ? "⏳ A receber" : "⏳ A pagar") : entrada ? "✅ Recebido" : "✅ Pago"}</span>
        <span class="fin-valor ${entrada ? "fin-verde" : "fin-vermelho"}">${entrada ? "+" : "−"} ${reais(l.valor)}</span>
        <div class="fin-item-acoes">
          ${pend ? `<button class="btn btn-sm" data-acao="quitar" data-id="${esc(l.id)}">${entrada ? "💸 Recebi" : "✔️ Paguei"}</button>` : ""}
          <button class="btn-icone" data-acao="editar" data-id="${esc(l.id)}" aria-label="Editar lançamento">✏️</button>
        </div>
      </div>`;
  }

  async function cliqueFin(e, el) {
    const b = e.target.closest("[data-acao]");
    if (!b) return;
    const a = b.dataset.acao;
    if (a === "mes-ant") { mesFin = new Date(mesFin.getFullYear(), mesFin.getMonth() - 1, 1); return desenharFin(el); }
    if (a === "mes-prox") { mesFin = new Date(mesFin.getFullYear(), mesFin.getMonth() + 1, 1); return desenharFin(el); }
    if (a === "nova-entrada") return formFin(el, { tipo: "entrada" });
    if (a === "nova-saida") return formFin(el, { tipo: "saida" });
    const l = lancs.find((x) => x.id === b.dataset.id);
    if (!l) return;
    if (a === "editar") return formFin(el, l);
    if (a === "quitar") {
      const entrada = l.tipo === "entrada";
      const r = await Dados.salvar("fin_lancamentos", { ...l, status: entrada ? "recebido" : "pago", data: hoje() });
      if (r.erro) return toast(r.erro, "erro");
      Object.assign(l, r.row);
      toast(entrada ? `💸 Oba! ${reais(l.valor)} recebido.` : "✔️ Pagamento registrado.", "ok");
      return desenharFin(el);
    }
  }

  function formFin(el, l) {
    const nova = !l.id;
    const entrada = l.tipo !== "saida";
    const status = l.status || (entrada ? "a_receber" : "pago");
    abrirJanela(`
      <form class="modal">
        ${cab(nova ? (entrada ? "＋ Nova entrada" : "➖ Nova saída") : "✏️ Editar lançamento")}
        <label class="campo"><span class="rotulo">Descrição</span><input type="text" name="descricao" maxlength="120" required value="${esc(l.descricao || "")}" placeholder="${entrada ? "Ex: 2 vídeos UGC linha Azeite de Abacate" : "Ex: Ring light"}"></label>
        <div class="linha-2">
          <label class="campo"><span class="rotulo">Valor (R$)</span><input type="text" inputmode="decimal" name="valor" required value="${l.valor != null ? String(l.valor).replace(".", ",") : ""}" placeholder="Ex: 450,00"></label>
          <label class="campo"><span class="rotulo">${entrada ? "Marca / cliente" : "Onde"}</span><input type="text" name="marca" maxlength="80" value="${esc(l.marca || "")}" placeholder="${entrada ? "Ex: Felps" : "Ex: Shopee"}"></label>
        </div>
        ${entrada ? `<label class="campo"><span class="rotulo">Fonte de renda</span><select name="fonte">${Object.entries(FONTES).map(([v, f]) => `<option value="${v}" ${(l.fonte || "ugc") === v ? "selected" : ""}>${f.e} ${f.t}</option>`).join("")}</select></label>` : ""}
        <div class="linha-2">
          <label class="campo"><span class="rotulo">Situação</span><select name="status">${(entrada ? [["a_receber", "⏳ A receber"], ["recebido", "✅ Já recebi"]] : [["pago", "✅ Já paguei"], ["a_pagar", "⏳ A pagar"]]).map(([v, t]) => `<option value="${v}" ${status === v ? "selected" : ""}>${t}</option>`).join("")}</select></label>
          <label class="campo"><span class="rotulo" data-rot-data>${status.startsWith("a_") ? "Vence em" : "Data"}</span><input type="date" name="data" required value="${esc(l.data || hoje())}"></label>
        </div>
        <label class="campo"><span class="rotulo">Notas (opcional)</span><textarea name="notas" placeholder="Ex: 50% na aprovação do roteiro">${esc(l.notas || "")}</textarea></label>
        ${rodape(!nova)}
      </form>`, (fundo, fechar) => {
      const f = fundo.querySelector("form");
      f.descricao.focus();
      f.status.addEventListener("change", () => { fundo.querySelector("[data-rot-data]").textContent = f.status.value.startsWith("a_") ? "Vence em" : "Data"; });
      fundo.querySelector("[data-apagar]")?.addEventListener("click", async () => {
        if (!confirm(`Apagar "${l.descricao}"?`)) return;
        const r = await Dados.apagar("fin_lancamentos", l.id);
        if (r.erro) return toast(r.erro, "erro");
        lancs = lancs.filter((x) => x.id !== l.id);
        fechar(); desenharFin(el);
      });
      f.addEventListener("submit", async (ev) => {
        ev.preventDefault();
        const valor = lerValor(f.valor.value);
        if (!(valor > 0)) return toast("Coloque o valor (ex: 450,00).", "erro");
        const r = await Dados.salvar("fin_lancamentos", {
          ...l, tipo: entrada ? "entrada" : "saida", fonte: entrada ? f.fonte.value : "outro",
          descricao: f.descricao.value.trim(), marca: f.marca.value.trim(), valor, status: f.status.value, data: f.data.value, notas: f.notas.value.trim(),
        });
        if (r.erro) return toast(r.erro, "erro");
        const i = lancs.findIndex((x) => x.id === r.row.id);
        if (i >= 0) lancs[i] = r.row; else lancs.push(r.row);
        const [a, m] = r.row.data.split("-").map(Number);
        mesFin = new Date(a, m - 1, 1);
        toast(entrada && r.row.status === "recebido" ? `💸 ${reais(valor)} na conta!` : "Lançamento salvo.", "ok");
        fechar(); desenharFin(el);
      });
    });
  }

  // =================================================================
  // Resumo pra tela de Início
  // =================================================================
  async function resumo() {
    const { ini, fim } = mesAtual();
    const [ts, fin, ms, a] = await Promise.all([Dados.listar("ges_tarefas"), Dados.listar("fin_lancamentos"), Dados.listar("ges_metas"), calcularAutomaticas()]);
    autos = a;
    const h = hoje();
    return {
      tarefasHoje: (ts || []).filter((t) => !t.feita && t.prazo && t.prazo <= h).length,
      recebidoMes: (fin || []).filter((l) => l.tipo === "entrada" && l.status === "recebido" && l.data >= ini && l.data <= fim).reduce((s, l) => s + Number(l.valor || 0), 0),
      aReceber: (fin || []).filter((l) => l.tipo === "entrada" && l.status === "a_receber").reduce((s, l) => s + Number(l.valor || 0), 0),
      metas: (ms || []).filter((m) => !m.concluida).slice(0, 3).map((m) => ({ ...m, _atual: progressoDe(m) })),
    };
  }
  const cartaoMetaMini = (m) => {
    const pct = Math.max(0, Math.min(100, Math.round((m._atual / Number(m.alvo || 1)) * 100)));
    return `<a class="card meta-mini" href="#metas"><span class="meta-emoji">${esc(m.emoji || "🎯")}</span><div><strong>${esc(m.titulo)}</strong><div class="meta-barra"><span style="width:${pct}%"></span></div><span class="muted">${fmtMeta(m, m._atual)} de ${fmtMeta(m, m.alvo)} · ${pct}%</span></div></a>`;
  };

  return { telaTarefas, telaMetas, telaFinanceiro, resumo, reais, cartaoMetaMini };
})();
