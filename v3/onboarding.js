// XRMOVI | Cadastro guiado sem acesso operacional antes de pagamento.
// Valores e limites são fornecidos por xrmovi_list_plans no banco.
export async function showXrmoviOnboarding({login,client,onCreated,onLogout,existing=null}){
 login.hidden=false;
 login.classList.add('xrm-onboarding-overlay');
 login.style.cssText='';
 const form=login.querySelector('#v3login');
 form.classList.add('xrm-signup');
 form.style.cssText='';
 form.innerHTML="\n  <header class=\"wizard-header\">\n   <div class=\"wizard-brand\">\n    <span class=\"wizard-brand-symbol\" aria-hidden=\"true\">X</span>\n    <div><b>XRMOVI</b><small>Plataforma inteligente de frotas</small></div>\n   </div>\n   <button type=\"button\" class=\"wizard-exit\" aria-label=\"Encerrar sessão e sair do cadastro\"><span aria-hidden=\"true\">↗</span> Sair da conta</button>\n  </header>\n  <div class=\"wizard-intro\">\n   <div class=\"wizard-eyebrow\">Sua operação começa aqui</div>\n   <h1>Configure sua frota.<br><em>O controle começa agora.</em></h1>\n   <p>Defina sua empresa, organize o primeiro contrato e escolha a capacidade ideal. Tudo preparado para começar assim que o pagamento for confirmado.</p>\n  </div>\n  <div class=\"wizard-journey\" aria-label=\"Etapas do cadastro\">\n   <div class=\"wizard-journey-step\" data-journey=\"1\" data-active=\"true\"><span class=\"journey-number\">01</span><span>Empresa</span></div>\n   <div class=\"wizard-journey-step\" data-journey=\"2\" data-active=\"false\"><span class=\"journey-number\">02</span><span>Contrato</span></div>\n   <div class=\"wizard-journey-step\" data-journey=\"3\" data-active=\"false\"><span class=\"journey-number\">03</span><span>Assinatura</span></div>\n  </div>\n  <div class=\"wizard-body\">\n   <div class=\"wizard-fields\">\n    <section class=\"step\" data-wizard-step=\"1\" aria-labelledby=\"step-company-title\">\n     <header class=\"step-heading\"><span class=\"step-number\">01</span><div><h3 id=\"step-company-title\">Dados da empresa</h3><p>Quem será o titular desta assinatura?</p></div></header>\n     <label>Nome da empresa<input name=\"company\" required minlength=\"2\" maxlength=\"160\" autocomplete=\"organization\" placeholder=\"Ex.: Transportadora Santos\"></label>\n    </section>\n    <section class=\"step\" data-wizard-step=\"2\" aria-labelledby=\"step-contract-title\">\n     <header class=\"step-heading\"><span class=\"step-number\">02</span><div><h3 id=\"step-contract-title\">Seu primeiro contrato</h3><p>Organize a estrutura inicial da frota</p></div></header>\n     <label>Nome do contrato<input name=\"contract\" required minlength=\"2\" maxlength=\"160\" placeholder=\"Ex.: Frota Matriz\"></label>\n     <div class=\"step-input-grid\">\n      <label>Cliente / contratante <span class=\"optional\">Opcional</span><input name=\"customer\" maxlength=\"160\" placeholder=\"Ex.: Empresa XYZ\"></label>\n      <label>Código do contrato <span class=\"optional\">Opcional</span><input name=\"code\" maxlength=\"60\" placeholder=\"Ex.: CT-2026-001\"></label>\n     </div>\n    </section>\n    <section class=\"step\" data-wizard-step=\"3\" aria-labelledby=\"step-plan-title\">\n     <header class=\"step-heading\"><span class=\"step-number\">03</span><div><h3 id=\"step-plan-title\">Escolha sua assinatura</h3><p>Você pode mudar de plano conforme a frota crescer</p></div></header>\n     <label>Plano mensal<select name=\"plan\" required disabled><option value=\"\">Carregando os planos...</option></select></label>\n    </section>\n    <div class=\"wizard-actions\">\n     <button type=\"submit\" class=\"wizard-submit\" disabled><span data-action-label>Continuar para o pagamento</span><span class=\"wizard-submit-arrow\" aria-hidden=\"true\">›</span></button>\n     <p class=\"wizard-note\"><span class=\"wizard-note-dot\" aria-hidden=\"true\">●</span><span>Cadastro sem cobrança imediata. O Mercado Pago apresenta as condições antes de confirmar. O painel operacional é liberado após pagamento aprovado.</span></p>\n     <p class=\"wizard-msg\" role=\"status\" aria-live=\"polite\"></p>\n    </div>\n   </div>\n   <aside class=\"plan-preview\" aria-label=\"Resumo da assinatura escolhida\" aria-live=\"polite\">\n    <div class=\"preview-top\">\n     <span class=\"preview-label\">Sua assinatura</span>\n     <div class=\"preview-plan\" data-plan-title>Selecione um plano</div>\n     <div class=\"preview-price-line\"><strong data-plan-price>—</strong><small>/ mês</small></div>\n    </div>\n    <div class=\"preview-rule\" aria-hidden=\"true\"></div>\n    <div class=\"preview-cap\">\n     <p class=\"preview-cap-title\">Capacidade incluída</p>\n     <div class=\"limits\" data-limits></div>\n    </div>\n    <div class=\"preview-summary\">\n     <span>Resumo do cadastro</span>\n     <div class=\"preview-summary-row\"><small>Empresa</small><strong data-summary-company>Não informado</strong></div>\n     <div class=\"preview-summary-row\"><small>Contrato</small><strong data-summary-contract>Não informado</strong></div>\n    </div>\n    <div class=\"preview-footer\"><span class=\"preview-footer-mark\" aria-hidden=\"true\">✓</span><span>Limites compartilhados entre as empresas, não multiplicados por contrato. Sem acesso operacional antes da confirmação do pagamento.</span></div>\n   </aside>\n  </div>";
 const elements=form.elements, select=elements.namedItem('plan'), submit=form.querySelector('.wizard-submit'), status=form.querySelector('.wizard-msg');

 const setSummary=()=>{
  const companyName=String(elements.namedItem('company').value||'').trim();
  const contractName=String(elements.namedItem('contract').value||'').trim();
  form.querySelector('[data-summary-company]').textContent=companyName||'Não informado';
  form.querySelector('[data-summary-contract]').textContent=contractName||'Não informado';
 };
 for(const field of ['company','contract'])elements.namedItem(field).addEventListener('input',setSummary);
 const setStep=(number)=>{
  for(const tab of form.querySelectorAll('[data-journey]'))tab.dataset.active=String(tab.dataset.journey===String(number));
 };
 for(const step of form.querySelectorAll('[data-wizard-step]')){
  step.addEventListener('focusin',()=>setStep(step.dataset.wizardStep));
 }
 elements.namedItem('plan').addEventListener('change',()=>setStep(3));
 setSummary();

 form.querySelector('.wizard-exit').onclick=onLogout;
 let plans=[];
 let pendingSnapshot=null;
 if(existing?.id){
  try{
   const {data,error}=await client.rpc('xrmovi_onboarding_snapshot',{cid:existing.id});
   if(error)throw error;
   pendingSnapshot=data;
   form.elements.namedItem('company').value=String(data.company_name||existing.name||'');
   form.elements.namedItem('contract').value=String(data.contract_name||'');
   form.elements.namedItem('customer').value=String(data.contract_client||'');
   form.elements.namedItem('code').value=String(data.contract_code||'');
   setSummary();
  }catch(error){status.textContent='Não foi possível recuperar o cadastro anterior: '+error.message;}
 }

 const showPlan=()=>{
  const p=plans.find(x=>x.code===select.value);
  form.querySelector('[data-plan-title]').textContent=p?.title||'Selecione um plano';
  form.querySelector('[data-plan-price]').textContent=p?.monthly_brl!=null?Number(p.monthly_brl).toLocaleString('pt-BR',{style:'currency',currency:'BRL'}):'—';
  const host=form.querySelector('[data-limits]');host.replaceChildren();
  for(const [name,value] of [['Empresas',p?.company_limit],['Contratos',p?.contract_limit],['Veículos',p?.vehicle_limit],['Logins',p?.seat_limit]]){
   const card=document.createElement('div'),val=document.createElement('b'),label=document.createElement('small');card.className='limit-tile';
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
  if(pendingSnapshot&&plans.some(p=>p.code===pendingSnapshot.plan))select.value=pendingSnapshot.plan;
  select.disabled=false;submit.disabled=false;showPlan();
 }catch(err){status.textContent='Não foi possível consultar os planos: '+err.message}
 form.onsubmit=async event=>{
  event.preventDefault();
  if(submit.disabled)return;
  submit.disabled=true;status.textContent='Salvando cadastro com segurança...';
  const plan=String(select.value);
  try{
   const {data,error}=await client.rpc(existing?.id?'xrmovi_onboarding_update':'xrmovi_onboarding_complete',{
    ...(existing?.id?{cid:existing.id}:{}),
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
   if(checkout.error){
    let msg=checkout.error.name==='FunctionsFetchError'
     ?'Falha de conexão com o Supabase. Seu cadastro foi preservado; abra Minha assinatura e tente pagar novamente.'
     :(checkout.error.message||'Não foi possível iniciar o pagamento.');
    try{const details=await checkout.error.context?.json?.();if(details?.error)msg=String(details.error)}catch{}
    throw new Error(msg);
   }
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
