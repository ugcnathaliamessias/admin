// =====================================================================
// leads.js: sub-aba "Leads" do Instagram.
//   - Lista de quem interagiu (comentou, respondeu, tocou em botão)
//   - Busca, filtro por automação e origem
//   - Baixar em planilha (CSV, abre no Excel e no Google Planilhas)
//   - "Excluir dados": apaga tudo de uma pessoa (pedido de exclusão LGPD)
// =====================================================================
window.Leads = (() => {
  const { esc, icone, toast, num } = App;

  const ORIGENS = { comment: "Comentário", dm: "Direct", story_reply: "Resposta a story" };
  let el = null;
  let leads = [];
  let nomes = {};          // id da automação -> nome
  let filtro = { busca: "", auto: "", origem: "" };

  const dataHora = (s) => {
    if (!s) return "";
    const d = new Date(s);
    return d.toLocaleDateString("pt-BR") + " " + d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  };

  async function render(alvo) {
    el = alvo;
    if (!Dados.usaSupabase()) {
      el.innerHTML = `
        <div class="card vazio">
          <div class="vazio-icone">${icone("leads", 24)}</div>
          <h2>Seus leads aparecem aqui</h2>
          <p>Quando o sistema estiver no ar, cada pessoa que comentar a palavra e receber a DM aparece nesta lista, com busca e opção de baixar em planilha.</p>
        </div>`;
      return;
    }
    el.innerHTML = `<div class="card"><p class="muted">Carregando leads...</p></div>`;
    const [lista, autos] = await Promise.all([Dados.listarLeads(), Dados.listarAutomacoes()]);
    leads = lista;
    nomes = Object.fromEntries(autos.map((a) => [a.id, a.nome || a.keyword || "Automação"]));
    desenhar();
  }

  function filtrados() {
    const b = filtro.busca.trim().toLowerCase().replace(/^@/, "");
    return leads.filter((l) =>
      (!b || [l.username, l.email, l.telefone, l.last_keyword].some((v) => String(v || "").toLowerCase().includes(b))) &&
      (!filtro.auto || l.automation_id === filtro.auto) &&
      (!filtro.origem || l.last_source === filtro.origem)
    );
  }

  function desenhar() {
    const lista = filtrados();
    const opcoesAuto = Object.entries(nomes).map(([id, n]) => `<option value="${esc(id)}" ${filtro.auto === id ? "selected" : ""}>${esc(n)}</option>`).join("");
    const opcoesOrigem = Object.entries(ORIGENS).map(([v, t]) => `<option value="${v}" ${filtro.origem === v ? "selected" : ""}>${t}</option>`).join("");

    el.innerHTML = `
      <div class="cabecalho" style="margin-bottom:16px">
        <div>
          <h2>Leads</h2>
          <p class="muted">Pessoas que interagiram com as suas automações.</p>
        </div>
        <button class="btn" data-acao="csv" ${lista.length ? "" : "disabled"}>${icone("seta", 15)} Baixar planilha</button>
      </div>
      <div class="leads-filtros">
        <input type="text" data-filtro="busca" placeholder="Buscar por @, e-mail, telefone ou palavra" value="${esc(filtro.busca)}">
        <select data-filtro="auto"><option value="">Todas as automações</option>${opcoesAuto}</select>
        <select data-filtro="origem"><option value="">Todas as origens</option>${opcoesOrigem}</select>
      </div>
      <p class="muted leads-total">${num(lista.length)} de ${num(leads.length)} ${leads.length === 1 ? "pessoa" : "pessoas"}</p>
      ${lista.length ? `
        <div class="card leads-tabela-card">
          <table class="leads-tabela">
            <thead><tr>
              <th scope="col">Pessoa</th><th scope="col">Palavra</th><th scope="col">Automação</th>
              <th scope="col">Origem</th><th scope="col">Contato</th><th scope="col">Última interação</th><th scope="col"><span class="sr">Ações</span></th>
            </tr></thead>
            <tbody>${lista.map(linha).join("")}</tbody>
          </table>
        </div>` : `
        <div class="card vazio">
          <div class="vazio-icone">${icone("leads", 24)}</div>
          <h2>${leads.length ? "Ninguém com esse filtro" : "Nenhum lead ainda"}</h2>
          <p>${leads.length ? "Tente outra busca ou limpe os filtros." : "Quando alguém comentar a palavra de uma automação, aparece aqui."}</p>
        </div>`}`;

    // eventos
    el.querySelectorAll("[data-filtro]").forEach((c) => {
      c.addEventListener(c.tagName === "INPUT" ? "input" : "change", () => {
        filtro[c.dataset.filtro] = c.value;
        const pos = c.selectionStart;
        desenhar();
        const novo = el.querySelector(`[data-filtro="${c.dataset.filtro}"]`);
        novo.focus();
        if (c.tagName === "INPUT" && pos != null) novo.setSelectionRange(pos, pos);
      });
    });
    el.querySelector('[data-acao="csv"]')?.addEventListener("click", () => baixarCsv(lista));
    el.querySelectorAll('[data-acao="excluir"]').forEach((b) => b.addEventListener("click", () => excluir(b.dataset.id)));
  }

  function linha(l) {
    const usuario = l.username
      ? `<a href="https://www.instagram.com/${encodeURIComponent(l.username)}/" target="_blank" rel="noopener">@${esc(l.username)}</a>`
      : `<span class="muted">sem @</span>`;
    const contato = [l.email, l.telefone].filter(Boolean).map(esc).join("<br>") || `<span class="muted">-</span>`;
    return `
      <tr>
        <td data-rotulo="Pessoa">${usuario}</td>
        <td data-rotulo="Palavra">${l.last_keyword ? `<span class="chip">${esc(l.last_keyword === "*" ? "qualquer" : l.last_keyword)}</span>` : `<span class="muted">-</span>`}</td>
        <td data-rotulo="Automação">${esc(nomes[l.automation_id] || "-")}</td>
        <td data-rotulo="Origem">${esc(ORIGENS[l.last_source] || l.last_source || "-")}</td>
        <td data-rotulo="Contato">${contato}</td>
        <td data-rotulo="Última interação">${esc(dataHora(l.updated_at))}</td>
        <td class="leads-acoes"><button class="btn btn-sm btn-perigo" data-acao="excluir" data-id="${esc(l.ig_user_id)}" title="Apaga todos os dados desta pessoa">${icone("lixo", 14)} Excluir dados</button></td>
      </tr>`;
  }

  async function excluir(id) {
    const l = leads.find((x) => x.ig_user_id === id);
    const quem = l?.username ? "@" + l.username : "esta pessoa";
    if (!confirm(`Excluir TODOS os dados de ${quem}?\n\nApaga o contato, o histórico da conversa e os registros de envio. Use quando a pessoa pedir a exclusão (LGPD). Não dá pra desfazer.`)) return;
    const r = await Dados.excluirLead(id);
    if (r.erro) return toast(r.erro, "erro");
    leads = leads.filter((x) => x.ig_user_id !== id);
    toast(`Dados de ${quem} excluídos.`, "ok");
    desenhar();
  }

  // Planilha CSV com ";" e acentos (abre certinho no Excel em português)
  function baixarCsv(lista) {
    const cab = ["usuario", "id_instagram", "palavra", "automacao", "origem", "email", "telefone", "primeira_interacao", "ultima_interacao"];
    const cel = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const linhas = lista.map((l) => [
      l.username ? "@" + l.username : "", l.ig_user_id, l.last_keyword, nomes[l.automation_id] || "",
      ORIGENS[l.last_source] || l.last_source || "", l.email, l.telefone, dataHora(l.created_at), dataHora(l.updated_at),
    ].map(cel).join(";"));
    const csv = "﻿" + [cab.join(";"), ...linhas].join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `leads-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast(`Planilha com ${lista.length} ${lista.length === 1 ? "pessoa" : "pessoas"} baixada.`, "ok");
  }

  return { render };
})();
