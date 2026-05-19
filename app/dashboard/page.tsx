// ============================================================================
// app/dashboard/page.tsx
// Painel Operacional Central Farma — preserva visual exato da última versão
// validada, trocando o "const DATA = {...}" hardcoded por fetch('/api/payments').
// ============================================================================

import Script from 'next/script';

export const dynamic = 'force-dynamic';

export default function DashboardPage() {
  return (
    <>
      <Script src="https://cdn.jsdelivr.net/npm/chart.js" strategy="afterInteractive" />

      <style>{CSS}</style>

      <header>
        <h1>CENTRAL FARMA | PAINEL OPERACIONAL</h1>
        <p>Pagamentos por vendedora, janela de rota e ciclo de corte logístico</p>
      </header>

      <main>
        <section className="filters">
          <div className="filter-card"><label>Vendedora</label><select id="sellerFilter"></select></div>
          <div className="filter-card"><label>Rota</label><select id="routeFilter"></select></div>
          <div className="filter-card"><label>Tipo de Pagamento</label><select id="typeFilter"></select></div>
          <div className="filter-card"><label>Status Operacional</label><select id="statusFilter"></select></div>
          <div className="filter-card"><label>Busca</label><input id="searchInput" placeholder="Pedido ou cliente..." /></div>
        </section>

        <section className="kpis">
          <div className="card"><h3>Faturamento</h3><div className="value" id="kpiRevenue"></div></div>
          <div className="card"><h3>Pedidos</h3><div className="value" id="kpiOrders"></div></div>
          <div className="card"><h3>Ticket Médio</h3><div className="value" id="kpiTicket"></div></div>
          <div className="card"><h3>Top Vendedora</h3><div className="value" id="kpiTopSeller"></div><div className="small" id="kpiTopValue"></div></div>
          <div className="card"><h3>Pedidos Alocados</h3><div className="value">100%</div><div className="small">Todos os pedidos em rota</div></div>
          <div className="card delay"><h3>Atrasados</h3><div className="value" id="kpiDelayed"></div><div className="small" id="kpiDelayedValue"></div></div>
        </section>

        <section className="grid">
          <div className="panel">
            <h2>Ranking de Faturamento por Vendedora</h2>
            <canvas id="sellerChart"></canvas>
          </div>
          <div className="panel">
            <h2>Distribuição por Rota</h2>
            <canvas id="routeChart"></canvas>
            <div className="rule">
              <b>Regra aplicada:</b> todos os pagamentos anteriores à data de corte e os pagamentos até 10:30 da data atual entram na Rota 08h. Após 17:50, o pedido retorna para a próxima janela da Rota 08h.<br /><br />
              <span className="pill">Data de corte: <span id="cutoffDate"></span></span><br /><br />
              <span className="pill">Atualização operacional: <span id="operationalNow"></span></span>
            </div>
          </div>
        </section>

        <section className="tables">
          <div className="panel">
            <h2>Resumo por Vendedora</h2>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Vendedora</th><th>Quantidade</th><th className="num">Valor</th></tr></thead>
                <tbody id="sellerTable"></tbody>
              </table>
            </div>
          </div>
          <div className="panel">
            <h2>Detalhamento por Rota</h2>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Vendedora</th><th>Rota</th><th>Quantidade</th><th className="num">Valor</th></tr></thead>
                <tbody id="routeTable"></tbody>
              </table>
            </div>
          </div>
        </section>

        <section className="panel">
          <h2>Base de Pagamentos</h2>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Pedido</th><th>Cliente</th><th>Pago em</th><th>Tipo</th>
                  <th>Vendedora</th><th>Rota</th><th>Status</th><th className="num">Valor</th>
                </tr>
              </thead>
              <tbody id="detailTable"></tbody>
            </table>
          </div>
          <div className="footer">
            <span id="statusLine">Carregando dados em tempo real…</span>
            <span id="recordCount"></span>
          </div>
        </section>
      </main>

      <Script id="painel-script" strategy="afterInteractive">{SCRIPT}</Script>
    </>
  );
}

