// XRMOVI: painel gerencial de conversões verificadas pelo backend.
export function renderConversionsPanel(root, data) {
  root.replaceChildren();
  const el=(tag,text='',className='')=>{
    const node=document.createElement(tag);
    node.textContent=String(text??'');
    if(className)node.className=className;
    return node;
  };
  const n=v=>Number(v||0).toLocaleString('pt-BR');
  const money=v=>Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
  const header=el('section','','panel');
  const headerRow=el('div','','panel-head');
  headerRow.append(el('h2','Funil comercial — últimos 30 dias'),
                   el('small','Somente pagamentos confirmados pelo servidor'));
  header.append(headerRow);
  const metrics=el('div','','conversion-metrics');
  const kpis=[
    ['Contas criadas',n(data.accounts_created),'Não equivale a assinantes'],
    ['Tentativas de checkout',n(data.checkout_attempts),'Inclui cartão e Pix ainda pendentes'],
    ['Clientes que pagaram',n(data.paying_customers),'Contas distintas com pagamento aprovado'],
    ['Valor recebido',money(data.confirmed_revenue),'Somente pagamentos confirmados']
  ];
  for(const [label,value,note] of kpis){
    const metric=el('div','','conversion-metric');
    metric.append(el('span',label),el('strong',value),el('small',note));
    metrics.append(metric);
  }
  header.append(metrics);
  const foot=el('div','','conversion-note');
  foot.textContent=n(data.confirmed_payments)+' pagamento(s) confirmado(s) no período. '+
    n(data.active_verified_customers)+' cliente(s) atualmente ativo(s) com pagamento verificado. '+
    'Liberações manuais, testes grátis e checkouts abertos não são vendas.';
  header.append(foot);
  root.append(header);
  const panel=el('section','','panel');
  const panelHead=el('div','','panel-head');
  panelHead.append(el('h2','Origem dos clientes e vendas'),el('small','Atribuição inicial mediante consentimento'));
  panel.append(panelHead);
  const wrap=el('div','','table-wrap'),table=el('table'),thead=el('thead'),tr=el('tr');
  for(const name of ['Origem','Meio','Campanha','Cadastros','Clientes pagantes','Receita confirmada']){
    tr.append(el('th',name));
  }
  thead.append(tr);
  const body=el('tbody');
  for(const row of (Array.isArray(data.campaigns)?data.campaigns:[])){
    const item=el('tr');
    for(const value of [row.source,row.medium,row.campaign,n(row.signups),n(row.paying_customers),money(row.revenue)]){
      item.append(el('td',value));
    }
    body.append(item);
  }
  if(!body.children.length){
    const empty=el('td','Nenhuma campanha registrada neste período.');empty.colSpan=6;
    const item=el('tr');item.append(empty);body.append(item);
  }
  table.append(thead,body);wrap.append(table);panel.append(wrap);
  const note=el('p','Os parâmetros UTM são vinculados à conta somente após o usuário aceitar a análise e fazer login. A categoria “não atribuído” inclui cadastros anteriores a este controle e pessoas sem consentimento. Tráfego do Google Analytics não é tratado como venda.','','');
  note.className='conversion-note';
  panel.append(note);root.append(panel);
}
