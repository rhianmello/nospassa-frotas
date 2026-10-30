// XRMOVI | Cadastro guiado sem acesso operacional antes de pagamento.
// Valores e limites são fornecidos por xrmovi_list_plans no banco.
export async function showXrmoviOnboarding({login,client,onCreated,onLogout}){
 login.hidden=false;
 const form=login.querySelector('#v3login');
 form.classList.add('xrm-signup');
 form.style.cssText='display:grid;gap:0;width:min(940px,95vw);max-height:94vh;overflow:auto;background:#10283b;border:1px solid #386475;border-radius:18px;color:#effaff;padding:0;box-shadow:0 25px 80px #0009';
 const style=document.createElement('style');
 style.id='xrm-onboarding-styles';
 if(!document.getElementById(style.id)){
  style.textContent=`
  .xrm-signup *{box-sizing:border-box}.xrm-signup .wizard-head{padding:23px 26px;border-bottom:1px solid #31576c;display:flex;align-items:center;justify-content:space-between;gap:15px;flex-wrap:wrap}
  .xrm-signup .wizard-head strong{font-size:19px}.xrm-signup .wizard-head small{display:block;color:#81b3c5;margin-top:3px}
  .xrm-signup .wizard-body{display:grid;grid-template-columns:minmax(0,1.2fr) minmax(260px,.8fr);gap:19px;padding:24px}
  .xrm-signup .wizard-fields{display:grid;gap:15px}.xrm-signup .step{border:1px solid #33596e;border-radius:12px;padding:14px 16px;background:#0b2436;display:grid;gap:12px}
  .xrm-signup .step h3{margin:0;font-size:14px;color:#59e0c0}.xrm-signup label{display:grid;gap:6px;font-size:12px;color:#bad9e2}
  .xrm-signup input,.xrm-signup select{width:100%;border:1px solid #406a7a;background:#081a29;color:white;padding:12px;border-radius:9px;outline-offset:2px;min-width:0}
  .xrm-signup .plan-preview{background:linear-gradient(150deg,#153e4a,#12283a);border:1px solid #36847c;border-radius:14px;padding:21px;align-self:start;display:grid;gap:13px}
  .xrm-signup .plan-preview strong{font-size:28px;color:#77f0cc}.xrm-signup .limits{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
  .xrm-signup .limits div{padding:13px;border:1px solid #3b6970;border-radius:11px;background:#102c39}.xrm-signup .limits b{display:block;font-size:25px;color:white}.xrm-signup .limits small{font-size:11px;color:#afd3da}
  .xrm-signup .wizard-actions{display:grid;gap:9px}.xrm-signup .wizard-submit{border:0;border-radius:9px;background:#51ddb7;color:#042f35;font-weight:900;padding:15px;cursor:pointer}
  .xrm-signup .wizard-submit:disabled{opacity:.5;cursor:not-allowed}.xrm-signup .wizard-note{color:#a4c4d2;font-size:11px;line-height:1.55}
  .xrm-signup .wizard-msg{font-size:12px;min-height:20px;color:#ffbaaa}.xrm-signup .wizard-exit{background:transparent;color:#c7dee7;border:1px solid #48697a;border-radius:8px;padding:9px 12px;cursor:pointer}
  @media(max-width:760px){.xrm-signup .wizard-body{grid-template-columns:1fr;padding:14px}.xrm-signup .wizard-head{padding:17px}.xrm-signup .plan-preview{order:-1}.xrm-signup .limits b{font-size:22px}}
  `;
  document.head.append(style);
 }
 form.innerHTML=`
  <div class="wizard-head"><div><strong>Bem-vindo ao XRMOVI</strong><small>Cadastro inicial · empresa, contrato, assinatura</small></div><button type="button" class="wizard-exit">Sair da conta</button></div>
  <div class="wizard-body">
  <div class="wizard-fields">
  <section class="step"><h3>01 · Sua empresa</h3><label>Nome da empresa<input name="company" required minlength="2" maxlength="160" autocomplete="organization" placeholder="Ex.: Transportadora Santos"></label></section>
  <section class="step"><h3>02 · Primeiro contrato</h3><label>Nome do contrato<input name="contract" required minlength="2" maxlength="160" placeholder="Ex.: Frota Matriz"></label><label>Cliente / contratante (opcional)<input name="customer" maxlength="160" placeholder="Ex.: Empresa XYZ"></label><label>Código do contrato (opcional)<input name="code" maxlength="60" placeholder="Ex.: CT-2026-001"></label></section>
  <section class="step"><h3>03 · Escolha sua assinatura</h3><label>Plano mensal<select name="plan" required disabled><option value="">Carregando planos...</option></select></label></section>
  <div class="wizard-actions"><button type="submit" class="wizard-submit" disabled>Criar cadastro e continuar para pagamento</button><small class="wizard-note">O cadastro não realiza cobrança. O Mercado Pago mostra o valor antes da confirmação. Veículos e operações ficam bloqueados até o pagamento ser aprovado.</small><div class="wizard-msg" role="status" aria-live="polite"></div></div>
  </div>
  <aside class="plan-preview" aria-live="polite"><span style="color:#9de5d5;font-size:11px;font-weight:800;letter-spacing:1.3px">O QUE ESTÁ INCLUÍDO</span><div><div data-plan-title style="font-weight:800">Selecione um plano</div><strong data-plan-price>—</strong><small style="color:#acd0da"> / mês</small></div><div class="limits" data-limits></div><small style="color:#a9ccd1">Limites totais compartilhados entre as empresas da assinatura, não multiplicados por contrato.</small></aside>
  </div>`;
 const elements=form.elements, select=elements.namedItem('plan'), submit=form.querySelector('.wizard-submit'), status=form.querySelector('.wizard-msg');
 form.querySelector('.wizard-exit').onclick=onLogout;
 let plans=[];
 const showPlan=()=>{
  const p=plans.find(x=>x.code===select.value);
  form.querySelector('[data-plan-title]').textContent=p?.title||'Selecione um plano';
  form.querySelector('[data-plan-price]').textContent=p?.monthly_brl!=null?Number(p.monthly_brl).toLocaleString('pt-BR',{style:'currency',currency:'BRL'}):'—';
  const host=form.querySelector('[data-limits]');host.replaceChildren();
  for(const [name,value] of [['Empresas',p?.company_limit],['Contratos',p?.contract_limit],['Veículos',p?.vehicle_limit],['Logins',p?.seat_limit]]){
   const card=document.createElement('div'),val=document.createElement('b'),label=document.createElement('small');
   val.textContent=value==null?'—':String(value);label.textContent=name;card.append(val,label);host.append(card);
  }
 };
 select.onchange=showPlan;
 try{
  const {data,error}=await client.rpc('xrmovi_list_plans');
  if(error)throw error;
  plans=(Array.isArray(data)?data:[]).filter(p=>['start','pro','business','advanced'].includes(p.code)&&p.monthly_brl!=null);
  if(!plans.length)throw Error('Planos indisponíveis no momento.');
  select.replaceChildren();
  for(const p of plans){const option=document.createElement('option');option.value=p.code;option.textContent=p.title+' — '+Number(p.monthly_brl).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})+'/mês';select.append(option)}
  select.disabled=false;submit.disabled=false;showPlan();
 }catch(err){status.textContent='Não foi possível consultar os planos: '+err.message}
 form.onsubmit=async event=>{
  event.preventDefault();
  if(submit.disabled)return;
  submit.disabled=true;status.textContent='Criando cadastro e contrato...';
  const plan=String(select.value);
  try{
   const {data,error}=await client.rpc('xrmovi_onboarding_complete',{
    company_name:String(elements.namedItem('company').value).trim(),
    contract_name:String(elements.namedItem('contract').value).trim(),
    chosen_plan:plan,
    contract_client:String(elements.namedItem('customer').value).trim(),
    contract_code:String(elements.namedItem('code').value).trim()
   });
   if(error)throw error;
   // Leave onboarding immediately; no operational dashboard until payment.
   login.hidden=true;
   await onCreated(data);
   const readiness=await client.functions.invoke('xrmovi-billing-readiness',{method:'GET'});
   if(readiness.error||readiness.data?.enabled!==true)return;
   const checkout=await client.functions.invoke('xrmovi-create-subscription',{body:{company_id:data.company_id,plan}});
   if(checkout.error)throw checkout.error;
   const url=new URL(String(checkout.data?.checkout_url||''));
   if(url.protocol!=='https:'||!['mercadopago.com','mercadopago.com.br'].some(h=>url.hostname===h||url.hostname.endsWith('.'+h)))throw Error('URL de pagamento inválida.');
   window.location.assign(url.href);
  }catch(err){
   if(!login.hidden){status.textContent=err?.message||'Cadastro indisponível';submit.disabled=false}
   else {
    const messages=document.getElementById('xrm-bill-plan-feedback');
    if(messages)messages.textContent='Cadastro concluído. Abra o pagamento no plano escolhido. '+(err?.message||'');
   }
  }
 };
}