// ----------------------------------------------------------------------------
// CSS — preservado bit-by-bit do template validado
// ----------------------------------------------------------------------------
const CSS = `
:root{--navy:#142d4c;--blue:#1f4e79;--green:#2e8b57;--bg:#f4f6f8;--line:#e5e7eb;--muted:#6b7280;--red:#991b1b}
*{box-sizing:border-box}body{margin:0;font-family:Arial,Helvetica,sans-serif;background:var(--bg);color:#1f2933}
header{background:linear-gradient(135deg,var(--navy),var(--blue));color:white;padding:30px 38px}header h1{margin:0;font-size:29px}header p{margin:8px 0 0;color:#dbeafe}
main{padding:26px 36px;max-width:1540px;margin:auto}.filters,.kpis{display:grid;gap:16px;margin-bottom:22px}.filters{grid-template-columns:repeat(5,1fr)}.kpis{grid-template-columns:repeat(6,1fr)}
.card,.panel,.filter-card{background:white;border:1px solid var(--line);border-radius:18px;box-shadow:0 8px 24px rgba(15,23,42,.06)}.filter-card,.card,.panel{padding:18px}
label{display:block;font-size:12px;font-weight:700;color:var(--muted);text-transform:uppercase;margin-bottom:8px}select,input{width:100%;padding:10px;border:1px solid var(--line);border-radius:10px}
.card{min-height:112px;position:relative;overflow:hidden}.card:before{content:"";position:absolute;top:0;left:0;width:100%;height:5px;background:var(--green)}.card.delay:before{background:#dc2626}.card h3{margin:0 0 10px;font-size:12px;color:var(--muted);text-transform:uppercase}.value{font-size:27px;font-weight:800;color:var(--navy)}.small{font-size:13px;color:var(--muted)}
.grid,.tables{display:grid;gap:20px;margin-bottom:22px}.grid{grid-template-columns:1.1fr .9fr}.tables{grid-template-columns:1fr 1.2fr}.panel h2{margin:0 0 14px;color:var(--navy);font-size:18px}
canvas{max-height:340px!important}table{width:100%;border-collapse:collapse;font-size:13px}th{background:var(--green);color:white;padding:10px;text-align:left;position:sticky;top:0}td{padding:10px;border-bottom:1px solid var(--line)}td.num,th.num{text-align:right}.table-wrap{max-height:470px;overflow:auto;border:1px solid var(--line);border-radius:14px}
tr.atrasado{background:#fff1f2}.badge-delay,.badge-ok{padding:5px 10px;border-radius:999px;font-weight:800;font-size:12px}.badge-delay{background:#fee2e2;color:#991b1b}.badge-ok{background:#dcfce7;color:#166534}
.rule{margin-top:8px;padding:14px;border-radius:14px;background:#fff7ed;color:#7c2d12;border:1px solid #fed7aa;font-size:13px;line-height:1.45}.pill{display:inline-block;padding:4px 8px;border-radius:999px;background:#e8f5ee;color:#216b42;font-weight:700;font-size:12px}
.footer{display:flex;justify-content:space-between;color:var(--muted);font-size:12px;margin-top:12px}@media(max-width:1100px){.filters,.grid,.tables{grid-template-columns:1fr}.kpis{grid-template-columns:repeat(2,1fr)}}
`;

