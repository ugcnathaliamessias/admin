// =====================================================================
// analise.js: 🧭 Análise do perfil + ideias de conteúdo.
// A análise é escrita pelo Claude a partir das métricas e fica na tabela
// privada "analises" (uma linha por perfil). Cada ideia tem o botão
// "Mandar pro Quadro", que cria um cartão em Começar.
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
  // ideias com etapa ficam agrupadas (topo, meio, fundo); sem etapa, numa lista só
  function grupos(ideias) {
    const comIndice = ideias.map((x, i) => ({ x, i }));
    if (!ideias.some((x) => ETAPAS[x.etapa])) return [{ etapa: "", itens: comIndice }];
    const g = Object.keys(ETAPAS).map((etapa) => ({ etapa, itens: comIndice.filter(({ x }) => x.etapa === etapa) }));
    const outras = comIndice.filter(({ x }) => !ETAPAS[x.etapa]);
    if (outras.length) g.push({ etapa: "", itens: outras });
    return g.filter((x) => x.itens.length);
  }
  const dataBr = (s) => { const m = String(s || "").match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? `${m[3]}/${m[2]}/${m[1]}` : ""; };

  async function render(alvo, perfil) {
    alvo.innerHTML = `<div class="card"><p class="muted">Carregando a análise...</p></div>`;
    const lista = await Dados.listar("analises");
    if (lista === null) {
      alvo.innerHTML = `<p class="alerta alerta-erro">Não consegui carregar a análise. Confira se o 26_analises.sql foi rodado e recarregue a página.</p>`;
      return;
    }
    const a = (lista.find((x) => x.perfil === perfil) || {}).conteudo;
    if (!a || !a.resumo) {
      alvo.innerHTML = `
        <div class="card vazio"><div class="vazio-emoji">🧭</div><h2>Ainda não tem análise do ${esc(NOMES[perfil] || perfil)}</h2>
        <p>Peça pro Claude: "faz a análise do perfil". Ele lê as métricas, escreve o que está funcionando e traz ideias de conteúdo pra cá.</p></div>`;
      return;
    }
    const ideias = a.ideias || [];
    const bloco = (titulo, itens, cls) => itens?.length ? `
      <h2 class="secao-titulo">${titulo}</h2>
      <div class="an-grade">${itens.map((x) => `<div class="card an-item ${cls}"><h3>${esc(x.titulo)}</h3><p>${esc(x.texto)}</p></div>`).join("")}</div>` : "";
    alvo.innerHTML = `
      <div class="card an-resumo">
        <span class="an-data">Análise de ${esc(dataBr(a.data))}</span>
        <h2>${esc(a.titulo || "Analisando o perfil...")}</h2>
        <p>${esc(a.resumo)}</p>
        ${a.numeros?.length ? `<div class="an-numeros">${a.numeros.map((n) => `<div><b>${esc(n.valor)}</b><span>${esc(n.rotulo)}</span>${n.nota ? `<em>${esc(n.nota)}</em>` : ""}</div>`).join("")}</div>` : ""}
      </div>
      ${bloco("✅ O que está funcionando", a.funciona, "an-bom")}
      ${bloco("⚠️ Pontos de atenção", a.atencao, "an-atencao")}
      ${a.mercado?.length ? `
        <h2 class="secao-titulo">🌎 O momento e o mercado</h2>
        <div class="card an-mercado"><ul>${a.mercado.map((m) => `<li>${esc(m)}</li>`).join("")}</ul>
        ${a.ritmo ? `<p class="an-ritmo">🗓️ ${esc(a.ritmo)}</p>` : ""}</div>` : ""}
      ${ideias.length ? `
        <h2 class="secao-titulo">💡 Ideias de conteúdo</h2>
        ${grupos(ideias).map((g) => `
        ${g.etapa ? `<h3 class="an-etapa-titulo an-etapa-${g.etapa}">${ETAPAS[g.etapa]} <span class="muted">${esc(EXPLICA[g.etapa])}</span></h3>` : ""}
        <div class="an-ideias">${g.itens.map(({ x, i }) => `
          <article class="card an-ideia">
            <div class="an-ideia-topo">
              ${x.etapa && ETAPAS[x.etapa] ? `<span class="chip an-etapa an-etapa-${esc(x.etapa)}">${ETAPAS[x.etapa]}</span>` : ""}
              ${x.formato ? `<span class="chip">${esc(x.formato)}</span>` : ""}
            </div>
            <h3>${esc(x.titulo)}</h3>
            ${x.gancho ? `<p class="an-gancho">🪝 "${esc(x.gancho)}"</p>` : ""}
            ${x.porque ? `<p class="muted">${esc(x.porque)}</p>` : ""}
            <button class="btn btn-sm" data-pro-quadro="${i}">🗂️ Mandar pro Quadro</button>
          </article>`).join("")}
        </div>`).join("")}` : ""}
      <p class="muted abord-dica">Quer uma análise nova (com os números mais recentes) ou mais ideias? É só pedir pro Claude.</p>`;

    alvo.onclick = async (e) => {
      const b = e.target.closest("[data-pro-quadro]");
      if (!b) return;
      const x = ideias[Number(b.dataset.proQuadro)];
      if (!x) return;
      b.disabled = true;
      const notas = [x.formato && `Formato: ${x.formato}`, x.gancho && `Gancho: "${x.gancho}"`, x.porque].filter(Boolean).join("\n");
      const r = await Dados.salvar("quadro_cartoes", {
        titulo: x.titulo, notas, coluna: "comecar", categoria: "conteudo", perfil, prazo: null,
        ordem: -Date.now() / 1000, origem: "manual", origem_id: "", feito_em: null,
      });
      if (r.erro) { b.disabled = false; return toast(r.erro, "erro"); }
      b.textContent = "✓ Está no Quadro";
      toast("🗂️ Ideia foi pro Quadro, em Começar!", "ok");
    };
  }

  return { render };
})();
