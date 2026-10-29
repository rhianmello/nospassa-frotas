// XRMOVI | Central de assinatura — todas as gravações passam por RPCs autenticadas.
// Nunca decide cotas pelo navegador: o banco aplica regras nas inserções.
export function setupSubscriptionPanel({client,getCompany,onCompanyCreated,onDataChanged,billingEnabled=false}){
 const root=document.getElementById('xrm-subscription-content');
 const nav=document.getElementById('xrm-subscriptions-nav');
 if(!root)return {refresh:async()=>{}};
 let current=null,loading=false,request=0;
 const money=v=>Number(v).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
 const formatDate=v=>v?new Date(v).toLocaleDateString('pt-BR'):'—';
 const text=(id,value)=>{const target=root.querySelector('#'+id);if(target)target.textContent=String(value);};
 const css=document.createElement('style');
 css.textContent=`
 .xrm-billing{display:grid;gap:18px;color:#dcedf5}.xrm-billing h2{margin:5px 0;font-size:clamp(25px,3vw,34px)}.xrm-billing p{color:#aac8da;margin:5px 0}
 .xrm-billing .xrm-billing-lead{max-width:760px;font-size:13px;line-height:1.7}
 .xrm-billing .xrm-plan-hero{padding:24px;border:1px solid #356e75;border-radius:18px;background:linear-gradient(115deg,#123b50,#102940)}
 .xrm-billing .xrm-plan-hero-head{display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;align-items:center}
 .xrm-billing .xrm-plan-pill{font-size:11px;letter-spacing:.2px;color:#60e5bf;border:1px solid #367e79;border-radius:99px;padding:6px 12px}
 .xrm-billing .xrm-plan-hero strong{font-size:26px;color:#f2fbff}
 .xrm-billing .xrm-plan-details{font-size:12px;color:#b8d2df;margin-top:12px}
 .xrm-billing .xrm-quotas{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:11px}
 .xrm-billing .xrm-quota{padding:16px;background:#102c41;border:1px solid #32516b;border-radius:13px;display:grid;gap:8px}
 .xrm-billing .xrm-quota small{font-size:11px;color:#b5cfe0}
 .xrm-billing .xrm-quota b{font-size:25px;color:#f7fdff}
 .xrm-billing .xrm-quota b em{font-size:13px;font-style:normal;color:#91afbf}
 .xrm-billing .xrm-bar{height:8px;overflow:hidden;background:#1b4557;border-radius:10px}
 .xrm-billing .xrm-bar span{display:block;background:#55ddb4;height:100%;max-width:100%;border-radius:10px}
 .xrm-billing .xrm-bar.critical span{background:#f7bb71}
 .xrm-billing .xrm-group{background:#0b273b;border:1px solid #32546a;border-radius:16px;padding:20px}
 .xrm-billing .xrm-group h3{margin:0 0 13px;font-size:17px;color:#f0fbff}
 .xrm-billing .xrm-company-cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:10px}
 .xrm-billing .xrm-company-card{background:#13364b;border:1px solid #365a6d;padding:14px;border-radius:11px}
 .xrm-billing .xrm-company-card b{display:block;margin-bottom:9px;font-size:13px}
 .xrm-billing .xrm-company-card small{color:#aac8d8;font-size:11px;line-height:1.6}
 .xrm-billing .xrm-actions-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}
 .xrm-billing form{display:grid;gap:11px;align-content:start}
 .xrm-billing label{display:grid;gap:6px;font-size:12px;font-weight:650;color:#cce4ee}
 .xrm-billing input,.xrm-billing select{width:100%;background:#0b2032;border:1px solid #45677d;border-radius:9px;color:white;padding:11px;font:13px system-ui;min-width:0}
 .xrm-billing button{cursor:pointer;border-radius:9px;border:1px solid #3d7885;padding:11px 14px;font-weight:700;background:#55ddae;color:#092633}
 .xrm-billing button.secondary{color:#daebf1;background:#174257}
 .xrm-billing button:disabled{opacity:.55;cursor:not-allowed}
 .xrm-billing .xrm-feedback{font-size:12px;line-height:1.6;min-height:18px;color:#8ddfc7}
 .xrm-billing .xrm-info{font-size:12px;line-height:1.65;color:#a9c7d7}
 .xrm-billing .xrm-error{color:#ffb7b7}
 .xrm-billing .xrm-billing-foot{font-size:12px;color:#aac7d7}
 @media(max-width:920px){.xrm-billing .xrm-quotas{grid-template-columns:repeat(2,minmax(0,1fr))}}
 @media(max-width:670px){.xrm-billing .xrm-actions-grid,.xrm-billing .xrm-quotas{grid-template-columns:1fr}}
 `;
 document.head.append(css);
 root.innerHTML=`
 <div class="xrm-billing">
  <header><p class="eyebrow">GESTÃO COMERCIAL</p><h2 tabindex="-1">Minha assinatura</h2><p class="xrm-billing-lead">Controle a capacidade contratada, distribua suas empresas e acompanhe os pedidos de alteração de plano.</p></header>
  <div id="xrm-bill-feedback" class="xrm-feedback" role="status" aria-live="polite">Consultando sua assinatura...</div>
  <section class="xrm-plan-hero"><div class="xrm-plan-hero-head"><div><span class="xrm-plan-pill" id="xrm-bill-status">Consultando</span><div><strong id="xrm-bill-plan">—</strong></div></div><b id="xrm-bill-price">—</b></div><div id="xrm-bill-details" class="xrm-plan-details"></div></section>
  <div id="xrm-bill-quotas" class="xrm-quotas" aria-label="Capacidade do plano"></div>
  <section class="xrm-group"><h3>Empresas vinculadas à assinatura</h3><div class="xrm-company-cards" id="xrm-bill-companies"></div><p class="xrm-info">Veículos e contratos são compartilhados no total da assinatura, mesmo quando há várias empresas.</p></section>
  <div class="xrm-actions-grid">
   <section class="xrm-group"><h3>Adicionar empresa</h3><form id="xrm-bill-company-form"><label>Nome da nova empresa<input name="company" required minlength="2" maxlength="160" placeholder="Ex.: Empresa de Transportes"></label><button type="submit">Cadastrar empresa</button></form><div class="xrm-feedback" id="xrm-bill-company-feedback" role="status"></div></section>
   <section class="xrm-group"><h3>Criar contrato</h3><form id="xrm-bill-contract-form"><label>Empresa<select name="company" required id="xrm-bill-contract-company"></select></label><label>Contrato<input name="name" required minlength="2" maxlength="160" placeholder="Ex.: Contrato Obra 02"></label><label>Cliente (opcional)<input name="client" maxlength="160"></label><label>Código (opcional)<input name="code" maxlength="60"></label><button type="submit" class="secondary">Adicionar contrato</button></form><div class="xrm-feedback" id="xrm-bill-contract-feedback" role="status"></div></section>
   <section class="xrm-group"><h3>Adicionar usuário</h3><form id="xrm-bill-member-form"><label>Empresa<select name="company" required id="xrm-bill-member-company"></select></label><label>E-mail cadastrado e confirmado<input type="email" name="email" required autocomplete="off" placeholder="usuario@empresa.com.br"></label><label>Permissão<select name="role"><option value="manager">Gestor</option><option value="driver">Motorista</option></select></label><button type="submit" class="secondary">Vincular usuário</button></form><div class="xrm-feedback" id="xrm-bill-member-feedback" role="status"></div><p class="xrm-info">O usuário precisa ter conta confirmada no XRMOVI. O número de usuários é independente do número de empresas.</p></section>
   <section class="xrm-group"><h3>Alterar plano</h3><form id="xrm-bill-plan-form"><label>Plano desejado<select name="plan" required><option value="start">Start — R$ 19,90</option><option value="pro">Pro — R$ 39,90</option><option value="business">Business — R$ 64,90</option><option value="advanced">Advanced — R$ 99,90</option></select></label><button type="submit">Solicitar mudança de plano</button><button type="button" class="secondary" id="xrm-bill-checkout">Pagar com Mercado Pago</button></form><div class="xrm-feedback" id="xrm-bill-plan-feedback" role="status"></div><p class="xrm-info">Solicitar um plano não ativa cobrança nem libera cotas extras. O pagamento é feito no Mercado Pago. Após a confirmação do pagamento, o plano e os limites são atualizados automaticamente. Enquanto a integração estiver indisponível, nenhuma cobrança será iniciada. Para Enterprise, entre em contato.</p></section>
  </div>
  <p class="xrm-billing-foot">Apenas o titular da assinatura pode gerenciar empresas, usuários e planos. Todas as alterações são validadas pelo servidor.</p>
 </div>`;
 const feedback=(id,message,error=false)=>{const node=root.querySelector('#'+id);if(node){node.textContent=message;node.classList.toggle('xrm-error',error)}};
 const run=async(form,action,callback)=>{
  const button=form.querySelector('button[type="submit"]');button.disabled=true;
  try{await action(new FormData(form));await refresh();if(callback)await callback()}catch(err){feedback(form.id.replace('-form','-feedback'),err?.message||'Não foi possível concluir a operação.',true)}
  finally{button.disabled=false}
 };
 root.querySelector('#xrm-bill-company-form').addEventListener('submit',async e=>{
  e.preventDefault();const form=e.currentTarget;await run(form,async data=>{
   const base=getCompany();if(!base)throw Error('Selecione uma empresa.');
   const {data:id,error}=await client.rpc('xrmovi_account_add_company',{cid:base.id,company_name:String(data.get('company')||'').trim()});
   if(error)throw error;
   feedback('xrm-bill-company-feedback','Empresa criada dentro da assinatura.');
   form.reset();await onCompanyCreated?.(id);
  });
 });
 root.querySelector('#xrm-bill-contract-form').addEventListener('submit',async e=>{
  e.preventDefault();const form=e.currentTarget;
  await run(form,async data=>{
   const {error}=await client.rpc('xrmovi_contract_create',{cid:String(data.get('company')),contract_name:String(data.get('name')),client:String(data.get('client')||''),code:String(data.get('code')||'')});
   if(error)throw error;feedback('xrm-bill-contract-feedback','Contrato criado. Agora vincule seus veículos.');
   form.elements.name.value='';form.elements.client.value='';form.elements.code.value='';
   await onDataChanged?.();
  });
 });
 root.querySelector('#xrm-bill-member-form').addEventListener('submit',async e=>{
  e.preventDefault();const form=e.currentTarget;
  await run(form,async data=>{
   const {error}=await client.rpc('xrmovi_account_add_member',{cid:String(data.get('company')),member_email:String(data.get('email')||''),member_role:String(data.get('role'))});
   if(error)throw error;feedback('xrm-bill-member-feedback','Usuário vinculado com sucesso.');form.elements.email.value='';
  });
 });
 root.querySelector('#xrm-bill-plan-form').addEventListener('submit',async e=>{
  e.preventDefault();const form=e.currentTarget;
  await run(form,async data=>{
   const base=getCompany();if(!base)throw Error('Selecione uma empresa.');
   const {error}=await client.rpc('xrmovi_account_request_plan',{cid:base.id,chosen_plan:String(data.get('plan'))});
   if(error)throw error;feedback('xrm-bill-plan-feedback','Solicitação registrada. Ainda não houve cobrança e o plano não foi alterado.');
  });
 });
 const checkoutButton=root.querySelector('#xrm-bill-checkout');
 let billingReady=false;
 const billingNotice=document.createElement('p');
 billingNotice.className='xrm-info';
 billingNotice.id='xrm-billing-readiness-message';
 checkoutButton.insertAdjacentElement('afterend',billingNotice);
 const checkoutState=(ready,message)=>{
  billingReady=Boolean(ready);
  checkoutButton.disabled=!billingReady;
  checkoutButton.title=billingReady?'Abrir checkout seguro do Mercado Pago':'Cobrança ainda não habilitada';
  checkoutButton.textContent=billingReady?'Assinar e pagar com Mercado Pago':'Pagamento aguardando configuração';
  billingNotice.textContent=message;
 };
 checkoutState(false,'Consultando a disponibilidade do Mercado Pago...');
 async function checkBillingReadiness(){
  try{
   const {data,error}=await client.functions.invoke('xrmovi-billing-readiness',{method:'GET'});
   if(error)throw error;
   checkoutState(data?.enabled===true,
    data?.enabled===true?'Pagamento recorrente disponível. Seu plano só será liberado após confirmação efetiva do Mercado Pago.':'Pagamento em configuração: o checkout será habilitado após a ativação segura do provedor.');
  }catch(err){
   checkoutState(false,'Serviço de cobrança indisponível neste momento. Tente atualizar a página.');
  }
 }
 void checkBillingReadiness();
 checkoutButton.addEventListener('click',async()=>{
  if(!billingReady)return;
  const base=getCompany();if(!base)return;
  checkoutButton.disabled=true;feedback('xrm-bill-plan-feedback','Preparando o pagamento no Mercado Pago...');
  try{
   const chosen=root.querySelector('#xrm-bill-plan-form select').value;
   const {data,error}=await client.functions.invoke('xrmovi-create-subscription',{
    body:{company_id:base.id,plan:chosen}
   });
   if(error){
    let description=error.message||'Não foi possível iniciar o checkout.';
    try{const detail=await error.context?.json?.();if(detail?.error)description=String(detail.error)}catch{}
    throw new Error(description);
   }
   const url=new URL(String(data?.checkout_url||''));
   if(url.protocol!=='https:'||!(url.hostname==='mercadopago.com.br'||url.hostname.endsWith('.mercadopago.com.br')||url.hostname==='mercadopago.com'||url.hostname.endsWith('.mercadopago.com')))
    throw new Error('O provedor retornou um endereço de pagamento inválido.');
   window.location.assign(url.href);
  }catch(err){
   feedback('xrm-bill-plan-feedback',err?.message||'Checkout indisponível.',true);
   checkoutButton.disabled=false;
  }
 });
 const selectCompanies=(id,companies,active)=>{
  const node=root.querySelector('#'+id);node.replaceChildren();
  companies.forEach(c=>{const opt=document.createElement('option');opt.value=c.id;opt.textContent=c.name;node.append(opt)});
  if(companies.some(c=>c.id===active))node.value=active;
 };
 function renderQuota(label,used,limit){
  const card=document.createElement('div');card.className='xrm-quota';
  const cap=limit==null?'Personalizado':String(limit);
  const pct=limit==null?0:Math.min(100,Math.round(used/Math.max(1,limit)*100));
  const title=document.createElement('small');title.textContent=label;
  const val=document.createElement('b');val.textContent=used+' / '+cap;
  const track=document.createElement('div');track.className='xrm-bar'+(pct>=90?' critical':'');
  const fill=document.createElement('span');fill.style.width=pct+'%';track.append(fill);
  card.append(title,val,track);return card;
 }
 function render(info){
  current=info;
  text('xrm-bill-plan',info.plan+' · '+(info.vehicle_limit??'sob medida')+' veículos');
  text('xrm-bill-price',info.price_brl==null?'Sob consulta':money(info.price_brl)+'/mês');
  const expired=info.status==='trial'&&info.trial_end&&new Date(info.trial_end)<new Date();
  text('xrm-bill-status',expired?'Teste expirado':info.status==='trial'?'Período de teste':info.status==='active'?'Ativa':info.status);
  text('xrm-bill-details',(info.trial_end&&info.status==='trial'?'Teste até '+formatDate(info.trial_end)+' · ':'')+'Limites totais da assinatura, não por empresa');
  const quotas=root.querySelector('#xrm-bill-quotas');quotas.replaceChildren(
   renderQuota('Empresas',info.companies_used,info.company_limit),
   renderQuota('Veículos',info.vehicles_used,info.vehicle_limit),
   renderQuota('Contratos',info.contracts_used,info.contract_limit),
   renderQuota('Usuários',info.seats_used,info.seat_limit)
  );
  const cards=root.querySelector('#xrm-bill-companies');cards.replaceChildren();
  for(const c of info.companies||[]){
   const card=document.createElement('div');card.className='xrm-company-card';
   const name=document.createElement('b');name.textContent=c.name;
   const metrics=document.createElement('small');metrics.textContent=c.vehicles+' veículos · '+c.contracts+' contratos · '+c.users+' usuários';
   card.append(name,metrics);cards.append(card);
  }
  selectCompanies('xrm-bill-contract-company',info.companies,getCompany()?.id);
  selectCompanies('xrm-bill-member-company',info.companies,getCompany()?.id);
  const companyForm=root.querySelector('#xrm-bill-company-form');
  companyForm.querySelector('button').disabled=info.company_limit!=null&&info.companies_used>=info.company_limit;
  const planSelect=root.querySelector('#xrm-bill-plan-form select');planSelect.value=info.plan_code;
  feedback('xrm-bill-feedback','Capacidade atualizada no banco de dados.');
 }
 async function refresh(){
  const base=getCompany();if(!base)return;
  const rid=++request;
  feedback('xrm-bill-feedback','Atualizando sua assinatura...');
  try{
   const {data,error}=await client.rpc('xrmovi_account_overview',{cid:base.id});
   if(rid!==request)return;
   if(error)throw error;
   render(data);
  }catch(err){
   if(rid!==request)return;
   current=null;
   root.querySelector('#xrm-bill-quotas').replaceChildren();
   root.querySelector('#xrm-bill-companies').replaceChildren();
   feedback('xrm-bill-feedback',err?.message||'Área comercial indisponível.',true);
  }
 }
 nav?.addEventListener('click',()=>{void refresh()});
 document.getElementById('fleet-mobile-view')?.addEventListener('change',e=>{if(e.target.value==='subscription')void refresh()});
 return {refresh};
}
