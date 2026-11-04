// =====================================================================
// portfolio.js: área "Portfólio" (menu lateral).
// Edita o conteúdo do site https://ugcnathaliamessias.github.io/portfolio/
//   - Vídeos (YouTube), Nichos, Marcas (faixa de logos), Fotos e Capa
// Tudo fica na tabela port_dados (uma linha por seção). O site lê de lá
// quando abre; se não conseguir, usa o que está escrito no próprio código.
// =====================================================================
window.Portfolio = (() => {
  const { esc, icone, toast } = App;

  const SITE = "https://ugcnathaliamessias.github.io/portfolio/";
  const ABAS = [
    { v: "videos", t: "🎬 Vídeos" },
    { v: "nichos", t: "🏷️ Nichos" },
    { v: "marcas", t: "⭐ Marcas" },
    { v: "fotos", t: "📷 Fotos" },
    { v: "capa", t: "✨ Capa" },
  ];
  const FORMATOS = ["Anúncio", "Review", "Demonstração", "Storytelling", "Receita", "Unboxing", "Editorial", "ASMR", "Vlog", "Problema x solução", "Tutorial", "Antes e depois"];

  let el = null;
  let aba = "videos";
  let dados = {};
  let filtroNicho = "";

  // caminho relativo do site (ex.: logos/x.png) vira link completo
  const urlSite = (s) => (!s ? "" : /^(https?:|data:)/.test(s) ? s : SITE + s);
  const idYoutube = (url) => (String(url || "").match(/(?:shorts\/|youtu\.be\/|[?&]v=|embed\/)([\w-]{11})/) || [])[1] || "";
  const capaYoutube = (url) => { const id = idYoutube(url); return id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : ""; };
  const slug = (t) => String(t || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "nicho";
  const lista = (k) => (Array.isArray(dados[k]) ? dados[k] : []);
  const nomeNicho = (id) => lista("nichos").find((n) => n.id === id)?.nome || id;

  // =================================================================
  // TELA
  // =================================================================
  async function render(alvo, sub) {
    el = alvo;
    aba = ABAS.some((a) => a.v === sub) ? sub : "videos";
    el.onclick = aoClicar;
    el.onchange = aoMudar;
    el.innerHTML = cabecalho() + `<div class="card"><p class="muted">Carregando...</p></div>`;
    const d = await Dados.lerPortfolio();
    if (d === null) {
      el.innerHTML = cabecalho() + `<p class="alerta alerta-erro">Não consegui ler o portfólio agora. Confira se o 11_portfolio_e_plataformas.sql foi rodado e tente de novo.</p>`;
      return;
    }
    dados = d;
    desenhar();
  }

  function cabecalho() {
    return `
      <div class="cabecalho">
        <div>
          <h1>🖼️ Portfólio</h1>
          <p class="muted">O que você mudar aqui aparece no seu site em segundos.</p>
        </div>
        <div class="vte-cab-acoes">
          <a class="btn" href="${SITE}" target="_blank" rel="noopener">${icone("link", 15)} Ver site</a>
          ${App.seletorPerfil()}
        </div>
      </div>
      <div class="abas" role="tablist">
        ${ABAS.map((a) => `<button class="aba ${a.v === aba ? "ativa" : ""}" data-acao="aba" data-v="${a.v}" role="tab">${a.t}</button>`).join("")}
      </div>
      ${Dados.usaSupabase() ? "" : `<p class="alerta alerta-atencao">Modo de teste local: as mudanças ficam só neste navegador e não vão pro site.</p>`}`;
  }

  function desenhar() {
    const corpo = { videos: telaVideos, nichos: telaNichos, marcas: telaMarcas, fotos: telaFotos, capa: telaCapa }[aba]();
    el.innerHTML = cabecalho() + corpo;
  }

  // botões de ordem + editar + apagar de cada linha
  const acoesLinha = (tipo, i, total, podeApagar = true) => `
    <div class="port-acoes">
      <button class="btn-icone" data-acao="subir" data-tipo="${tipo}" data-i="${i}" ${i === 0 ? "disabled" : ""} aria-label="Subir" title="Subir">↑</button>
      <button class="btn-icone" data-acao="descer" data-tipo="${tipo}" data-i="${i}" ${i === total - 1 ? "disabled" : ""} aria-label="Descer" title="Descer">↓</button>
      <button class="btn btn-sm" data-acao="editar" data-tipo="${tipo}" data-i="${i}">${icone("lapis", 14)} Editar</button>
      ${podeApagar ? `<button class="btn-icone btn-perigo" data-acao="apagar" data-tipo="${tipo}" data-i="${i}" aria-label="Apagar" title="Apagar">${icone("lixo", 15)}</button>` : ""}
    </div>`;

  // ---------- VÍDEOS ----------
  function telaVideos() {
    const vids = lista("trabalhos").map((t, i) => ({ t, i })).filter(({ t }) => !filtroNicho || t.nicho === filtroNicho);
    const nichos = lista("nichos").filter((n) => n.id !== "todos");
    return `
      <div class="cabecalho" style="margin-bottom:14px">
        <label class="port-filtro"><span class="rotulo">Nicho</span>
          <select data-filtro-nicho>
            <option value="">Todos (${lista("trabalhos").length})</option>
            ${nichos.map((n) => `<option value="${esc(n.id)}" ${filtroNicho === n.id ? "selected" : ""}>${esc(n.nome)} (${lista("trabalhos").filter((t) => t.nicho === n.id).length})</option>`).join("")}
          </select></label>
        <button class="btn btn-primario" data-acao="novo" data-tipo="trabalhos">${icone("mais", 16)} Novo vídeo</button>
      </div>
      ${vids.length ? `<div class="card port-lista">${vids.map(({ t, i }, n) => `
        <div class="port-item">
          <img class="port-thumb port-thumb-video" src="${esc(urlSite(t.capa) || (idYoutube(t.video) ? SITE + "capas/" + idYoutube(t.video) + ".jpg" : ""))}" data-reserva="${esc(capaYoutube(t.video))}" onerror="if(this.dataset.reserva&&this.src!==this.dataset.reserva)this.src=this.dataset.reserva" alt="" loading="lazy">
          <div class="port-info">
            <strong>${esc(t.marca)}</strong>
            <span><span class="chip">${esc(t.formato || "-")}</span> <span class="muted">${esc(nomeNicho(t.nicho))}</span></span>
            <a class="port-link" href="${esc(t.video)}" target="_blank" rel="noopener">${esc(t.video)}</a>
          </div>
          ${acoesVideo(i, n, vids)}
        </div>`).join("")}</div>` : `<div class="card vazio"><h2>Nenhum vídeo aqui</h2><p>Toque em "Novo vídeo" e cole o link do YouTube.</p></div>`}
      <p class="muted abord-dica">A ordem aqui é a ordem no site. A capa vem do próprio YouTube.</p>`;
  }
  // subir/descer troca com o vizinho da lista filtrada
  function acoesVideo(i, n, vids) {
    return `
    <div class="port-acoes">
      <button class="btn-icone" data-acao="mover-video" data-de="${i}" data-para="${n > 0 ? vids[n - 1].i : ""}" ${n === 0 ? "disabled" : ""} aria-label="Subir" title="Subir">↑</button>
      <button class="btn-icone" data-acao="mover-video" data-de="${i}" data-para="${n < vids.length - 1 ? vids[n + 1].i : ""}" ${n === vids.length - 1 ? "disabled" : ""} aria-label="Descer" title="Descer">↓</button>
      <button class="btn btn-sm" data-acao="editar" data-tipo="trabalhos" data-i="${i}">${icone("lapis", 14)} Editar</button>
      <button class="btn-icone btn-perigo" data-acao="apagar" data-tipo="trabalhos" data-i="${i}" aria-label="Apagar" title="Apagar">${icone("lixo", 15)}</button>
    </div>`;
  }

  // ---------- NICHOS ----------
  function telaNichos() {
    const ns = lista("nichos");
    return `
      <div class="cabecalho" style="margin-bottom:14px">
        <p class="muted" style="margin:0">O primeiro da lista é o que abre primeiro no site. "Todos os conteúdos" junta tudo.</p>
        <button class="btn btn-primario" data-acao="novo" data-tipo="nichos">${icone("mais", 16)} Novo nicho</button>
      </div>
      <div class="card port-lista">${ns.map((nc, i) => {
        const qtd = nc.id === "todos" ? lista("trabalhos").length : lista("trabalhos").filter((t) => t.nicho === nc.id).length;
        return `
        <div class="port-item">
          <div class="port-info">
            <strong>${esc(nc.nome)}</strong>
            <span class="muted">${nc.en?.nome ? `Em inglês: ${esc(nc.en.nome)} · ` : ""}${qtd} ${qtd === 1 ? "vídeo" : "vídeos"}</span>
          </div>
          ${acoesLinha("nichos", i, ns.length, nc.id !== "todos")}
        </div>`;
      }).join("")}</div>`;
  }

  // ---------- MARCAS ----------
  function telaMarcas() {
    const ms = lista("marcas");
    return `
      <div class="cabecalho" style="margin-bottom:14px">
        <p class="muted" style="margin:0">Os logos que passam na faixa da capa do site.</p>
        <button class="btn btn-primario" data-acao="novo" data-tipo="marcas">${icone("mais", 16)} Nova marca</button>
      </div>
      <div class="card port-lista">${ms.map((m, i) => `
        <div class="port-item">
          ${selo(m)}
          <div class="port-info"><strong>${esc(m.nome)}</strong><span class="muted">${m.logo ? `Tamanho ${String(m.zoom || 1).replace(".", ",")}` : "Sem logo (aparece o nome escrito)"}</span></div>
          ${acoesLinha("marcas", i, ms.length)}
        </div>`).join("")}</div>`;
  }
  const selo = (m) => `<span class="port-selo" ${m.fundo ? `style="background:${esc(m.fundo)}"` : ""}>${m.logo
    ? `<img src="${esc(urlSite(m.logo))}" alt="" style="transform:scale(${Number(m.zoom) || 1})">`
    : `<span>${esc(m.nome)}</span>`}</span>`;

  // ---------- FOTOS ----------
  function telaFotos() {
    const fs = lista("fotos");
    return `
      <div class="cabecalho" style="margin-bottom:14px">
        <p class="muted" style="margin:0">As fotos UGC que passam em faixa no site. Formato vertical (4:5) fica melhor.</p>
        <button class="btn btn-primario" data-acao="novo" data-tipo="fotos">${icone("mais", 16)} Nova foto</button>
      </div>
      <div class="card port-lista">${fs.map((f, i) => `
        <div class="port-item">
          <img class="port-thumb" src="${esc(urlSite(f.src))}" alt="" loading="lazy">
          <div class="port-info"><strong>${esc(f.marca)}</strong><span class="muted">${esc(f.produto || "")}</span></div>
          ${acoesLinha("fotos", i, fs.length)}
        </div>`).join("")}</div>`;
  }

  // ---------- CAPA ----------
  function telaCapa() {
    const fr = lista("destaquesCapa");
    return `
      <div class="card port-capa">
        <h2>Frases em volta da sua foto</h2>
        <p class="muted">Use **duas estrelas** pra deixar em negrito. Ex: Já criei para **Nestlé e Shopee**.</p>
        ${fr.map((f, i) => `
          <div class="linha-2">
            <label class="campo"><span class="rotulo">Frase ${i + 1}</span>
              <textarea rows="2" data-frase="${i}" data-idioma="pt">${esc(f.texto || "")}</textarea></label>
            <label class="campo"><span class="rotulo">Em inglês (opcional)</span>
              <textarea rows="2" data-frase="${i}" data-idioma="en">${esc(f.en?.texto || "")}</textarea></label>
          </div>`).join("")}
        <div class="modal-acoes"><span style="flex:1"></span><button class="btn btn-primario" data-acao="salvar-capa">Salvar frases</button></div>
      </div>`;
  }

  // =================================================================
  // EVENTOS
  // =================================================================
  async function salvar(chave, valor, msg = "Salvo. O site já mostra a mudança.") {
    const r = await Dados.salvarPortfolio(chave, valor);
    if (r.erro) { toast(r.erro, "erro"); return false; }
    dados[chave] = valor;
    toast(r.local ? "Salvo neste navegador (modo de teste)." : msg, r.local ? "aviso" : "ok");
    desenhar();
    return true;
  }

  async function aoClicar(e) {
    const b = e.target.closest("[data-acao]");
    if (!b || b.disabled) return;
    const a = b.dataset.acao, tipo = b.dataset.tipo, i = Number(b.dataset.i);
    if (a === "aba") { location.hash = `#portfolio/${b.dataset.v}`; return; }
    if (a === "novo") return abrirForm(tipo, -1);
    if (a === "editar") return abrirForm(tipo, i);
    if (a === "subir" || a === "descer") {
      const l = [...lista(tipo)];
      const j = a === "subir" ? i - 1 : i + 1;
      if (j < 0 || j >= l.length) return;
      [l[i], l[j]] = [l[j], l[i]];
      return salvar(tipo, l, "Ordem salva.");
    }
    if (a === "mover-video") {
      const de = Number(b.dataset.de), para = Number(b.dataset.para);
      if (Number.isNaN(para) || b.dataset.para === "") return;
      const l = [...lista("trabalhos")];
      [l[de], l[para]] = [l[para], l[de]];
      return salvar("trabalhos", l, "Ordem salva.");
    }
    if (a === "apagar") {
      const item = lista(tipo)[i];
      if (!item) return;
      if (tipo === "nichos") {
        const qtd = lista("trabalhos").filter((t) => t.nicho === item.id).length;
        if (qtd) return toast(`Esse nicho tem ${qtd} ${qtd === 1 ? "vídeo" : "vídeos"}. Mude os vídeos de nicho antes de apagar.`, "aviso");
      }
      const nome = item.marca || item.nome || "este item";
      if (!confirm(`Tirar "${nome}" do portfólio?`)) return;
      return salvar(tipo, lista(tipo).filter((_, k) => k !== i), "Removido do portfólio.");
    }
    if (a === "salvar-capa") {
      const fr = lista("destaquesCapa").map((f, k) => {
        const pt = el.querySelector(`[data-frase="${k}"][data-idioma="pt"]`).value.trim();
        const en = el.querySelector(`[data-frase="${k}"][data-idioma="en"]`).value.trim();
        const novo = { ...f, texto: pt || f.texto };
        if (en) novo.en = { ...(f.en || {}), texto: en }; else delete novo.en;
        return novo;
      });
      return salvar("destaquesCapa", fr);
    }
  }

  function aoMudar(e) {
    if (e.target.matches("[data-filtro-nicho]")) { filtroNicho = e.target.value; desenhar(); }
  }

  // =================================================================
  // FORMULÁRIOS
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
  const cab = (t) => `<div class="modal-cab"><h2>${esc(t)}</h2><button type="button" class="btn-icone" data-fechar aria-label="Fechar">${icone("x", 18)}</button></div>`;
  const rodape = `<div class="modal-acoes"><span style="flex:1"></span><button type="button" class="btn" data-fechar>Cancelar</button><button type="submit" class="btn btn-primario">Salvar</button></div>`;

  function abrirForm(tipo, i) {
    const item = i >= 0 ? lista(tipo)[i] : null;
    if (tipo === "trabalhos") return formVideo(item, i);
    if (tipo === "nichos") return formNicho(item, i);
    if (tipo === "marcas") return formMarca(item, i);
    if (tipo === "fotos") return formFoto(item, i);
  }

  // grava o item na posição certa (novo vai pro fim, ou logo depois do último do mesmo nicho)
  function gravarItem(tipo, i, novo, depoisDe) {
    const l = [...lista(tipo)];
    if (i >= 0) l[i] = novo;
    else {
      const pos = depoisDe ? l.map((x, k) => (depoisDe(x) ? k : -1)).filter((k) => k >= 0).pop() : undefined;
      if (pos === undefined) l.push(novo); else l.splice(pos + 1, 0, novo);
    }
    return salvar(tipo, l);
  }

  function formVideo(v, i) {
    const nichos = lista("nichos").filter((n) => n.id !== "todos");
    const formatos = [...new Set([...FORMATOS, ...lista("trabalhos").map((t) => t.formato).filter(Boolean)])];
    abrirJanela(`
      <form class="modal">
        ${cab(v ? "Editar vídeo" : "Novo vídeo")}
        <label class="campo"><span class="rotulo">Link do YouTube</span>
          <input type="url" name="video" required value="${esc(v?.video || "")}" placeholder="https://youtube.com/shorts/..."></label>
        <div class="port-previa-video" data-previa></div>
        <div class="linha-2">
          <label class="campo"><span class="rotulo">Marca</span>
            <input type="text" name="marca" required maxlength="60" value="${esc(v?.marca || "")}" placeholder="Ex: Felps"></label>
          <label class="campo"><span class="rotulo">Formato</span>
            <input type="text" name="formato" list="port-formatos" maxlength="40" value="${esc(v?.formato || "")}" placeholder="Ex: Anúncio">
            <datalist id="port-formatos">${formatos.map((f) => `<option value="${esc(f)}">`).join("")}</datalist></label>
        </div>
        <label class="campo"><span class="rotulo">Nicho</span>
          <select name="nicho">${nichos.map((n) => `<option value="${esc(n.id)}" ${(v?.nicho || filtroNicho) === n.id ? "selected" : ""}>${esc(n.nome)}</option>`).join("")}</select></label>
        ${rodape}
      </form>`, (fundo, fechar) => {
      const f = fundo.querySelector("form");
      const previa = () => {
        const c = capaYoutube(f.video.value);
        fundo.querySelector("[data-previa]").innerHTML = c ? `<img src="${esc(c)}" alt="Capa do vídeo">` : (f.video.value ? `<span class="muted">Não reconheci esse link do YouTube.</span>` : "");
      };
      previa();
      f.video.addEventListener("input", previa);
      f.video.focus();
      f.addEventListener("submit", async (ev) => {
        ev.preventDefault();
        if (!idYoutube(f.video.value)) return toast("Cole um link do YouTube (Shorts, youtu.be ou watch?v=).", "erro");
        const novo = { ...(v || {}), video: f.video.value.trim(), marca: f.marca.value.trim(), formato: f.formato.value.trim() || "Vídeo UGC", nicho: f.nicho.value };
        if (await gravarItem("trabalhos", i, novo, (t) => t.nicho === novo.nicho)) fechar();
      });
    });
  }

  function formNicho(n, i) {
    const fixo = n?.id === "todos";
    abrirJanela(`
      <form class="modal">
        ${cab(n ? "Editar nicho" : "Novo nicho")}
        <div class="linha-2">
          <label class="campo"><span class="rotulo">Nome</span>
            <input type="text" name="nome" required maxlength="40" value="${esc(n?.nome || "")}" placeholder="Ex: Pets"></label>
          <label class="campo"><span class="rotulo">Em inglês (opcional)</span>
            <input type="text" name="en" maxlength="40" value="${esc(n?.en?.nome || "")}" placeholder="Ex: Pets"></label>
        </div>
        ${fixo ? `<p class="muted abord-dica">Esse é o nicho que junta todos os vídeos. Dá pra mudar só o nome.</p>` : ""}
        ${rodape}
      </form>`, (fundo, fechar) => {
      const f = fundo.querySelector("form");
      f.nome.focus();
      f.addEventListener("submit", async (ev) => {
        ev.preventDefault();
        const nome = f.nome.value.trim();
        if (!nome) return;
        let id = n?.id;
        if (!id) {
          id = slug(nome);
          const ids = new Set(lista("nichos").map((x) => x.id));
          for (let k = 2; ids.has(id); k++) id = `${slug(nome)}-${k}`;
        }
        const novo = { ...(n || {}), id, nome };
        if (f.en.value.trim()) novo.en = { nome: f.en.value.trim() }; else delete novo.en;
        if (await gravarItem("nichos", i, novo)) fechar();
      });
    });
  }

  // campo de imagem: mostra a atual, envia uma nova e guarda o link
  function campoImagem(rotulo, atual, pasta) {
    return `
      <div class="campo"><span class="rotulo">${rotulo}</span>
        <div class="port-upload">
          <div class="port-upload-previa" data-img-previa>${atual ? `<img src="${esc(urlSite(atual))}" alt="">` : `<span class="muted">Sem imagem</span>`}</div>
          <label class="btn btn-sm">${icone("clipe", 14)} Escolher imagem
            <input type="file" accept="image/*" data-img-arquivo data-pasta="${pasta}" hidden></label>
        </div>
        <input type="hidden" name="imagem" value="${esc(atual || "")}">
      </div>`;
  }
  function ligarUpload(fundo, aoTrocar) {
    fundo.querySelector("[data-img-arquivo]").addEventListener("change", async (ev) => {
      const arq = ev.target.files?.[0];
      if (!arq) return;
      const prev = fundo.querySelector("[data-img-previa]");
      prev.innerHTML = `<span class="muted">Enviando...</span>`;
      const r = await Dados.enviarImagemPortfolio(arq, ev.target.dataset.pasta);
      if (r.erro) { prev.innerHTML = `<span class="muted">Não enviou</span>`; return toast(r.erro, "erro"); }
      fundo.querySelector('[name="imagem"]').value = r.url;
      prev.innerHTML = `<img src="${esc(r.url)}" alt="">`;
      aoTrocar?.();
    });
  }

  function formMarca(m, i) {
    abrirJanela(`
      <form class="modal">
        ${cab(m ? "Editar marca" : "Nova marca")}
        <label class="campo"><span class="rotulo">Nome</span>
          <input type="text" name="nome" required maxlength="40" value="${esc(m?.nome || "")}" placeholder="Ex: Felps"></label>
        ${campoImagem("Logo (de preferência PNG ou SVG com fundo transparente)", m?.logo, "logos")}
        <div class="linha-2">
          <label class="campo"><span class="rotulo">Tamanho do logo <span class="muted" data-zoom-txt></span></span>
            <input type="range" name="zoom" min="0.6" max="2.5" step="0.05" value="${Number(m?.zoom) || 1}"></label>
          <label class="campo"><span class="rotulo">Fundo do círculo</span>
            <span class="port-fundo"><input type="checkbox" name="temfundo" ${m?.fundo ? "checked" : ""}> <input type="color" name="fundo" value="${esc(m?.fundo && /^#[0-9a-f]{6}$/i.test(m.fundo) ? m.fundo : "#000000")}"> <span class="muted">pra logo claro</span></span></label>
        </div>
        <div class="port-selo-previa" data-selo></div>
        ${rodape}
      </form>`, (fundo, fechar) => {
      const f = fundo.querySelector("form");
      const atual = () => ({ nome: f.nome.value || "Marca", logo: f.imagem.value, zoom: Number(f.zoom.value), fundo: f.temfundo.checked ? f.fundo.value : "" });
      const previa = () => {
        fundo.querySelector("[data-selo]").innerHTML = `<span class="muted">Como fica no site:</span> ${selo(atual())}`;
        fundo.querySelector("[data-zoom-txt]").textContent = `(${String(f.zoom.value).replace(".", ",")})`;
      };
      previa();
      ["input", "change"].forEach((t) => f.addEventListener(t, previa));
      ligarUpload(fundo, previa);
      f.nome.focus();
      f.addEventListener("submit", async (ev) => {
        ev.preventDefault();
        const a = atual();
        const novo = { nome: f.nome.value.trim(), logo: a.logo || "" };
        if (a.zoom !== 1) novo.zoom = a.zoom;
        if (a.fundo) novo.fundo = a.fundo;
        if (await gravarItem("marcas", i, novo)) fechar();
      });
    });
  }

  function formFoto(ft, i) {
    abrirJanela(`
      <form class="modal">
        ${cab(ft ? "Editar foto" : "Nova foto")}
        ${campoImagem("Foto", ft?.src, "fotos")}
        <div class="linha-2">
          <label class="campo"><span class="rotulo">Marca</span>
            <input type="text" name="marca" required maxlength="60" value="${esc(ft?.marca || "")}" placeholder="Ex: WidiCare"></label>
          <label class="campo"><span class="rotulo">Produto</span>
            <input type="text" name="produto" maxlength="80" value="${esc(ft?.produto || "")}" placeholder="Ex: Linha Phyto Manga"></label>
        </div>
        <label class="campo"><span class="rotulo">Descrição da foto (pra quem usa leitor de tela)</span>
          <input type="text" name="alt" maxlength="200" value="${esc(ft?.alt || "")}" placeholder="Ex: Nathalia sorrindo segurando o óleo Marula da Felps"></label>
        <details class="port-en"><summary>Em inglês (opcional)</summary>
          <div class="linha-2">
            <label class="campo"><span class="rotulo">Produto</span><input type="text" name="en_produto" maxlength="80" value="${esc(ft?.en?.produto || "")}"></label>
            <label class="campo"><span class="rotulo">Descrição</span><input type="text" name="en_alt" maxlength="200" value="${esc(ft?.en?.alt || "")}"></label>
          </div>
        </details>
        ${rodape}
      </form>`, (fundo, fechar) => {
      const f = fundo.querySelector("form");
      ligarUpload(fundo);
      f.addEventListener("submit", async (ev) => {
        ev.preventDefault();
        if (!f.imagem.value) return toast("Escolha a foto antes de salvar.", "erro");
        const novo = {
          src: f.imagem.value, marca: f.marca.value.trim(), produto: f.produto.value.trim(),
          alt: f.alt.value.trim() || `${f.marca.value.trim()} ${f.produto.value.trim()}`.trim(),
        };
        const en = {};
        if (f.en_produto.value.trim()) en.produto = f.en_produto.value.trim();
        if (f.en_alt.value.trim()) en.alt = f.en_alt.value.trim();
        if (Object.keys(en).length) novo.en = en;
        if (await gravarItem("fotos", i, novo)) fechar();
      });
    });
  }

  return { render };
})();
