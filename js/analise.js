// =====================================================================
// analise.js: 🧭 Análise do perfil + ideias de conteúdo.
// A análise é escrita pelo Claude a partir das métricas e fica na tabela
// privada "analises" (uma linha por perfil, conteudo em JSON).
//   - 📌 Sua estratégia, ✨ Inspirações, 📰 Marketing e tendências
//   - 📅 Datas que estão chegando (calendário sazonal, abaixo)
//   - 💡 Ideias: ✍️ roteiro, ✏️ editar, 🗑️ excluir, 🗂️ mandar pro Quadro
// =====================================================================
window.Analise = (() => {
  const { esc, toast } = App;
  const NOMES = { nathalia: "Nathalia", vaiterestrada: "Vai Ter Estrada" };
  const ETAPAS = { topo: "🔝 Topo de funil", meio: "🎯 Meio de funil", fundo: "💰 Fundo de funil" };
  const EXPLICA = {
    topo: "atrai gente nova",
    meio: "mostra que você sabe o que faz",
    fundo: "chama pra ação: contratar, seguir, comentar",
  };
  // blocos do roteiro, no formato da Nath (cena + fala)
  const BLOCOS = ["Gancho", "Vinheta", "Parte 1: de onde veio", "Parte 2: a ideia", "Parte 3: como vira conteúdo", "Fechamento", "CTA"];

  // ---------- 📅 datas sazonais ----------
  // so: só pra um perfil ("vaiterestrada" / "nathalia"); sem "so" = os dois
  const DATAS = [
    { d: "2026-11-11", e: "🛍️", n: "11.11 (promoções)", dica: "Achadinhos e comparativos de preço; vídeo de \"o que vale a pena comprar\"." },
    { d: "2026-11-27", e: "🖤", n: "Black Friday", dica: "\"Vale a pena?\", o que eu compraria de novo, kits e presentes." },
    { d: "2026-11-30", e: "💻", n: "Cyber Monday", dica: "Última chamada de ofertas online; apps e serviços." },
    { d: "2026-12-12", e: "🛍️", n: "12.12 (promoções)", dica: "Presentes de Natal com desconto." },
    { d: "2026-12-21", e: "☀️", n: "Começo do verão", dica: "Protetor solar, cabelo no verão, casa fresquinha, viagens." },
    { d: "2026-12-25", e: "🎄", n: "Natal", dica: "Presentes, decoração, mesa posta, família reunida, jogos." },
    { d: "2026-12-31", e: "🥂", n: "Réveillon", dica: "Look e cabelo da virada, metas do ano, viagem de fim de ano." },
    { d: "2027-02-01", e: "🎒", n: "Volta às aulas", dica: "Rotina organizada, materiais, lancheira, apps de estudo." },
    { d: "2027-02-09", e: "🎉", n: "Carnaval", dica: "Cabelo e make que duram, kit de sobrevivência, viagem de feriado." },
    { d: "2027-03-08", e: "💜", n: "Dia da Mulher", dica: "Autocuidado, histórias de mulheres, presentes." },
    { d: "2027-03-15", e: "🛒", n: "Dia do Consumidor", dica: "Ofertas de março; marcas fazem campanha de desconto." },
    { d: "2027-03-28", e: "🐣", n: "Páscoa", dica: "Chocolates, receitas, mesa de Páscoa, presentes." },
    { d: "2027-05-09", e: "💐", n: "Dia das Mães", dica: "Presentes, beleza, casa, histórias com a mãe. Uma das maiores datas do varejo." },
    { d: "2027-06-05", e: "🌿", n: "Dia do Meio Ambiente", dica: "Natureza, consumo consciente, camping de baixo impacto.", so: "vaiterestrada" },
    { d: "2027-06-12", e: "❤️", n: "Dia dos Namorados", dica: "Presentes, programa a dois, jantar em casa, viagem de casal." },
    { d: "2027-06-24", e: "🌽", n: "Festas juninas", dica: "Comidas típicas, decoração, look de festa junina." },
    { d: "2027-07-01", e: "🧳", n: "Férias de julho", dica: "Viagens, roteiros, rotina com crianças em casa." },
    { d: "2027-07-20", e: "🤝", n: "Dia do Amigo", dica: "Presentes, rolês, \"marca a amiga\"." },
    { d: "2027-08-08", e: "👔", n: "Dia dos Pais", dica: "Presentes, histórias com o pai, churrasco." },
    { d: "2027-09-09", e: "🛍️", n: "9.9 (promoções)", dica: "Achadinhos e ofertas dos marketplaces." },
    { d: "2027-09-15", e: "🤗", n: "Dia do Cliente", dica: "Marcas fazem ação de relacionamento e desconto." },
    { d: "2027-09-27", e: "🗺️", n: "Dia Mundial do Turismo", dica: "Destinos, roteiros, hospedagens.", so: "vaiterestrada" },
    { d: "2027-10-01", e: "☕", n: "Dia Internacional do Café", dica: "Receitas, rotina da manhã, cafeteiras." },
    { d: "2027-10-12", e: "🧸", n: "Dia das Crianças", dica: "Brinquedos, jogos em família, passeios." },
    { d: "2027-11-11", e: "🛍️", n: "11.11 (promoções)", dica: "Achadinhos e comparativos de preço." },
    { d: "2027-11-26", e: "🖤", n: "Black Friday", dica: "\"Vale a pena?\", kits, presentes." },
    { d: "2027-12-25", e: "🎄", n: "Natal", dica: "Presentes, decoração, família reunida." },
  ];
  const DIA = 864e5;
  const pad = (n) => String(n).padStart(2, "0");
  const hojeIso = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
  const diasAte = (iso) => Math.round((Date.parse(iso + "T12:00:00") - Date.parse(hojeIso() + "T12:00:00")) / DIA);
  const dataBr = (s) => { const m = String(s || "").match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? `${m[3]}/${m[2]}/${m[1]}` : ""; };
  const diaMes = (s) => { const m = String(s || "").match(/^\d{4}-(\d{2})-(\d{2})/); return m ? `${m[2]}/${m[1]}` : ""; };

  function blocoDatas(perfil) {
    const proximas = DATAS.filter((x) => (!x.so || x.so === perfil) && diasAte(x.d) >= 0).slice(0, 8);
    if (!proximas.length) return "";
    return `
      <h2 class="secao-titulo">📅 Datas que estão chegando</h2>
      <p class="muted abord-dica" style="margin-top:-6px">Use pra criar conteúdo de época e pra puxar a data nas abordagens. Marcas fecham campanha de 4 a 8 semanas antes.</p>
      <div class="an-datas">${proximas.map((x) => {
        const n = diasAte(x.d);
        const abordar = n >= 14 && n <= 60;
        const conteudo = n < 14;
        return `
          <div class="card an-data ${abordar ? "abordar" : ""} ${conteudo ? "agora" : ""}">
            <div class="an-data-topo"><span class="an-data-emoji">${x.e}</span><span class="an-data-dia">${diaMes(x.d)}</span></div>
            <b>${esc(x.n)}</b>
            <span class="an-data-falta">${n === 0 ? "é hoje!" : n === 1 ? "amanhã" : `faltam ${n} dias`}</span>
            ${abordar ? `<span class="an-data-tag">🔔 hora de abordar marcas</span>` : conteudo ? `<span class="an-data-tag agora">🎬 hora de postar</span>` : ""}
            <p>${esc(x.dica)}</p>
          </div>`;
      }).join("")}</div>`;
  }

  // ideias com etapa ficam agrupadas (topo, meio, fundo); sem etapa, numa lista só
  function grupos(ideias) {
    const comIndice = ideias.map((x, i) => ({ x, i }));
    if (!ideias.some((x) => ETAPAS[x.etapa])) return [{ etapa: "", itens: comIndice }];
    const g = Object.keys(ETAPAS).map((etapa) => ({ etapa, itens: comIndice.filter(({ x }) => x.etapa === etapa) }));
    const outras = comIndice.filter(({ x }) => !ETAPAS[x.etapa]);
    if (outras.length) g.push({ etapa: "", itens: outras });
    return g.filter((x) => x.itens.length);
  }

  // 📌 estratégia do perfil (posicionamento, nome, bio, pilares, ritmo)
  function blocoEstrategia(e) {
    if (!e) return "";
    const linha = (rot, val) => (val ? `<div class="an-est-linha"><span class="rotulo">${esc(rot)}</span><div>${val}</div></div>` : "");
    return `
      <h2 class="secao-titulo">📌 Sua estratégia</h2>
      <div class="card an-estrategia">
        ${e.posicionamento ? `<p class="an-posicionamento">“${esc(e.posicionamento)}”</p>` : ""}
        <div class="an-est-grade">
          ${linha("Nome do perfil", e.nome ? `<b>${esc(e.nome)}</b>` : "")}
          ${linha("Bio", e.bio ? `<pre class="an-bio">${esc(e.bio)}</pre>` : "")}
          ${linha("Nicho", esc(e.nicho || ""))}
          ${linha("Onde o nicho aparece", e.onde_nicho?.length ? `<ul>${e.onde_nicho.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>` : "")}
          ${linha("Pra quem", e.publicos?.length ? `<ul>${e.publicos.map((x) => `<li><b>${esc(x.nome)}:</b> ${esc(x.texto)}</li>`).join("")}</ul>` : "")}
        </div>
        ${e.pilares?.length ? `
          <h3 class="an-est-sub">Pilares de conteúdo</h3>
          <div class="an-pilares">${e.pilares.map((p) => `
            <div class="an-pilar-card">
              <div class="an-pilar-cab"><b>${esc(p.nome)}</b>${p.pct ? `<span>${esc(p.pct)}</span>` : ""}</div>
              ${p.pct ? `<div class="an-pilar-barra"><i style="width:${parseInt(p.pct, 10) || 0}%"></i></div>` : ""}
              <p>${esc(p.texto || "")}</p>
            </div>`).join("")}</div>` : ""}
        ${e.ritmo ? `<p class="an-ritmo">🗓️ ${esc(e.ritmo)}</p>` : ""}
        ${e.medir ? `<p class="muted" style="margin:6px 0 0">📊 ${esc(e.medir)}</p>` : ""}
      </div>`;
  }

  // ✨ perfis que inspiram (conteúdo bom, comunidade, marcas encontram elas)
  function blocoInspiracoes(lista) {
    if (!lista?.length) return "";
    return `
      <h2 class="secao-titulo">✨ Inspirações</h2>
      <p class="muted abord-dica" style="margin-top:-6px">Criadoras que constroem comunidade e são encontradas pelas marcas. O que dá pra aprender (adaptando pro seu jeito, nunca copiando).</p>
      <div class="an-grade">${lista.map((p) => `
        <a class="card an-item an-inspira" href="https://www.instagram.com/${esc(String(p.perfil).replace(/^@/, ""))}/" target="_blank" rel="noopener">
          <h3>${esc(p.perfil)} ${p.seguidores ? `<span class="muted">· ${esc(p.seguidores)}</span>` : ""}</h3>
          <p>${esc(p.aprender || "")}</p>
        </a>`).join("")}</div>`;
  }

  // =================================================================
  // TELA
  // =================================================================
  let alvoAtual = null, perfilAtual = "", linha = null;

  async function render(alvo, perfil) {
    alvoAtual = alvo; perfilAtual = perfil;
    alvo.innerHTML = `<div class="card"><p class="muted">Carregando a análise...</p></div>`;
    const lista = await Dados.listar("analises");
    if (lista === null) {
      alvo.innerHTML = `<p class="alerta alerta-erro">Não consegui carregar a análise. Confira se o 26_analises.sql foi rodado e recarregue a página.</p>`;
      return;
    }
    linha = lista.find((x) => x.perfil === perfil) || null;
    alvo.onclick = aoClicar;
    desenhar();
  }

  function desenhar() {
    const alvo = alvoAtual, perfil = perfilAtual;
    const a = linha?.conteudo;
    if (!a || !a.resumo) {
      alvo.innerHTML = `
        <div class="card vazio"><div class="vazio-emoji">🧭</div><h2>Ainda não tem análise do ${esc(NOMES[perfil] || perfil)}</h2>
        <p>Peça pro Claude: "faz a análise do perfil". Ele lê as métricas, escreve o que está funcionando e traz ideias de conteúdo pra cá.</p></div>
        ${blocoDatas(perfil)}`;
      return;
    }
    const ideias = a.ideias || [];
    const bloco = (titulo, itens, cls) => itens?.length ? `
      <h2 class="secao-titulo">${titulo}</h2>
      <div class="an-grade">${itens.map((x) => `<div class="card an-item ${cls}"><h3>${esc(x.titulo)}</h3><p>${esc(x.texto)}</p></div>`).join("")}</div>` : "";
    alvo.innerHTML = `
      <div class="card an-resumo">
        <span class="an-data-txt">Análise de ${esc(dataBr(a.data))}</span>
        <h2>${esc(a.titulo || "Analisando o perfil...")}</h2>
        <p>${esc(a.resumo)}</p>
        ${a.numeros?.length ? `<div class="an-numeros">${a.numeros.map((n) => `<div><b>${esc(n.valor)}</b><span>${esc(n.rotulo)}</span>${n.nota ? `<em>${esc(n.nota)}</em>` : ""}</div>`).join("")}</div>` : ""}
      </div>
      ${blocoEstrategia(a.estrategia)}
      ${bloco("✅ O que está funcionando", a.funciona, "an-bom")}
      ${bloco("⚠️ Pontos de atenção", a.atencao, "an-atencao")}
      ${a.mercado?.length ? `
        <h2 class="secao-titulo">📰 Marketing e tendências ${a.tendencias_data ? `<span class="muted an-sub-data">· pesquisa de ${esc(dataBr(a.tendencias_data))}</span>` : ""}</h2>
        <div class="card an-mercado"><ul>${a.mercado.map((m) => `<li>${esc(m)}</li>`).join("")}</ul>
        ${a.ritmo && !a.estrategia ? `<p class="an-ritmo">🗓️ ${esc(a.ritmo)}</p>` : ""}</div>` : ""}
      ${blocoDatas(perfil)}
      ${blocoInspiracoes(a.inspiracoes)}
      <div class="an-ideias-cab">
        <h2 class="secao-titulo">💡 Ideias de conteúdo</h2>
        <button class="btn btn-sm btn-primario" data-ideia-acao="nova">＋ Nova ideia</button>
      </div>
      ${ideias.length ? grupos(ideias).map((g) => `
        ${g.etapa ? `<h3 class="an-etapa-titulo an-etapa-${g.etapa}">${ETAPAS[g.etapa]} <span class="muted">${esc(EXPLICA[g.etapa])}</span></h3>` : ""}
        <div class="an-ideias">${g.itens.map(({ x, i }) => cartaoIdeia(x, i)).join("")}</div>`).join("") : `<p class="muted">Nenhuma ideia ainda. Toque em "＋ Nova ideia".</p>`}
      <p class="muted abord-dica">Quer uma análise nova (com os números mais recentes) ou mais ideias? É só pedir pro Claude.</p>`;
  }

  function cartaoIdeia(x, i) {
    const temRoteiro = Array.isArray(x.roteiro) && x.roteiro.some((r) => r.fala || r.cena);
    return `
      <article class="card an-ideia">
        <div class="an-ideia-topo">
          ${x.pilar ? `<span class="chip an-pilar">${esc(x.pilar)}</span>` : ""}
          ${x.formato ? `<span class="chip">${esc(x.formato)}</span>` : ""}
          ${temRoteiro ? `<span class="chip an-com-roteiro">📝 roteiro pronto</span>` : ""}
        </div>
        <h3>${esc(x.titulo)}</h3>
        ${x.gancho ? `<p class="an-gancho">🪝 "${esc(x.gancho)}"</p>` : ""}
        ${x.porque ? `<p class="muted">${esc(x.porque)}</p>` : ""}
        <div class="an-ideia-acoes">
          <button class="btn btn-sm" data-ideia-acao="roteiro" data-i="${i}">✍️ ${temRoteiro ? "Ver roteiro" : "Criar roteiro"}</button>
          <button class="btn btn-sm" data-ideia-acao="quadro" data-i="${i}">🗂️ Mandar pro Quadro</button>
          <span style="flex:1"></span>
          <button class="btn-icone" data-ideia-acao="editar" data-i="${i}" title="Editar" aria-label="Editar ideia">✏️</button>
          <button class="btn-icone" data-ideia-acao="excluir" data-i="${i}" title="Excluir" aria-label="Excluir ideia">🗑️</button>
        </div>
      </article>`;
  }

  // =================================================================
  // SALVAR (a análise inteira fica numa linha só)
  // =================================================================
  async function salvarConteudo(msg) {
    const r = await Dados.salvar("analises", { ...linha, conteudo: linha.conteudo });
    if (r.erro) { toast(r.erro, "erro"); return false; }
    linha = r.row;
    if (msg) toast(msg, "ok");
    desenhar();
    return true;
  }

  function textoRoteiro(x) {
    if (!Array.isArray(x.roteiro)) return "";
    return x.roteiro.filter((r) => r.fala || r.cena)
      .map((r) => `${r.bloco.toUpperCase()}${r.cena ? `\n🎬 Cena: ${r.cena}` : ""}${r.fala ? `\n💬 Fala: ${r.fala}` : ""}`).join("\n\n");
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

  async function aoClicar(e) {
    const b = e.target.closest("[data-ideia-acao]");
    if (!b || !linha) return;
    const acao = b.dataset.ideiaAcao;
    const ideias = (linha.conteudo.ideias = linha.conteudo.ideias || []);
    if (acao === "nova") return janelaIdeia(null);
    const i = Number(b.dataset.i);
    const x = ideias[i];
    if (!x) return;
    if (acao === "editar") return janelaIdeia(i);
    if (acao === "roteiro") return janelaRoteiro(i);
    if (acao === "excluir") {
      if (!confirm(`Excluir a ideia "${x.titulo}"?`)) return;
      ideias.splice(i, 1);
      return salvarConteudo("Ideia excluída.");
    }
    if (acao === "quadro") {
      b.disabled = true;
      const notas = [x.pilar && `Pilar: ${x.pilar}`, ETAPAS[x.etapa] && `Etapa: ${ETAPAS[x.etapa]}`, x.formato && `Formato: ${x.formato}`,
        x.gancho && `Gancho: "${x.gancho}"`, x.porque, textoRoteiro(x) && `\n— ROTEIRO —\n${textoRoteiro(x)}`].filter(Boolean).join("\n");
      const r = await Dados.salvar("quadro_cartoes", {
        titulo: x.titulo, notas, coluna: "comecar", categoria: "conteudo", perfil: perfilAtual, prazo: null,
        ordem: -Date.now() / 1000, origem: "manual", origem_id: "", feito_em: null,
      });
      if (r.erro) { b.disabled = false; return toast(r.erro, "erro"); }
      b.textContent = "✓ Está no Quadro";
      toast("🗂️ Ideia foi pro Quadro, em Começar!", "ok");
    }
  }

  // ✏️ nova ideia / editar ideia
  function janelaIdeia(i) {
    const nova = i === null;
    const x = nova ? { etapa: "topo" } : linha.conteudo.ideias[i];
    const pilares = (linha.conteudo.estrategia?.pilares || []).map((p) => p.nome);
    abrirJanela(`
      <form class="modal">
        ${cab(nova ? "💡 Nova ideia" : "✏️ Editar ideia")}
        <label class="campo"><span class="rotulo">Ideia</span><input type="text" name="titulo" maxlength="140" required value="${esc(x.titulo || "")}" placeholder="Ex: Posso pesar o clima? (cachos)"></label>
        <label class="campo"><span class="rotulo">Gancho</span><input type="text" name="gancho" maxlength="300" value="${esc(x.gancho || "")}" placeholder="A primeira frase do vídeo"></label>
        <div class="linha-2">
          <label class="campo"><span class="rotulo">Etapa do funil</span><select name="etapa">
            ${Object.entries(ETAPAS).map(([v, t]) => `<option value="${v}" ${x.etapa === v ? "selected" : ""}>${t}</option>`).join("")}
            <option value="" ${!x.etapa ? "selected" : ""}>Sem etapa</option>
          </select></label>
          <label class="campo"><span class="rotulo">Formato</span><input type="text" name="formato" maxlength="60" value="${esc(x.formato || "")}" placeholder="Reels, Carrossel..."></label>
        </div>
        <label class="campo"><span class="rotulo">Pilar</span>${pilares.length ? `<select name="pilar"><option value="">Sem pilar</option>${pilares.map((p) => `<option ${x.pilar === p ? "selected" : ""}>${esc(p)}</option>`).join("")}</select>` : `<input type="text" name="pilar" maxlength="60" value="${esc(x.pilar || "")}">`}</label>
        <label class="campo"><span class="rotulo">Por que funciona (opcional)</span><textarea name="porque" rows="3">${esc(x.porque || "")}</textarea></label>
        <div class="modal-acoes"><span style="flex:1"></span><button type="button" class="btn" data-fechar>Cancelar</button><button type="submit" class="btn btn-primario">Salvar</button></div>
      </form>`, (fundo, fechar) => {
      const f = fundo.querySelector("form");
      f.titulo.focus();
      f.addEventListener("submit", async (ev) => {
        ev.preventDefault();
        const novo = { ...x, titulo: f.titulo.value.trim(), gancho: f.gancho.value.trim(), etapa: f.etapa.value, formato: f.formato.value.trim(), pilar: f.pilar.value.trim(), porque: f.porque.value.trim() };
        if (!novo.titulo) return;
        const ideias = (linha.conteudo.ideias = linha.conteudo.ideias || []);
        if (nova) ideias.unshift(novo); else ideias[i] = novo;
        if (await salvarConteudo(nova ? "💡 Ideia guardada!" : "Ideia salva.")) fechar();
      });
    });
  }

  // ✍️ roteiro no formato da Nath: bloco | cena | fala
  function janelaRoteiro(i) {
    const x = linha.conteudo.ideias[i];
    let linhas = Array.isArray(x.roteiro) && x.roteiro.length
      ? x.roteiro.map((r) => ({ ...r }))
      : BLOCOS.map((bloco) => ({ bloco, cena: "", fala: bloco === "Gancho" ? (x.gancho || "") : bloco === "Vinheta" && /mente de uma ugc/i.test(x.titulo) ? "Como funciona a mente de uma UGC?" : "" }));
    abrirJanela(`
      <form class="modal modal-largo an-roteiro-modal">
        ${cab(`✍️ Roteiro: ${x.titulo}`)}
        <p class="muted" style="margin-top:-6px">Escreva a cena (o que aparece) e a fala de cada bloco. Bloco vazio não entra.</p>
        <div data-linhas></div>
        <button type="button" class="btn btn-sm" data-mais>＋ Bloco</button>
        <div class="modal-acoes">
          <button type="button" class="btn" data-copiar>📋 Copiar</button>
          <span style="flex:1"></span>
          <button type="button" class="btn" data-fechar>Cancelar</button>
          <button type="submit" class="btn btn-primario">Salvar roteiro</button>
        </div>
      </form>`, (fundo, fechar) => {
      const f = fundo.querySelector("form");
      const caixa = fundo.querySelector("[data-linhas]");
      const ler = () => {
        caixa.querySelectorAll(".an-rot-linha").forEach((el, k) => {
          linhas[k] = { bloco: el.querySelector("[data-bloco]").value.trim() || `Bloco ${k + 1}`, cena: el.querySelector("[data-cena]").value.trim(), fala: el.querySelector("[data-fala]").value.trim() };
        });
      };
      const desenharLinhas = () => {
        caixa.innerHTML = linhas.map((r, k) => `
          <div class="an-rot-linha">
            <div class="an-rot-cab"><input type="text" data-bloco value="${esc(r.bloco)}" aria-label="Nome do bloco"><button type="button" class="btn-icone" data-tirar="${k}" title="Tirar bloco" aria-label="Tirar bloco">✕</button></div>
            <div class="linha-2">
              <label class="campo"><span class="rotulo">🎬 Cena</span><textarea data-cena rows="2" placeholder="O que aparece">${esc(r.cena || "")}</textarea></label>
              <label class="campo"><span class="rotulo">💬 Fala</span><textarea data-fala rows="2" placeholder="O que você fala">${esc(r.fala || "")}</textarea></label>
            </div>
          </div>`).join("");
      };
      desenharLinhas();
      fundo.querySelector("[data-mais]").addEventListener("click", () => { ler(); linhas.push({ bloco: "Novo bloco", cena: "", fala: "" }); desenharLinhas(); });
      caixa.addEventListener("click", (ev) => {
        const t = ev.target.closest("[data-tirar]");
        if (!t) return;
        ler(); linhas.splice(Number(t.dataset.tirar), 1); desenharLinhas();
      });
      fundo.querySelector("[data-copiar]").addEventListener("click", async () => {
        ler();
        const texto = `${x.titulo}\n\n${textoRoteiro({ roteiro: linhas })}`;
        try { await navigator.clipboard.writeText(texto); toast("Roteiro copiado.", "ok"); } catch { toast("Não deu pra copiar.", "erro"); }
      });
      f.addEventListener("submit", async (ev) => {
        ev.preventDefault();
        ler();
        x.roteiro = linhas.filter((r) => r.cena || r.fala);
        if (await salvarConteudo("📝 Roteiro salvo!")) fechar();
      });
    });
  }

  return { render };
})();
