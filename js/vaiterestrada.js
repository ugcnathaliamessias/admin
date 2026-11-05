// =====================================================================
// vaiterestrada.js: telas do perfil "Vai Ter Estrada". Abrem pelo botão
// "Nathalia (UGC) | Vai Ter Estrada" (mesmo do Marcas & prospecção):
//   - Instagram › 📊 Métricas: números do @vaiterestrada puxados pelo robô
//     vte-instagram (a cada 6h, ou no botão "Atualizar agora"): seguidores,
//     views, engajamento, vídeos que mais bombaram, todos os posts.
//   - Portfólio › 🗂️ Mídia kit: edita o site do mídia kit (textos,
//     audiência, TikTok, parcerias, prints de comentários, contato).
//   - Marcas & prospecção já tem o próprio botão de perfil.
// Tabelas: vte_dados (chaves "conteudo" e "instagram") e vte_historico.
// =====================================================================
window.VaiTerEstrada = (() => {
  const { esc, icone, toast, num } = App;

  // site próprio do mídia kit: organização "vaiterestrada" no GitHub,
  // repositório "midiakit" (depois pode ganhar domínio próprio)
  const SITE = "https://vaiterestrada.github.io/midiakit/";
  const FORMATOS = ["Storytelling", "Review", "Demonstração", "Anúncio", "Unboxing", "Tutorial", "Vlog", "Receita", "Hospedagem", "Roteiro de viagem"];
  const IDADES = ["13-17", "18-24", "25-34", "35-44", "45-54", "55-64", "65+"];
  const DIA = 864e5;

  let el = null;
  let aba = "metricas";
  let dados = {};
  let hist = [];
  let conteudo = {};
  let ordemTabela = { campo: "data", desc: true };

  const urlSite = (s) => (!s ? "" : /^(https?:|data:)/.test(s) ? s : SITE + s);
  const compacto = (n) => new Intl.NumberFormat("pt-BR", { notation: "compact", maximumFractionDigits: 1 }).format(n || 0);
  const pct = (n) => `${Number(n || 0).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
  // "2026-09-07" (só a data) não pode passar por new Date, senão volta um dia pelo fuso
  const dataBr = (s) => {
    const m = String(s).match(/^(\d{4})-(\d{2})-(\d{2})$/);
    return m ? `${m[3]}/${m[2]}/${m[1].slice(2)}` : new Date(s).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" });
  };

  // =================================================================
  // ANÁLISE (mesma regra do site do mídia kit)
  // Reels com a mesma legenda (versões de teste) viram um só, somados.
  // =================================================================
  function analisar(ig) {
    const perfil = ig?.perfil || {};
    const grupos = new Map();
    for (const p of ig?.posts || []) {
      // mesmo começo de legenda + mesmo dia = o mesmo vídeo (versão de teste)
      const inicio = String(p.legenda || "").replace(/\s+/g, " ").trim().toLowerCase().slice(0, 30);
      const chave = inicio ? `${inicio}|${String(p.data).slice(0, 10)}` : p.id;
      const g = grupos.get(chave);
      if (!g) { grupos.set(chave, { ...p, versoes: 1, _max: p.views || 0 }); continue; }
      g.versoes++;
      if ((p.views || 0) > g._max) { g._max = p.views || 0; g.link = p.link; g.capa = p.capa || g.capa; }
      g.views = (g.views || 0) + (p.views || 0);
      g.curtidas = (g.curtidas || 0) + (p.curtidas || 0);
      g.comentarios = (g.comentarios || 0) + (p.comentarios || 0);
      if (p.data < g.data) g.data = p.data;
    }
    const seg = perfil.seguidores || 0;
    const lista = [...grupos.values()].map((p) => {
      const interacoes = (p.curtidas || 0) + (p.comentarios || 0);
      return { ...p, interacoes, eng: seg ? (interacoes / seg) * 100 : 0 };
    });
    const limite = Date.now() - 30 * DIA;
    const recentes = lista.filter((p) => Date.parse(p.data) >= limite);
    const videos30 = recentes.filter((p) => typeof p.views === "number");
    const views30 = videos30.reduce((t, p) => t + p.views, 0);
    const comViews = lista.filter((p) => typeof p.views === "number");
    return {
      perfil, lista,
      seguidores: seg,
      views30,
      posts30: recentes.length,
      inter30: recentes.reduce((t, p) => t + p.interacoes, 0),
      mediaViews: videos30.length ? Math.round(views30 / videos30.length) : 0,
      engajamento: recentes.length ? recentes.reduce((t, p) => t + p.eng, 0) / recentes.length : 0,
      maior: comViews.reduce((m, p) => Math.max(m, p.views), 0),
    };
  }

  // =================================================================
  // TELA (abre pelo botão "Vai Ter Estrada" no Instagram e no Portfólio)
  // =================================================================
  const abrirInstagram = (alvo) => render(alvo, "metricas");
  const abrirMidiaKit = (alvo) => render(alvo, "midiakit");

  async function render(alvo, qual) {
    el = alvo;
    aba = qual;
    el.onclick = aoClicar;
    el.onchange = aoMudar;
    el.oninput = null;
    el.innerHTML = cabecalho() + `<div class="card"><p class="muted">Carregando...</p></div>`;
    const [d, h] = await Promise.all([Dados.lerVte(), Dados.historicoVte()]);
    if (d === null) {
      el.innerHTML = cabecalho() + `<p class="alerta alerta-erro">Não consegui ler os dados agora. Confira se o 15_vai_ter_estrada.sql foi rodado e tente de novo.</p>`;
      return;
    }
    dados = d;
    hist = h;
    conteudo = structuredClone(d.conteudo || {});
    desenhar();
  }

  function cabecalho() {
    const ehMetricas = aba === "metricas";
    return `
      <div class="cabecalho">
        <div>
          <h1>${ehMetricas ? "📸 Instagram" : "🖼️ Portfólio"}</h1>
          <p class="muted">${ehMetricas
            ? "Números do @vaiterestrada, atualizados sozinhos a cada 6 horas."
            : "O mídia kit do Vai Ter Estrada. O que você mudar aqui aparece no site em segundos."}</p>
        </div>
        <div class="vte-cab-acoes">
          <a class="btn" href="${SITE}" target="_blank" rel="noopener">${icone("link", 15)} Ver mídia kit</a>
          ${App.seletorPerfil()}
        </div>
      </div>
      <div class="abas" role="tablist">
        <button class="aba ativa" role="tab">${ehMetricas ? "📊 Métricas" : "🗂️ Mídia kit"}</button>
      </div>`;
  }

  function desenhar() {
    el.innerHTML = cabecalho() + (aba === "midiakit" ? telaMidiaKit() : telaMetricas());
    if (aba === "metricas") el.querySelectorAll(".grafico").forEach(ligarDicas);
  }

  // ---------- MÉTRICAS ----------
  function telaMetricas() {
    const ig = dados.instagram;
    if (!ig?.perfil) {
      return `
        <div class="card vazio">
          <div class="vazio-emoji">🏕️</div>
          <h2>Ainda não puxei os números do @vaiterestrada</h2>
          <p>O robô atualiza sozinho a cada 6 horas. Pra puxar agora, toque no botão.</p>
          <button class="btn btn-primario" data-acao="atualizar">🔄 Atualizar agora</button>
        </div>`;
    }
    const a = analisar(ig);
    const horas = Math.max(0, Math.round((Date.now() - Date.parse(ig.atualizado_em)) / 36e5));
    const quando = horas < 1 ? "há poucos minutos" : horas < 24 ? `há ${horas}h` : `em ${dataBr(ig.atualizado_em)}`;
    const pontos = hist.filter((x) => x.seguidores);
    const primeiro = pontos[0];
    const cresc = primeiro && primeiro.seguidores ? Math.round((a.seguidores / primeiro.seguidores - 1) * 100) : null;
    const kpi = (t, v, s, extra = "") => `<div class="card kpi ${extra}"><span class="rotulo">${t}</span><div class="kpi-valor">${v}</div><div class="kpi-sub">${s}</div></div>`;
    const topViews = [...a.lista].filter((p) => typeof p.views === "number").sort((x, y) => y.views - x.views).slice(0, 5);
    const topInter = [...a.lista].sort((x, y) => y.interacoes - x.interacoes).slice(0, 5);
    return `
      <div class="vte-barra">
        <span class="muted">Atualizado ${quando} · @${esc(a.perfil.usuario || "vaiterestrada")} · ${num(a.perfil.posts)} posts</span>
        <button class="btn btn-sm" data-acao="atualizar">🔄 Atualizar agora</button>
      </div>
      <div class="grade vte-kpis">
        ${kpi("👥 Seguidores", num(a.seguidores), cresc !== null && cresc > 0 ? `+${cresc}% desde ${dataBr(primeiro.dia)}` : "no Instagram", "vte-kpi-destaque")}
        ${kpi("▶️ Views em 30 dias", compacto(a.views30), `${a.posts30} posts no período`)}
        ${kpi("📈 Média por reel", compacto(a.mediaViews), "views por vídeo (30 dias)")}
        ${kpi("💬 Engajamento", pct(a.engajamento), "curtidas + comentários ÷ seguidores")}
        ${kpi("❤️ Interações em 30 dias", compacto(a.inter30), "curtidas + comentários")}
        ${kpi("🔥 Vídeo mais visto", compacto(a.maior), "views (todas as versões)")}
      </div>
      ${blocoInsights(ig.insights)}
      <div class="grade grade-2 vte-grade" style="margin-top:16px">
        <div class="card"><h3>📈 Seguidores ao longo do tempo</h3>${graficoSeguidores(pontos, a.seguidores)}</div>
        <div class="card"><h3>▶️ Views por post (últimos 15)</h3>${graficoViews(a.lista)}</div>
      </div>
      <div class="grade grade-2 vte-grade" style="margin-top:16px">
        <div class="card"><h3>🔥 Mais vistos</h3>${listaTop(topViews, "views")}</div>
        <div class="card"><h3>💬 Mais interação</h3>${listaTop(topInter, "interacoes")}</div>
      </div>
      <h2 class="secao-titulo">📋 Todos os posts</h2>
      ${tabelaPosts(a.lista)}
      <p class="muted abord-dica">Reels publicados em mais de uma versão (mesma legenda) aparecem juntos, com os números somados. Alcance e dados de público (idade, gênero) o Instagram só entrega pra conta dona; esses você atualiza em Portfólio › Mídia kit (com o Vai Ter Estrada ligado).</p>`;
  }

  // alcance, visitas e público: só quando o @vaiterestrada está ligado ao Meta
  function blocoInsights(ins) {
    if (!ins || ins.alcance_30d === null || ins.alcance_30d === undefined) {
      const erro = ins?.erros?.length ? `<br><span class="muted">Último aviso do Instagram: ${esc(ins.erros[0])}</span>` : "";
      return `<p class="alerta alerta-atencao" style="margin-top:16px">🔌 Alcance, visitas ao perfil e o público (idade, gênero, cidades) aparecem aqui sozinhos quando o @vaiterestrada estiver ligado ao portfólio empresarial do Meta.${erro}</p>`;
    }
    const kpi = (t, v, s) => `<div class="card kpi"><span class="rotulo">${t}</span><div class="kpi-valor">${v}</div><div class="kpi-sub">${s}</div></div>`;
    const n = (v) => (v === null || v === undefined ? "-" : compacto(v));
    const p = ins.publico;
    const barras = (lista, rot, val) => lista.map((x) => `
      <div class="vte-pub-linha"><span>${esc(x[rot])}</span><div class="vte-pub-barra"><i style="width:${Math.min(100, x[val] * 2)}%"></i></div><b>${pct(x[val])}</b></div>`).join("");
    return `
      <div class="grade vte-kpis" style="margin-top:16px">
        ${kpi("👀 Contas alcançadas", n(ins.alcance_30d), "últimos 30 dias")}
        ${kpi("🏠 Visitas ao perfil", n(ins.visitas_perfil_30d), "últimos 30 dias")}
        ${kpi("🙋 Contas engajadas", n(ins.contas_engajadas_30d), "últimos 30 dias")}
        ${kpi("🔁 Compartilhamentos", n(ins.compartilhamentos_30d), "últimos 30 dias")}
        ${kpi("🔖 Salvamentos", n(ins.salvamentos_30d), "últimos 30 dias")}
      </div>
      ${p ? `
      <div class="grade grade-2 vte-grade" style="margin-top:16px">
        <div class="card"><h3>👥 Público: gênero e idade</h3>
          <p class="muted" style="margin:4px 0 10px">Mulheres ${pct(p.mulheres)} · Homens ${pct(p.homens)}</p>
          ${barras(p.idades || [], "faixa", "pct")}
        </div>
        <div class="card"><h3>📍 Principais cidades</h3>${barras(p.cidades || [], "nome", "pct") || `<p class="muted">Sem dados ainda.</p>`}</div>
      </div>
      <p class="muted abord-dica">O público agora vem sozinho do Instagram e já aparece no mídia kit (no lugar do que foi digitado à mão).</p>` : ""}`;
  }

  function listaTop(itens, campo) {
    if (!itens.length) return `<p class="muted">Sem posts ainda.</p>`;
    return `<div class="vte-top">${itens.map((p, i) => `
      <a class="vte-top-item" href="${esc(p.link)}" target="_blank" rel="noopener">
        <span class="vte-top-pos">${i + 1}</span>
        ${p.capa ? `<img src="${esc(p.capa)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.style.visibility='hidden'">` : `<span class="vte-top-sem"></span>`}
        <span class="vte-top-info">
          <strong>${campo === "views" ? `${compacto(p.views)} views` : `${compacto(p.interacoes)} interações`}</strong>
          <span class="vte-top-legenda">${esc(p.legenda || "(sem legenda)")}</span>
          <span class="muted">❤️ ${num(p.curtidas)} · 💬 ${num(p.comentarios)}${typeof p.views === "number" && campo !== "views" ? ` · ▶️ ${compacto(p.views)}` : ""} · ${dataBr(p.data)}${p.versoes > 1 ? ` · ${p.versoes} versões` : ""}</span>
        </span>
      </a>`).join("")}</div>`;
  }

  function tabelaPosts(lista) {
    const { campo, desc } = ordemTabela;
    const val = (p) => campo === "data" ? Date.parse(p.data) : (p[campo] ?? -1);
    const ord = [...lista].sort((x, y) => (desc ? val(y) - val(x) : val(x) - val(y)));
    const th = (c, t) => `<th><button class="vte-ordenar ${campo === c ? "ativo" : ""}" data-ordenar="${c}">${t}${campo === c ? (desc ? " ↓" : " ↑") : ""}</button></th>`;
    const tipo = { reel: "🎬 Reel", carrossel: "🖼️ Carrossel", foto: "📷 Foto", video: "🎬 Vídeo" };
    return `
      <div class="card vte-tabela-caixa">
        <table class="vte-tabela">
          <thead><tr>${th("data", "Data")}<th>Post</th>${th("views", "Views")}${th("curtidas", "Curtidas")}${th("comentarios", "Coment.")}${th("eng", "Engaj.")}</tr></thead>
          <tbody>${ord.map((p) => `
            <tr>
              <td class="muted">${dataBr(p.data)}</td>
              <td><a href="${esc(p.link)}" target="_blank" rel="noopener" class="vte-tabela-post">${p.capa ? `<img src="${esc(p.capa)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.style.visibility='hidden'">` : ""}<span><span class="chip">${tipo[p.tipo] || p.tipo}</span> ${esc(String(p.legenda || "").slice(0, 70))}</span></a></td>
              <td><b>${typeof p.views === "number" ? num(p.views) : "-"}</b></td>
              <td>${p.curtidas === null ? "oculto" : num(p.curtidas)}</td>
              <td>${num(p.comentarios)}</td>
              <td>${pct(p.eng)}</td>
            </tr>`).join("")}</tbody>
        </table>
      </div>`;
  }

  // gráfico de linha simples (seguidores)
  function graficoSeguidores(pontos, hoje) {
    const ps = pontos.map((p) => ({ dia: p.dia, v: p.seguidores }));
    const d = new Date(Date.now() - 3 * 3600e3).toISOString().slice(0, 10);
    if (hoje && !ps.some((p) => p.dia === d)) ps.push({ dia: d, v: hoje });
    if (ps.length < 2) return `<p class="muted" style="margin-top:10px">O gráfico aparece quando tiver mais de um dia registrado.</p>`;
    const W = 300, H = 150, m = 8;
    const t0 = Date.parse(ps[0].dia), t1 = Date.parse(ps[ps.length - 1].dia);
    const max = Math.max(...ps.map((p) => p.v)) * 1.1;
    const x = (p) => m + ((Date.parse(p.dia) - t0) / Math.max(1, t1 - t0)) * (W - m * 2);
    const y = (p) => H - 4 - (p.v / max) * (H - 14);
    const caminho = ps.map((p, i) => `${i ? "L" : "M"}${x(p).toFixed(1)},${y(p).toFixed(1)}`).join(" ");
    const curto = (s) => { const [, mm, dd] = s.split("-"); return `${dd}/${mm}`; };
    return `
      <div class="grafico">
        <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="Seguidores ao longo do tempo">
          <path d="${caminho} L${x(ps[ps.length - 1]).toFixed(1)},${H} L${x(ps[0]).toFixed(1)},${H} Z" class="vte-area"/>
          <path d="${caminho}" class="vte-linha" vector-effect="non-scaling-stroke"/>
          ${ps.map((p) => `<rect class="barra vte-ponto" x="${(x(p) - 5).toFixed(1)}" y="${(y(p) - 5).toFixed(1)}" width="10" height="10" rx="5" data-dica="${esc(`${curto(p.dia)}: ${num(p.v)} seguidores`)}"></rect>`).join("")}
        </svg>
        <div class="eixo"><span>${curto(ps[0].dia)}</span><span>${curto(ps[ps.length - 1].dia)}</span></div>
      </div>`;
  }

  // barras: views dos últimos 15 posts (do mais antigo pro mais novo)
  function graficoViews(lista) {
    const serie = [...lista].filter((p) => typeof p.views === "number").sort((x, y) => String(x.data).localeCompare(String(y.data))).slice(-15);
    if (!serie.length) return `<p class="muted" style="margin-top:10px">Sem vídeos ainda.</p>`;
    const W = 300, H = 150, gap = 3;
    const max = Math.max(1, ...serie.map((p) => p.views));
    const bw = (W - gap * (serie.length - 1)) / serie.length;
    const curto = (s) => new Date(s).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
    return `
      <div class="grafico">
        <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="Views por post">
          ${serie.map((p, i) => {
            const h = Math.max(2, (p.views / max) * (H - 4));
            return `<rect class="barra" x="${(i * (bw + gap)).toFixed(2)}" y="${(H - h).toFixed(2)}" width="${bw.toFixed(2)}" height="${h.toFixed(2)}" rx="2" data-dica="${esc(`${curto(p.data)}: ${num(p.views)} views`)}"></rect>`;
          }).join("")}
        </svg>
        <div class="eixo"><span>${curto(serie[0].data)}</span><span>${curto(serie[serie.length - 1].data)}</span></div>
      </div>`;
  }

  function ligarDicas(g) {
    const dica = document.createElement("div");
    dica.className = "dica";
    dica.hidden = true;
    g.appendChild(dica);
    g.querySelectorAll("rect.barra").forEach((r) => {
      r.addEventListener("mouseenter", () => {
        const a = r.getBoundingClientRect(), b = g.getBoundingClientRect();
        dica.textContent = r.dataset.dica;
        dica.style.left = `${a.left - b.left + a.width / 2}px`;
        dica.style.top = `${a.top - b.top}px`;
        dica.hidden = false;
        r.classList.add("foco");
      });
      r.addEventListener("mouseleave", () => { dica.hidden = true; r.classList.remove("foco"); });
    });
  }

  // ---------- MÍDIA KIT (edição) ----------
  function telaMidiaKit() {
    const c = conteudo;
    const a = c.audiencia || {};
    const tt = c.tiktok || {};
    const k = c.contato || {};
    const idade = (f) => (a.idades || []).find((i) => i.faixa === f)?.pct ?? "";
    const campo = (rot, caminho, valor, tipo = "text", extra = "") =>
      `<label class="campo"><span class="rotulo">${rot}</span><input type="${tipo}" data-campo="${caminho}" value="${esc(valor ?? "")}" ${extra}></label>`;
    const area = (rot, caminho, valor, linhas = 4) =>
      `<label class="campo"><span class="rotulo">${rot}</span><textarea data-campo="${caminho}" rows="${linhas}">${esc(valor ?? "")}</textarea></label>`;
    return `
      ${Dados.usaSupabase() ? "" : `<p class="alerta alerta-atencao">Modo de teste local: as mudanças ficam só neste navegador e não vão pro site.</p>`}
      <p class="muted" style="margin-bottom:16px">Os números do Instagram entram sozinhos. Aqui fica o resto do mídia kit; toque em <b>Salvar</b> e o site muda na hora.</p>

      <div class="card vte-form">
        <h3>✍️ Sobre vocês</h3>
        ${area("Texto principal", "sobre", c.sobre, 4)}
        ${area("Segundo parágrafo", "sobre2", c.sobre2, 3)}
        ${campo("Frase de destaque", "frase", c.frase)}
        <label class="campo"><span class="rotulo">Temas (separe por vírgula)</span><input type="text" data-lista="temas" value="${esc((c.temas || []).join(", "))}"></label>
        ${area("Texto do \"Além dos números\"", "numeros_texto", c.numeros_texto, 4)}
      </div>

      <div class="card vte-form">
        <h3>👥 Audiência <span class="muted">(copie do Instagram: Insights › Público)</span></h3>
        <div class="vte-linha-campos">
          ${campo("Mulheres (%)", "audiencia.mulheres", a.mulheres, "number", 'step="0.1" min="0" max="100"')}
          ${campo("Homens (%)", "audiencia.homens", a.homens, "number", 'step="0.1" min="0" max="100"')}
        </div>
        <span class="rotulo">Faixa etária (%)</span>
        <div class="vte-idades">
          ${IDADES.map((f) => `<label class="campo"><span class="rotulo">${f}</span><input type="number" step="0.1" min="0" max="100" data-idade="${f}" value="${esc(idade(f))}"></label>`).join("")}
        </div>
        ${campo("Onde está o público", "audiencia.local", a.local)}
        ${campo("Fonte e data (aparece pequeno no site)", "audiencia.fonte", a.fonte)}
      </div>

      <div class="card vte-form">
        <h3>🎵 TikTok</h3>
        <div class="vte-linha-campos">
          ${campo("Usuário", "tiktok.usuario", tt.usuario)}
          ${campo("Views (ex.: 5 mil)", "tiktok.views", tt.views)}
          ${campo("Seguidores (se não tiver views)", "tiktok.seguidores", tt.seguidores)}
        </div>
        ${campo("Período (ex.: views em 28 dias, set/2026)", "tiktok.periodo", tt.periodo)}
      </div>

      <div class="card vte-form">
        <div class="vte-form-cab"><h3>🎬 Conteúdos com marcas</h3><button class="btn btn-sm" data-acao="parc-nova">${icone("mais", 14)} Adicionar</button></div>
        <p class="muted" style="margin-bottom:10px">Vídeo: link do Instagram, do YouTube ou de um arquivo .mp4. Capa: imagem vertical (envie ou cole o link).</p>
        ${(c.parcerias || []).map((p, i, todos) => `
          <div class="vte-parc" data-parc="${i}">
            <img class="port-thumb port-thumb-video" src="${esc(urlSite(p.capa))}" alt="" onerror="this.style.visibility='hidden'">
            <div class="vte-parc-campos">
              <div class="vte-linha-campos">
                <label class="campo"><span class="rotulo">Marca</span><input type="text" data-k="marca" value="${esc(p.marca)}"></label>
                <label class="campo"><span class="rotulo">Formato</span><select data-k="formato">${[...new Set([...FORMATOS, p.formato].filter(Boolean))].map((f) => `<option ${f === p.formato ? "selected" : ""}>${esc(f)}</option>`).join("")}</select></label>
              </div>
              <label class="campo"><span class="rotulo">Vídeo</span><input type="text" data-k="video" value="${esc(p.video)}" placeholder="https://www.instagram.com/reel/..."></label>
              <div class="vte-capa-linha">
                <label class="campo" style="flex:1"><span class="rotulo">Capa</span><input type="text" data-k="capa" value="${esc(p.capa)}"></label>
                <label class="btn btn-sm vte-enviar">📤 Enviar capa<input type="file" accept="image/*" data-enviar-capa="${i}" hidden></label>
              </div>
              <div class="vte-capa-linha">
                <label class="campo" style="flex:1"><span class="rotulo">Logo da marca (passa na faixa)</span><input type="text" data-k="logo" value="${esc(p.logo || "")}"></label>
                <label class="btn btn-sm vte-enviar">📤 Enviar logo<input type="file" accept="image/*" data-enviar-logo="${i}" hidden></label>
              </div>
            </div>
            <div class="port-acoes">
              <button class="btn-icone" data-acao="parc-mover" data-i="${i}" data-d="-1" ${i === 0 ? "disabled" : ""} aria-label="Subir" title="Subir">↑</button>
              <button class="btn-icone" data-acao="parc-mover" data-i="${i}" data-d="1" ${i === todos.length - 1 ? "disabled" : ""} aria-label="Descer" title="Descer">↓</button>
              <button class="btn-icone btn-perigo" data-acao="parc-apagar" data-i="${i}" aria-label="Apagar" title="Apagar">${icone("lixo", 15)}</button>
            </div>
          </div>`).join("") || `<p class="muted">Nenhum conteúdo ainda.</p>`}
      </div>

      <div class="card vte-form">
        <div class="vte-form-cab"><h3>💬 Comentários de destaque</h3>
          <span class="vte-cab-acoes">
            <button class="btn btn-sm" data-acao="coment-novo">${icone("mais", 14)} Comentário</button>
            <label class="btn btn-sm vte-enviar">📤 Print<input type="file" accept="image/*" data-enviar-coment hidden></label>
          </span></div>
        <p class="muted" style="margin-bottom:10px">Copie do Instagram o @ e o texto. No site eles viram cartões passando devagar. A etiqueta mostra pra marca o que o comentário prova (ex.: 🛒 Quer comprar).</p>
        <datalist id="vte-tags">${["🛒 Quer comprar", "⛺ Deu vontade de acampar", "📍 Quer conhecer o lugar", "👏 Elogio", "💡 Gostou da dica", "💡 Vai usar a dica", "💬 Se identificou"].map((t) => `<option value="${t}">`).join("")}</datalist>
        <div class="vte-coments-lista">
          ${(c.comentarios || []).map((k, i) => typeof k === "string" ? `
            <div class="vte-coment-linha" data-coment-tipo="print" data-src="${esc(k)}">
              <img class="vte-coment-print" src="${esc(urlSite(k))}" alt="" loading="lazy">
              <span class="muted" style="flex:1">Print (imagem)</span>
              <button class="btn-icone btn-perigo" data-acao="coment-apagar" data-i="${i}" aria-label="Tirar" title="Tirar">${icone("lixo", 15)}</button>
            </div>` : `
            <div class="vte-coment-linha" data-coment-tipo="cartao">
              <div class="vte-coment-campos">
                <div class="vte-linha-campos">
                  <label class="campo"><span class="rotulo">@ de quem comentou</span><input type="text" data-ck="usuario" value="${esc(k.usuario)}"></label>
                  <label class="campo"><span class="rotulo">Etiqueta</span><input type="text" list="vte-tags" data-ck="tag" value="${esc(k.tag)}"></label>
                </div>
                <label class="campo"><span class="rotulo">Comentário</span><textarea rows="2" data-ck="texto">${esc(k.texto)}</textarea></label>
              </div>
              <button class="btn-icone btn-perigo" data-acao="coment-apagar" data-i="${i}" aria-label="Tirar" title="Tirar">${icone("lixo", 15)}</button>
            </div>`).join("") || `<p class="muted">Nenhum comentário ainda.</p>`}
        </div>
      </div>

      <div class="card vte-form">
        <h3>📬 Contato</h3>
        <div class="vte-linha-campos">
          ${campo("E-mail", "contato.email", k.email, "email")}
          ${campo("WhatsApp (só números, com DDD)", "contato.whatsapp", k.whatsapp)}
        </div>
        <div class="vte-linha-campos">
          ${campo("Instagram (sem @)", "contato.instagram", k.instagram)}
          ${campo("TikTok (sem @)", "contato.tiktok", k.tiktok)}
          ${campo("Cidade", "contato.cidade", k.cidade)}
        </div>
      </div>

      <div class="vte-salvar">
        <a class="btn" href="${SITE}" target="_blank" rel="noopener">${icone("link", 15)} Ver site</a>
        <button class="btn btn-primario" data-acao="salvar">💾 Salvar mídia kit</button>
      </div>`;
  }

  // lê o que está escrito na tela de volta pro objeto "conteudo"
  function coletar() {
    const c = structuredClone(conteudo);
    const definir = (obj, caminho, v) => {
      const partes = caminho.split(".");
      let o = obj;
      partes.slice(0, -1).forEach((p) => { o[p] = o[p] && typeof o[p] === "object" ? o[p] : {}; o = o[p]; });
      o[partes[partes.length - 1]] = v;
    };
    el.querySelectorAll("[data-campo]").forEach((i) => {
      const v = i.type === "number" ? (i.value === "" ? null : Number(i.value)) : i.value.trim();
      definir(c, i.dataset.campo, v);
    });
    const temas = el.querySelector('[data-lista="temas"]');
    if (temas) c.temas = temas.value.split(",").map((t) => t.trim()).filter(Boolean);
    const idades = [...el.querySelectorAll("[data-idade]")];
    if (idades.length) {
      c.audiencia = c.audiencia || {};
      c.audiencia.idades = idades.filter((i) => i.value !== "").map((i) => ({ faixa: i.dataset.idade, pct: Number(i.value) }));
    }
    if (el.querySelector("[data-parc]") || (c.parcerias || []).length === 0) {
      c.parcerias = [...el.querySelectorAll("[data-parc]")].map((row) => {
        const g = (k) => row.querySelector(`[data-k="${k}"]`)?.value.trim() || "";
        return { marca: g("marca"), formato: g("formato"), video: g("video"), capa: g("capa"), logo: g("logo") };
      });
    }
    c.comentarios = [...el.querySelectorAll("[data-coment-tipo]")].map((x) => {
      if (x.dataset.comentTipo === "print") return x.dataset.src;
      const g = (k) => x.querySelector(`[data-ck="${k}"]`)?.value.trim() || "";
      return { usuario: g("usuario").replace(/^@/, ""), texto: g("texto"), tag: g("tag") };
    }).filter((k) => typeof k !== "string" || k);
    return c;
  }

  async function salvar() {
    conteudo = coletar();
    conteudo.parcerias = (conteudo.parcerias || []).filter((p) => p.marca || p.video);
    conteudo.comentarios = (conteudo.comentarios || []).filter((k) => typeof k === "string" || k.texto);
    const r = await Dados.salvarVte("conteudo", conteudo);
    if (r.erro) return toast(r.erro, "erro");
    dados.conteudo = conteudo;
    toast(r.local ? "Salvo neste navegador (teste local)." : "Mídia kit salvo. Já está no site.", "ok");
    desenhar();
  }

  async function atualizarAgora(b) {
    if (!Dados.usaSupabase()) return toast("Atualizar só funciona no painel no ar.", "aviso");
    b.disabled = true;
    b.textContent = "Puxando do Instagram...";
    const r = await Dados.funcao("vte-instagram");
    if (!r?.ok) {
      b.disabled = false;
      b.textContent = "🔄 Atualizar agora";
      return toast(r?.erro ? `Não deu: ${r.erro}` : "Não consegui falar com o robô agora. Confira se a função vte-instagram foi publicada.", "erro");
    }
    toast(`Atualizado: ${num(r.seguidores)} seguidores.`, "ok");
    const [d, h] = await Promise.all([Dados.lerVte(), Dados.historicoVte()]);
    if (d) dados = d;
    hist = h;
    desenhar();
  }

  // =================================================================
  // CLIQUES
  // =================================================================
  async function aoClicar(e) {
    const o = e.target.closest("[data-ordenar]");
    if (o) {
      const c = o.dataset.ordenar;
      ordemTabela = { campo: c, desc: ordemTabela.campo === c ? !ordemTabela.desc : true };
      return desenhar();
    }
    const b = e.target.closest("[data-acao]");
    if (!b || b.disabled) return;
    const a = b.dataset.acao;
    if (a === "atualizar") return atualizarAgora(b);
    if (a === "salvar") return salvar();
    if (a === "parc-nova") {
      conteudo = coletar();
      conteudo.parcerias = [...(conteudo.parcerias || []), { marca: "", formato: "Storytelling", video: "", capa: "" }];
      desenhar();
      el.querySelector("[data-parc]:last-of-type [data-k='marca']")?.focus();
      return;
    }
    if (a === "parc-apagar") {
      conteudo = coletar();
      const p = conteudo.parcerias[Number(b.dataset.i)];
      if (!confirm(`Tirar "${p?.marca || "este conteúdo"}" do mídia kit? (só vale depois de Salvar)`)) return;
      conteudo.parcerias.splice(Number(b.dataset.i), 1);
      return desenhar();
    }
    if (a === "parc-mover") {
      conteudo = coletar();
      const i = Number(b.dataset.i), j = i + Number(b.dataset.d);
      const l = conteudo.parcerias;
      if (j < 0 || j >= l.length) return;
      [l[i], l[j]] = [l[j], l[i]];
      return desenhar();
    }
    if (a === "coment-novo") {
      conteudo = coletar();
      conteudo.comentarios = [...(conteudo.comentarios || []), { usuario: "", texto: "", tag: "" }];
      desenhar();
      const linhas = el.querySelectorAll('[data-coment-tipo="cartao"]');
      linhas[linhas.length - 1]?.querySelector('[data-ck="usuario"]').focus();
      return;
    }
    if (a === "coment-apagar") {
      conteudo = coletar();
      conteudo.comentarios.splice(Number(b.dataset.i), 1);
      return desenhar();
    }
  }

  async function aoMudar(e) {
    const capa = e.target.closest("[data-enviar-capa]");
    const coment = e.target.closest("[data-enviar-coment]");
    const logo = e.target.closest("[data-enviar-logo]");
    if (!capa && !coment && !logo) return;
    const arquivo = e.target.files?.[0];
    if (!arquivo) return;
    toast("Enviando imagem...");
    const r = await Dados.enviarImagemPortfolio(arquivo, "vaiterestrada");
    if (r.erro) return toast(r.erro, "erro");
    conteudo = coletar();
    if (capa) conteudo.parcerias[Number(capa.dataset.enviarCapa)].capa = r.url;
    else if (logo) conteudo.parcerias[Number(logo.dataset.enviarLogo)].logo = r.url;
    else conteudo.comentarios = [...(conteudo.comentarios || []), r.url];
    desenhar();
    toast("Imagem pronta. Toque em Salvar pra ir pro site.", "ok");
  }

  return { abrirInstagram, abrirMidiaKit };
})();
