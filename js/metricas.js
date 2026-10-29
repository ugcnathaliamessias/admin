// =====================================================================
// metricas.js: sub-aba "Métricas" do Instagram.
// Dados da função ig-insights (Instagram) e do banco (leads).
// =====================================================================
window.Metricas = (() => {
  const { esc, icone, num } = App;

  async function render(el) {
    el.innerHTML = `<div class="card"><p class="muted">Carregando métricas...</p></div>`;
    const [ins, leads] = await Promise.all([Dados.funcao("ig-insights"), Dados.leadsPorDia(15)]);

    if (!ins || !ins.connected) {
      el.innerHTML = `
        <div class="card vazio">
          <div class="vazio-icone">${icone("grafico", 24)}</div>
          <h2>Conecte seu Instagram pra ver as métricas</h2>
          <p>Assim que o Instagram estiver ligado (passo a passo no LEIA-ME), aqui aparecem seguidores, novos seguidores por dia, alcance e leads.</p>
          <button class="btn" id="ver-exemplo">Ver com dados de exemplo</button>
        </div>`;
      el.querySelector("#ver-exemplo").addEventListener("click", () => desenhar(el, exemplo(), true));
      return;
    }

    desenhar(el, { ...ins, leads_daily: leads }, false);
  }

  function desenhar(el, d, ehExemplo) {
    const soma = (s) => (s || []).reduce((t, x) => t + (x.value || 0), 0);
    const leads = d.leads_daily || Dados.serieVazia(15);
    const seguidoresDia = (d.followers_daily || []).slice(-15);
    const alcanceDia = (d.reach_daily || []).slice(-15);

    el.innerHTML = `
      ${ehExemplo ? `<p class="alerta alerta-atencao">Estes são <b>dados de exemplo</b>, só pra você ver como o painel fica. <button class="btn btn-texto btn-sm" id="voltar-vazio">Esconder exemplo</button></p>` : ""}
      ${d.account?.username ? `<p class="muted" style="margin-bottom:14px">Conta: <b>@${esc(d.account.username)}</b></p>` : ""}
      <div class="grade grade-3" style="grid-template-columns:repeat(auto-fit,minmax(200px,1fr))">
        ${kpi("Seguidores", num(d.account?.followers), "Total hoje")}
        ${seguidoresDia.length ? kpi("Novos seguidores", num(soma(seguidoresDia)), "Últimos 15 dias") : kpi("Novos seguidores", "indisponível", "Precisa da permissão de métricas do Meta")}
        ${alcanceDia.length ? kpi("Alcance", num(soma(alcanceDia)), "Últimos 15 dias") : kpi("Alcance", "indisponível", "Precisa da permissão de métricas do Meta")}
        ${kpi("Leads captados", num(soma(leads)), "Últimos 15 dias")}
      </div>
      <div class="grade grade-2" style="margin-top:16px">
        ${cartaoGrafico("Novos seguidores por dia", seguidoresDia)}
        ${cartaoGrafico("Alcance por dia", alcanceDia)}
        ${cartaoGrafico("Leads por dia", leads)}
      </div>`;
    el.querySelector("#voltar-vazio")?.addEventListener("click", () => render(el));
    el.querySelectorAll(".grafico").forEach(ligarDicas);
  }

  const kpi = (t, v, s) =>
    `<div class="card kpi"><span class="rotulo">${t}</span><div class="kpi-valor">${v}</div><div class="kpi-sub">${s}</div></div>`;

  // Gráfico de barras simples com dica no hover
  function cartaoGrafico(titulo, serie) {
    if (!serie?.length) {
      return `<div class="card"><h3>${titulo}</h3><p class="muted" style="margin-top:10px">Sem dados. Se continuar assim, falta a permissão de métricas (instagram_manage_insights) no app do Meta.</p></div>`;
    }
    const W = 300, H = 150, gap = 3;
    const max = Math.max(1, ...serie.map((p) => p.value));
    const bw = (W - gap * (serie.length - 1)) / serie.length;
    const barras = serie.map((p, i) => {
      const h = Math.max(2, (p.value / max) * (H - 4));
      const rotulo = `${dataCurta(p.date)}: ${num(p.value)}`;
      return `<rect class="barra" x="${(i * (bw + gap)).toFixed(2)}" y="${(H - h).toFixed(2)}" width="${bw.toFixed(2)}" height="${h.toFixed(2)}" rx="2" data-dica="${esc(rotulo)}"><title>${esc(rotulo)}</title></rect>`;
    }).join("");
    return `
      <div class="card">
        <h3>${titulo}</h3>
        <div class="grafico">
          <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="${titulo}">${barras}</svg>
          <div class="eixo"><span>${dataCurta(serie[0].date)}</span><span>${dataCurta(serie[serie.length - 1].date)}</span></div>
        </div>
      </div>`;
  }

  function ligarDicas(g) {
    const dica = document.createElement("div");
    dica.className = "dica";
    dica.hidden = true;
    g.appendChild(dica);
    g.querySelectorAll("rect.barra").forEach((r) => {
      r.querySelector("title")?.remove(); // usa a nossa dica em vez da nativa
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

  const dataCurta = (iso) => {
    const [, m, d] = String(iso).split("-");
    return d && m ? `${d}/${m}` : iso;
  };

  // Dados de exemplo (só pra visualizar o painel no teste local)
  function exemplo() {
    const serie = (base, var_) => Dados.serieVazia(15).map((p, i) => ({
      date: p.date, value: Math.max(0, Math.round(base + Math.sin(i / 2) * var_ + (i * var_) / 8)),
    }));
    return {
      account: { username: "sua_conta", followers: 12480 },
      followers_daily: serie(24, 10),
      reach_daily: serie(1800, 600),
      leads_daily: serie(8, 5),
    };
  }

  return { render };
})();