// ----------------------------------------------------------------------------
// SCRIPT — copiado do template validado, trocando o "const DATA = {...}" por fetch.
// ----------------------------------------------------------------------------
const SCRIPT = `
(function(){
  let DATA = {records:[], dataCorte:'--', agoraOperacional:'--'};
  let sellerChart, routeChart;
  const fmtMoney = v => "R$ " + (v||0).toLocaleString("pt-BR", {minimumFractionDigits:2, maximumFractionDigits:2});
  const unique = a => [...new Set(a)].filter(Boolean).sort((x,y) => x.localeCompare(y,"pt-BR"));

  function fillSelect(id, vals){
    document.getElementById(id).innerHTML = vals.map(v => '<option value="'+v+'">'+v+'</option>').join("");
  }
  function populateFilters(){
    fillSelect("sellerFilter", ["Todos", ...unique(DATA.records.map(d=>d.Criado_por))]);
    fillSelect("routeFilter",  ["Todas","Rota 08h","Rota 10h","Rota 14h","Rota 16h"]);
    fillSelect("typeFilter",   ["Todos", ...unique(DATA.records.map(d=>d.Tipo))]);
    fillSelect("statusFilter", ["Todos","No Prazo","Atrasado"]);
    document.getElementById("cutoffDate").textContent     = DATA.dataCorte;
    document.getElementById("operationalNow").textContent = DATA.agoraOperacional;
  }
  function getFiltered(){
    const s  = document.getElementById("sellerFilter").value;
    const r  = document.getElementById("routeFilter").value;
    const t  = document.getElementById("typeFilter").value;
    const st = document.getElementById("statusFilter").value;
    const q  = document.getElementById("searchInput").value.toLowerCase().trim();
    return DATA.records.filter(d =>
      (s === "Todos" || d.Criado_por === s) &&
      (r === "Todas" || d.Janela_Rota === r) &&
      (t === "Todos" || d.Tipo === t) &&
      (st === "Todos" || d.Status_Operacional === st) &&
      (!q || String(d.Pedido).toLowerCase().includes(q) || String(d.Cliente).toLowerCase().includes(q))
    );
  }
  function groupBy(arr, keys){
    const m = new Map();
    arr.forEach(d => {
      const k = keys.map(x => d[x]).join("||");
      if(!m.has(k)){ const o={}; keys.forEach(x=>o[x]=d[x]); o.Quantidade=0; o.Valor=0; m.set(k,o); }
      const it = m.get(k); it.Quantidade++; it.Valor += d.Valor;
    });
    return [...m.values()].sort((a,b) => b.Valor - a.Valor);
  }
  function updateKpis(data){
    const total   = data.reduce((s,d) => s + d.Valor, 0);
    const qtd     = data.length;
    const ticket  = qtd ? total/qtd : 0;
    const sellers = groupBy(data, ["Criado_por"]);
    const top     = sellers[0];
    const delayed = data.filter(d => d.Status_Operacional === "Atrasado");
    const dv      = delayed.reduce((s,d) => s + d.Valor, 0);
    document.getElementById("kpiRevenue").textContent      = fmtMoney(total);
    document.getElementById("kpiOrders").textContent       = qtd.toLocaleString("pt-BR");
    document.getElementById("kpiTicket").textContent       = fmtMoney(ticket);
    document.getElementById("kpiTopSeller").textContent    = top ? top.Criado_por : "-";
    document.getElementById("kpiTopValue").textContent     = top ? fmtMoney(top.Valor) : "";
    document.getElementById("kpiDelayed").textContent      = delayed.length.toLocaleString("pt-BR");
    document.getElementById("kpiDelayedValue").textContent = fmtMoney(dv);
    document.getElementById("recordCount").textContent     = qtd.toLocaleString("pt-BR") + " registros exibidos";
  }
  function renderTables(data){
    const sellers = groupBy(data, ["Criado_por"]);
    const routes  = groupBy(data, ["Criado_por","Janela_Rota"]);
    const detail  = [...data].sort((a,b) => (a.Pago_ordem||0) - (b.Pago_ordem||0));

    document.getElementById("sellerTable").innerHTML = sellers.map(d =>
      '<tr><td>'+d.Criado_por+'</td><td>'+d.Quantidade+'</td><td class="num">'+fmtMoney(d.Valor)+'</td></tr>'
    ).join("");

    document.getElementById("routeTable").innerHTML = routes.map(d =>
      '<tr><td>'+d.Criado_por+'</td><td>'+d.Janela_Rota+'</td><td>'+d.Quantidade+'</td><td class="num">'+fmtMoney(d.Valor)+'</td></tr>'
    ).join("");

    document.getElementById("detailTable").innerHTML = detail.map(d =>
      '<tr class="'+(d.Status_Operacional==="Atrasado"?"atrasado":"")+'">' +
        '<td>'+d.Pedido+'</td>' +
        '<td>'+d.Cliente+'</td>' +
        '<td>'+d.Pago_em+'</td>' +
        '<td>'+d.Tipo+'</td>' +
        '<td>'+d.Criado_por+'</td>' +
        '<td>'+d.Janela_Rota+'</td>' +
        '<td>'+(d.Status_Operacional==="Atrasado" ? '<span class="badge-delay">ATRASADO</span>' : '<span class="badge-ok">NO PRAZO</span>')+'</td>' +
        '<td class="num">'+fmtMoney(d.Valor)+'</td>' +
      '</tr>'
    ).join("");
  }
  function renderCharts(data){
    if(typeof Chart === 'undefined'){ setTimeout(() => renderCharts(data), 150); return; }
    const sellers = groupBy(data, ["Criado_por"]).slice(0,12);
    const routeOrder = ["Rota 08h","Rota 10h","Rota 14h","Rota 16h"];
    const rg = groupBy(data, ["Janela_Rota"]);
    const rm = Object.fromEntries(rg.map(d => [d.Janela_Rota, d.Quantidade]));
    if(sellerChart) sellerChart.destroy();
    if(routeChart)  routeChart.destroy();
    sellerChart = new Chart(document.getElementById("sellerChart"), {
      type: "bar",
      data: { labels: sellers.map(d=>d.Criado_por), datasets:[{ data: sellers.map(d=>d.Valor), backgroundColor:"#2e8b57", borderRadius:8 }] },
      options: { responsive:true, plugins:{ legend:{display:false} }, scales:{ y:{ ticks:{ callback: v => fmtMoney(v) } }, x:{ ticks:{ maxRotation:65, minRotation:40 } } } }
    });
    routeChart = new Chart(document.getElementById("routeChart"), {
      type: "doughnut",
      data: { labels: routeOrder, datasets:[{ data: routeOrder.map(r => rm[r] || 0), backgroundColor:["#1f4e79","#2e8b57","#f59e0b","#7c3aed"], borderWidth:3, borderColor:"#fff" }] },
      options: { responsive:true, plugins:{ legend:{position:"bottom"} } }
    });
  }
  function refresh(){
    const data = getFiltered();
    updateKpis(data); renderTables(data); renderCharts(data);
  }
  async function loadData(){
    const status = document.getElementById("statusLine");
    try {
      status.textContent = "Carregando dados em tempo real…";
      const res = await fetch("/api/payments", { cache: "no-store" });
      if(!res.ok) throw new Error("HTTP " + res.status + ": " + (await res.text()));
      DATA = await res.json();
      populateFilters();
      ["sellerFilter","routeFilter","typeFilter","statusFilter","searchInput"]
        .forEach(id => document.getElementById(id).addEventListener("input", refresh));
      refresh();
      status.textContent = "Atualizado em " + new Date().toLocaleString("pt-BR");
    } catch(e) {
      status.textContent = "Erro ao carregar: " + (e && e.message ? e.message : e);
      console.error(e);
    }
  }
  // Auto-refresh a cada 60s
  loadData();
  setInterval(loadData, 60_000);
})();
`;
