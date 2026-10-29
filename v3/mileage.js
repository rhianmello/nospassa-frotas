/* XRMOVI | Controle de KM e revisões; funções públicas limitadas à empresa autenticada. */
export function setupMileage({client,getCompany,getVehicles,getFilteredIds,onReload,onEditVehicle,canWrite}){
 const id=x=>document.getElementById(x);
 const money=n=>Number(n||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
 const km=n=>Number(n||0).toLocaleString('pt-BR',{maximumFractionDigits:0});
 const day=date=>{if(!date)return 'Nunca';const text=String(date);return new Date(/^\d{4}-\d{2}-\d{2}$/.test(text)?text+'T12:00:00':text).toLocaleDateString('pt-BR')};
 const days=['Domingo','Segunda-feira','Terça-feira','Quarta-feira','Quinta-feira','Sexta-feira','Sábado'];
 let state=null,companyId=null,request=0,loadError='',busy=false,flash='',flashKind='';
 const rpc=async(name,args)=>{const {data,error}=await client.rpc('xrmovi_'+name,args);if(error)throw Error(error.message);return data};
 const add=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e};
 const btn=(label,fn,cls='')=>{const b=add('button','xrm-mileage-btn '+cls,label);b.type='button';b.onclick=fn;return b};
 const company=()=>getCompany();
 const rows=()=>state?.vehicles||[];
 const scoped=()=>{const ids=getFilteredIds();return ids?rows().filter(v=>ids.has(v.id)):rows()};
 const toStatus=v=>v.oil_status==='overdue'?'Vencida':v.oil_status==='soon'?'Próxima':v.oil_status==='ok'?'Em dia':'Não configurada';
 const toStatusClass=v=>'xrm-oil-'+(v.oil_status||'unconfigured');
 const weekStart=()=>{const d=new Date();d.setHours(0,0,0,0);d.setDate(d.getDate()-(d.getDay()-(state?.weekday??1)+7)%7);return d};
 const weeklyDue=v=>{const latest=v.last_report_at||v.last_meter_at;return !latest||new Date(latest)<weekStart()};
 const owned=()=>!!canWrite();
 function status(message,type=''){flash=message;flashKind=type;const notice=id('xrm-mileage-message');if(notice){notice.textContent=message;notice.dataset.type=type}}
 async function refresh(cid=company()?.id){
  if(!cid)return;
  const current=++request;companyId=cid;
  try{const data=await rpc('mileage_dashboard',{cid});if(current!==request||company()?.id!==cid)return;state=data||{vehicles:[],pending:[],weekday:1};loadError='';render()}
  catch(error){if(current!==request)return;loadError=error.message;state={vehicles:[],pending:[],weekday:1};render();status('Falha ao consultar KM: '+error.message,'error')}
 }
 function planFor(vid){return rows().find(v=>v.id===vid)||null}
 function render(){
  const consoleRoot=id('xrm-mileage-console');
  const dboard=id('xrm-mileage-dashboard'),alerts=id('xrm-mileage-alerts');
  if(!consoleRoot||!dboard||!alerts)return;
  const all=scoped();
  const oil=all.filter(v=>v.oil_status==='overdue'||v.oil_status==='soon');
  const reminders=all.filter(weeklyDue);
  const pending=(state?.pending||[]).filter(r=>!getFilteredIds()||getFilteredIds().has(r.vehicle_id));
  dboard.replaceChildren();
  const head=add('div','xrm-mileage-dash-head');
  const text=add('div');text.append(add('strong','','Quilometragem e óleo'),add('small','','Alertas vinculados ao hodômetro informado'));
  head.append(text,btn('Gerenciar KM →',()=>{document.querySelector('[data-view="assets"]')?.click();id('xrm-mileage-console')?.scrollIntoView({behavior:'smooth',block:'start'})}));
  dboard.append(head);
  const chips=add('div','xrm-mileage-dash-chips');
  for(const [label,count,tone] of [['Troca de óleo',oil.length,'oil'],['KM semanal pendente',reminders.length,'weekly'],['Leituras para conferir',pending.length,'pending']]){
   const chip=add('div','xrm-mileage-dash-chip '+tone);chip.append(add('span','',label),add('strong','',String(count)));chips.append(chip);
  }
  dboard.append(chips);
  const summary=add('div','xrm-mileage-dash-lines');
  const notable=[...oil.map(v=>({label:v.plate+' · '+(v.oil_status==='overdue'?'Troca de óleo vencida':'Próxima troca: '+km(v.next_due_km)+' km'),tone:v.oil_status})),...reminders.filter(v=>!oil.some(o=>o.id===v.id)).map(v=>({label:v.plate+' · Atualização semanal do KM pendente',tone:'weekly'})),...pending.map(p=>({label:p.plate+' · KM informado requer conferência',tone:'pending'}))].slice(0,4);
  if(!notable.length)summary.append(add('small','','Nenhum alerta de óleo ou leitura pendente.'));
  else for(const item of notable)summary.append(add('div','xrm-mileage-line '+item.tone,item.label));
  dboard.append(summary);
  alerts.replaceChildren();
  if(oil.length||reminders.length||pending.length){
   const header=add('header');header.append(add('h2','','Quilometragem e trocas de óleo'),btn('Abrir controle',()=>{document.querySelector('[data-view="assets"]')?.click();id('xrm-mileage-console')?.scrollIntoView({behavior:'smooth'})}));
   alerts.append(header);
   for(const v of oil)alerts.append(add('p',toStatusClass(v),v.plate+' — '+toStatus(v)+' · '+km(v.meter)+' / '+km(v.next_due_km)+' km'));
   if(reminders.length)alerts.append(add('p','',reminders.length+' veículo(s) aguardam atualização semanal de KM ('+days[state.weekday]+').'));
   if(pending.length)alerts.append(add('p','xrm-oil-overdue',pending.length+' leitura(s) suspeita(s) aguardam conferência do gestor.'));
  }
  renderConsole();
 }
 function renderConsole(){
  const root=id('xrm-mileage-console');if(!root)return;
  root.replaceChildren();
  const header=add('div','xrm-mileage-heading');const copy=add('div');
  copy.append(add('span','xrm-mileage-eyebrow','CONTROLE DE HODÔMETRO'),add('h2','','Quilometragem, troca de óleo e QR Code'),add('p','','Registre KM total por veículo, programe revisões e confira leituras enviadas pelos motoristas.'));
  header.append(copy,btn('Atualizar dados',()=>refresh(),'subtle'));
  root.append(header);
  if(loadError){root.append(add('p','xrm-mileage-empty','Não foi possível carregar os dados: '+loadError));return}
  const toolbar=add('div','xrm-mileage-toolbar');
  const week=add('label');week.textContent='Lembrete semanal';
  const weekday=add('select');weekday.setAttribute('aria-label','Dia da semana para lembrar atualização de KM');
  days.forEach((label,value)=>{const o=add('option','',label);o.value=String(value);weekday.append(o)});
  weekday.value=String(state?.weekday??1);weekday.disabled=!owned();
  weekday.onchange=async()=>{try{await rpc('mileage_settings_save',{cid:companyId,weekday:Number(weekday.value)});status('Dia do lembrete salvo.');await refresh()}catch(error){status(error.message,'error')}};
  week.append(weekday);toolbar.append(week);
  toolbar.append(add('p','','O lembrete aparece na Visão Geral a partir do dia escolhido, até uma leitura ser confirmada na semana.'));
  root.append(toolbar);
  const tools=add('div','xrm-mileage-bulk');
  tools.append(add('strong','','Atualização em lote'));
  const common=add('label','xrm-mileage-common');common.append(add('span','','KM total igual para a seleção'),Object.assign(add('input'),{type:'number',min:'0',step:'1',placeholder:'Ex.: 18000',id:'xrm-mileage-common-km'}));
  const choices=add('div','xrm-mileage-actions');
  choices.append(btn('Selecionar todos',()=>{root.querySelectorAll('.xrm-mileage-selected').forEach(i=>{i.checked=true})},'subtle'),btn('Limpar seleção',()=>{root.querySelectorAll('.xrm-mileage-selected').forEach(i=>{i.checked=false})},'subtle'));
  choices.append(btn('Salvar KM dos selecionados',()=>void saveBulk(),'primary'));
  tools.append(common,choices,add('small','','Deixe o KM comum vazio para informar uma leitura diferente na coluna “Novo KM” de cada veículo.'));
  if(owned())root.append(tools);
  const wrap=add('div','xrm-mileage-table-wrap'),table=add('table','xrm-mileage-table'),thead=add('thead'),row=add('tr');
  for(const label of ['','Veículo','KM atual','Troca de óleo','Próxima troca','Última leitura','Novo KM','Ações'])row.append(add('th','',label));
  thead.append(row);table.append(thead);
  const tbody=add('tbody');
  for(const v of scoped()){
   const tr=add('tr'),checkTd=add('td'),check=add('input','xrm-mileage-selected');
   check.type='checkbox';check.dataset.vid=v.id;check.disabled=!owned();checkTd.append(check);tr.append(checkTd);
   const identity=add('td');identity.append(add('strong','',v.plate));identity.append(add('small','',v.model||v.category||''));tr.append(identity);
   tr.append(add('td','',km(v.meter)+' km'));
   tr.append(add('td',toStatusClass(v),toStatus(v)));
   tr.append(add('td','',v.next_due_km==null?'—':km(v.next_due_km)+' km'));
   const last=add('td','',v.last_report_at?day(v.last_report_at):'Sem registro');if(weeklyDue(v))last.append(add('small','xrm-mileage-warn','Atualizar esta semana'));tr.append(last);
   const reading=add('td');const input=add('input','xrm-mileage-input');input.type='number';input.min='0';input.step='1';input.placeholder='KM total';input.dataset.vid=v.id;input.disabled=!owned();reading.append(input);tr.append(reading);
   const actions=add('td','xrm-mileage-actions');
   if(owned()){
    actions.append(btn('Salvar KM',()=>void saveOne(v.id,Number(input.value),input.value),'small'));
    actions.append(btn('Configurar',()=>onEditVehicle(v.id),'subtle small'));
    if(v.qr_token)actions.append(btn('QR Code',()=>showQr(v),'subtle small'));
    actions.append(btn('Histórico KM',()=>void showReadingHistory(v),'subtle small'));
    if(v.interval_km)actions.append(btn('Concluir óleo',()=>showOil(v),'subtle small'));
    if(v.interval_km)actions.append(btn('Histórico de óleo',()=>void showOilHistory(v),'subtle small'));
   }
   tr.append(actions);tbody.append(tr);
  }
  if(!rows().length){const tr=add('tr');const td=add('td','', 'Nenhum ativo cadastrado. Cadastre um veículo primeiro.');td.colSpan=8;tr.append(td);tbody.append(tr)}
  table.append(tbody);wrap.append(table);root.append(wrap);
  const pending=state?.pending||[];
  if(pending.length){
   const box=add('div','xrm-mileage-review');
   const head=add('div','xrm-mileage-review-head');
   head.append(add('h3','','Leituras suspeitas aguardando conferência'));
   head.append(add('small','','Rejeitar remove da fila, mas preserva o registro no histórico.'));
   box.append(head);
   const toolbar=add('div','xrm-mileage-review-toolbar');
   const chooseAll=add('label','xrm-mileage-review-select-all');
   const allBox=add('input');allBox.type='checkbox';
   allBox.setAttribute('aria-label','Selecionar todas as leituras pendentes');
   chooseAll.append(allBox,add('span','','Selecionar todas'));
   const selectionSummary=add('span','xrm-mileage-review-summary','0 selecionadas');
   const approve=btn('Aprovar selecionadas',()=>void reviewSelected('accept'),'primary');
   const reject=btn('Rejeitar selecionadas',()=>void reviewSelected('reject'),'danger');
   approve.disabled=true;reject.disabled=true;
   toolbar.append(chooseAll,selectionSummary,approve,reject);
   if(owned())box.append(toolbar);
   const list=add('div','xrm-mileage-review-list');
   const updateSelection=()=>{
    const all=[...list.querySelectorAll('.xrm-review-selected')],selected=all.filter(check=>check.checked);
    const invalid=selected.filter(check=>{
     const record=pending.find(r=>String(r.id)===check.dataset.reportId);
     return record&&Number(record.meter)<Number(record.current_meter);
    });
    const checked=selected.length;
    allBox.checked=checked>0&&checked===all.length;
    allBox.indeterminate=checked>0&&checked<all.length;
    selectionSummary.textContent=checked+' selecionada(s)'+(invalid.length?' · '+invalid.length+' abaixo do KM confirmado':'');
    approve.disabled=!owned()||checked===0||busy;
    reject.disabled=!owned()||checked===0||busy;
    approve.title=invalid.length?'Leituras abaixo do KM atual precisam ser corrigidas individualmente ou rejeitadas.':'Aprovar quilometragens selecionadas';
   };
   allBox.onchange=()=>{list.querySelectorAll('.xrm-review-selected').forEach(check=>{check.checked=allBox.checked});updateSelection()};
   for(const r of pending){
    const line=add('div','xrm-mileage-review-row');
    if(owned()){
     const selector=add('input','xrm-review-selected');
     selector.type='checkbox';selector.dataset.reportId=r.id;
     selector.setAttribute('aria-label','Selecionar leitura '+r.plate+' de '+km(r.meter)+' km');
     selector.onchange=updateSelection;line.append(selector);
    }
    const info=add('div','xrm-mileage-review-info');
    info.append(add('strong','',r.plate+' · '+km(r.meter)+' km'),add('small','',r.reason||'Leitura pendente'),add('small','',(r.driver_name||'Enviado pelo painel')+' · '+day(r.submitted_at)));
    if(Number(r.meter)<Number(r.current_meter))info.append(add('small','xrm-review-lower','KM confirmado: '+km(r.current_meter)+' — menor leitura exige conferência individual'));
    line.append(info);
    const actions=add('div','xrm-mileage-review-actions');
    if(r.photo&&owned())actions.append(btn('Ver foto',()=>void openProof(r.photo),'subtle small'));
    if(owned()){
     actions.append(btn('Rejeitar',()=>void rejectOne(r),'danger small'));
     actions.append(btn('Conferir',()=>showReview(r),'primary small'));
    }
    line.append(actions);list.append(line);
   }
   box.append(list);
   if(owned())updateSelection();
   root.append(box);
  }
  root.append(add('p','xrm-mileage-message',flash));const notice=root.lastChild;notice.id='xrm-mileage-message';notice.dataset.type=flashKind;
 }
 async function saveOne(vid,value,raw){
  if(!owned())return;
  if(raw===''||!Number.isFinite(value)||value<0){status('Informe o KM total do veículo.','error');return}
  try{const data=await rpc('mileage_submit_admin',{cid:companyId,vid,p_meter:value,p_note:'Leitura registrada no painel'});status(data.status==='pending'?'Leitura acima do limite: enviada para conferência.':'Quilometragem atualizada.',data.status==='pending'?'warn':'');await onReload();await refresh()}
  catch(error){status(error.message,'error')}
 }
 async function saveBulk(){
  if(busy)return;
  const selected=[...id('xrm-mileage-console').querySelectorAll('.xrm-mileage-selected:checked')];
  if(!selected.length){status('Selecione ao menos um veículo.','error');return}
  const shared=id('xrm-mileage-common-km').value;const records=selected.map(input=>{
   const individual=id('xrm-mileage-console').querySelector('.xrm-mileage-input[data-vid="'+input.dataset.vid+'"]');
   return {vid:input.dataset.vid,raw:shared!==''?shared:individual.value,plate:rows().find(v=>v.id===input.dataset.vid)?.plate||'Veículo'}
  });
  if(records.some(x=>x.raw===''||!Number.isFinite(Number(x.raw))||Number(x.raw)<0)){status('Informe o KM total de cada veículo selecionado ou preencha o KM comum.','error');return}
  if(shared!==''&&!confirm('Confirmar o mesmo KM total ('+km(shared)+') para '+records.length+' veículo(s)?'))return;
  busy=true;let saved=0,pending=0,failed=[];
  for(const x of records){
   try{const result=await rpc('mileage_submit_admin',{cid:companyId,vid:x.vid,p_meter:Number(x.raw),p_note:'Atualização em lote'});
    if(result?.status==='pending')pending++;else saved++;
   }catch(error){failed.push(x.plate+': '+error.message)}
  }
  busy=false;
  await onReload();await refresh();
  status(saved+' confirmada(s), '+pending+' pendente(s) de conferência.'+(failed.length?' Erros: '+failed.join(' / '):''),failed.length?'error':pending?'warn':'');
 }
 async function reviewSelected(decision){
  if(!owned()||busy)return;
  const chosen=[...id('xrm-mileage-console').querySelectorAll('.xrm-review-selected:checked')];
  if(!chosen.length){status('Selecione uma ou mais conferências.','error');return}
  const records=chosen.map(node=>(state?.pending||[]).find(row=>String(row.id)===node.dataset.reportId)).filter(Boolean);
  if(records.length!==chosen.length){status('A lista de conferências mudou. Atualize antes de continuar.','error');return}
  if(decision==='accept'){
   const lower=records.filter(r=>Number(r.meter)<Number(r.current_meter));
   if(lower.length){
    status('Não é seguro aprovar em lote: '+lower.length+' leitura(s) informam KM menor que o confirmado. Rejeite-as em lote ou use Conferir para corrigir uma por uma. Nenhum KM foi alterado.','error');
    return;
   }
  }
  const label=decision==='accept'?'APROVAR':'REJEITAR';
  const message=decision==='reject'?'As leituras sairão da fila, mas continuarão no histórico.':'A quilometragem dos veículos será atualizada com os valores selecionados.';
  if(!confirm(label+' '+records.length+' leitura(s)? '+message))return;
  busy=true;
  try{
   const result=await rpc('mileage_bulk_review',{
    cid:companyId,report_ids:records.map(r=>r.id),p_decision:decision,
    p_reason:decision==='reject'?'Leituras descartadas pelo gestor em conferência em lote':'Leituras aprovadas pelo gestor em conferência em lote'
   });
   await onReload();await refresh();
   status((result?.reviewed??records.length)+' leitura(s) '+(decision==='reject'?'rejeitadas e removidas das pendências':'aprovadas e aplicadas')+'. O histórico foi preservado.');
  }catch(error){status('Falha na operação em lote: '+error.message,'error')}
  finally{busy=false}
 }
 async function rejectOne(record){
  if(!owned()||busy)return;
  if(!confirm('Rejeitar a leitura de '+km(record.meter)+' km do veículo '+record.plate+'? Ela sairá das pendências e permanecerá no histórico.'))return;
  busy=true;
  try{
   await rpc('mileage_review',{cid:companyId,p_report:record.id,p_decision:'reject',p_corrected:null,p_reason:'Leitura rejeitada pelo gestor na fila de conferência'});
   await onReload();await refresh();
   status('Leitura de '+record.plate+' rejeitada e removida das pendências. Histórico preservado.');
  }catch(error){status('Não foi possível rejeitar: '+error.message,'error')}
  finally{busy=false}
 }
 function makeDialog(title){
  const modal=add('dialog','xrm-mileage-modal');
  const head=add('div','xrm-mileage-modal-head');head.append(add('h2','',title),btn('×',()=>modal.close(),'close'));
  modal.append(head);document.body.append(modal);modal.addEventListener('close',()=>modal.remove());modal.showModal();return modal;
 }
 function labelInput(label,type,value=''){
  const labelEl=add('label');labelEl.append(add('span','',label));const inp=add('input');inp.type=type;inp.value=value==null?'':String(value);labelEl.append(inp);return {label:labelEl,input:inp};
 }
 function showOil(vehicle){
  const modal=makeDialog('Concluir troca de óleo · '+vehicle.plate);
  const form=add('form','xrm-mileage-modal-form');form.method='dialog';
  const today=new Date(),localISO=[today.getFullYear(),String(today.getMonth()+1).padStart(2,'0'),String(today.getDate()).padStart(2,'0')].join('-');
  const meter=labelInput('KM da troca','number',vehicle.meter),date=labelInput('Data do serviço','date',localISO),oil=labelInput('Óleo utilizado','text',vehicle.oil_type||''),cost=labelInput('Custo realizado (R$)','number','0'),notes=labelInput('Serviço realizado / observações','text','');
  for(const x of [meter,date,oil,cost,notes])form.append(x.label);
  meter.input.required=true;meter.input.min='0';date.input.required=true;cost.input.min='0';cost.input.step='.01';
  const message=add('p','xrm-mileage-modal-help','A próxima troca será calculada automaticamente após salvar a conclusão.');form.append(message);
  const submit=btn('Concluir serviço',async()=>{
   if(!meter.input.reportValidity()||!date.input.reportValidity())return;
   submit.disabled=true;
   try{await rpc('oil_complete',{cid:companyId,vid:vehicle.id,p_meter:Number(meter.input.value),p_date:date.input.value,p_oil_type:oil.input.value,p_cost:Number(cost.input.value)||0,p_notes:notes.input.value});modal.close();await onReload();await refresh();status('Troca de óleo concluída. Próximo vencimento atualizado.')}
   catch(error){message.textContent=error.message;submit.disabled=false}
  },'primary');form.append(submit);modal.append(form);
 }
 async function showReadingHistory(vehicle){
  const modal=makeDialog('Histórico do hodômetro · '+vehicle.plate);
  const box=add('div','xrm-mileage-history');box.append(add('p','xrm-mileage-modal-help','Consultando leituras registradas…'));modal.append(box);
  try{
   const records=await rpc('mileage_readings',{cid:companyId,vid:vehicle.id});
   box.replaceChildren();
   if(!records?.length){box.append(add('p','xrm-mileage-modal-help','Nenhuma leitura registrada.'));return}
   for(const record of records){
    const row=add('div','xrm-mileage-history-row');
    const readable=record.status==='accepted'?'Confirmada':record.status==='pending'?'Pendente':'Rejeitada';
    row.append(add('strong','',km(record.applied_meter??record.meter)+' km · '+readable));
    row.append(add('span','',day(record.submitted_at)+' · '+(record.driver_name||'Gestor')+' · '+(record.source==='qr'?'QR Code com foto':record.source==='bulk'?'Atualização em lote':'Painel')));
    if(record.reason||record.review_note)row.append(add('span','',(record.reason||'')+(record.review_note?' · Revisão: '+record.review_note:'')));
    if(record.photo)row.append(btn('Ver foto do hodômetro',()=>void openProof(record.photo),'subtle small'));
    box.append(row);
   }
  }catch(error){box.textContent='Falha ao consultar histórico: '+error.message}
 }
 async function showOilHistory(vehicle){
  const modal=makeDialog('Trocas de óleo · '+vehicle.plate);
  const box=add('div','xrm-mileage-history');box.append(add('p','xrm-mileage-modal-help','Consultando trocas registradas no Supabase…'));modal.append(box);
  try{
   const records=await rpc('oil_history',{cid:companyId,vid:vehicle.id});
   box.replaceChildren();
   if(!records?.length){box.append(add('p','xrm-mileage-modal-help','Nenhuma troca concluída neste veículo.'));return}
   for(const item of records){
    const line=add('div','xrm-mileage-history-row');
    line.append(add('strong','',day(item.completed_on)+' · '+km(item.completed_meter)+' km'));
    line.append(add('span','',(item.oil_type||'Óleo não informado')+' · '+km(item.interval_km)+' km por troca'));
    line.append(add('span','','Custo: '+money(item.cost)+' · '+(item.notes||'Sem observações')));
    box.append(line);
   }
  }catch(error){box.textContent='Erro ao consultar histórico: '+error.message}
 }
 function showReview(record){
  const modal=makeDialog('Conferir leitura · '+record.plate);
  const form=add('div','xrm-mileage-modal-form');
  form.append(add('p','xrm-mileage-modal-help','Registrado: '+km(record.meter)+' km · KM confirmado: '+km(record.current_meter)+' km. '+(record.reason||'')));
  const value=labelInput('KM confirmado ou corrigido','number',record.meter),reason=labelInput('Motivo da decisão','text','');
  value.input.min='0';reason.input.required=true;reason.input.minLength=4;
  form.append(value.label,reason.label);
  const message=add('p','xrm-mileage-modal-help','Aprovar atualiza o KM confirmado. Rejeitar preserva o KM anterior.');
  form.append(message);
  const actions=add('div','xrm-mileage-actions');
  const act=async decision=>{
   if(!reason.input.value.trim()||reason.input.value.trim().length<4){message.textContent='Informe o motivo da conferência.';return}
   try{await rpc('mileage_review',{cid:companyId,p_report:record.id,p_decision:decision,p_corrected:decision==='accept'?Number(value.input.value):null,p_reason:reason.input.value.trim()});modal.close();await onReload();await refresh();status('Leitura conferida e registrada no histórico.')}
   catch(error){message.textContent=error.message}
  };
  actions.append(btn('Rejeitar',()=>void act('reject'),'subtle'),btn('Aprovar / corrigir',()=>void act('accept'),'primary'));
  form.append(actions);modal.append(form);
 }
 async function openProof(path){
  try{const {data,error}=await client.storage.from('xrmovi-odometer-proof').createSignedUrl(path,90);
   if(error||!data?.signedUrl)throw Error(error?.message||'Acesso à imagem indisponível');
   window.open(data.signedUrl,'_blank','noopener,noreferrer');
  }catch(error){status('Não foi possível abrir foto: '+error.message,'error')}
 }
 function showQr(vehicle){
  const token=vehicle.qr_token;
  if(!token)return status('Cadastre as configurações do veículo para gerar o QR.','warn');
  const url=new URL('/km/',location.origin);url.searchParams.set('token',token);
  const modal=makeDialog('QR Code · '+vehicle.plate);
  const content=add('div','xrm-mileage-qr');
  const qrHost=add('div','xrm-mileage-qr-display');
  qrHost.setAttribute('role','img');qrHost.setAttribute('aria-label','QR Code de '+vehicle.plate);
  content.append(qrHost);
  const help=add('p','xrm-mileage-modal-help','Gerando QR Code seguro…');
  content.append(help);
  content.append(add('p','',vehicle.plate+' · Acesso para motorista informar KM com foto.'));
  const link=labelInput('Link de leitura','text',url.href);
  link.input.readOnly=true;content.append(link.label);
  const actions=add('div','xrm-mileage-actions');
  const copy=btn('Copiar link',async()=>{
   try{await navigator.clipboard.writeText(url.href);help.textContent='Link copiado para compartilhar com o motorista.'}
   catch{link.input.select();const copied=document.execCommand('copy');help.textContent=copied?'Link copiado.':'Selecione e copie o link manualmente.'}
  });
  const download=btn('Baixar QR',()=>{const data=imageData();if(!data){help.textContent='O QR Code ainda não está disponível. Não é possível baixar uma imagem em branco.';return}
   const a=add('a');a.download='xrmovi-'+vehicle.plate.replace(/[^a-z0-9-]/gi,'')+'-qr.png';a.href=data;a.click();
  },'primary');
  const print=btn('Imprimir',()=>{
   const data=imageData();if(!data){help.textContent='O QR Code ainda não está pronto para impressão.';return}
   const popup=window.open('','_blank');if(!popup){help.textContent='Permita pop-ups para imprimir.';return}
   const title=vehicle.plate.replace(/[^a-zA-Z0-9 -]/g,'');
   popup.document.write('<!doctype html><html><head><title>QR - '+title+'</title></head><body style="text-align:center;font-family:sans-serif"><h1>'+title+'</h1><img alt="QR Code" width="260" height="260" src="'+data+'"><p>Escaneie para atualizar a quilometragem no XRMOVI.</p></body></html>');
   popup.document.close();popup.onload=()=>popup.print();
  });
  const imageData=()=>{
   const img=qrHost.querySelector('img');
   if(img?.src?.startsWith('data:image/'))return img.src;
   const canvas=qrHost.querySelector('canvas');
   try{return canvas?.toDataURL('image/png')||''}catch{return ''}
  };
  download.disabled=true;print.disabled=true;
  actions.append(copy,download,print);
  actions.append(btn('Revogar e gerar outro',async()=>{
   if(!confirm('O QR Code anterior deixará de funcionar. Continuar?'))return;
   try{await rpc('mileage_qr_rotate',{cid:companyId,vid:vehicle.id});modal.close();await refresh();status('QR Code substituído. Imprima o novo código.')}
   catch(error){help.textContent=error.message}
  },'subtle'));
  content.append(actions);modal.append(content);
  try{
   if(typeof window.QRCode!=='function')throw Error('O módulo de geração não carregou. O link acima continua funcionando.');
   new window.QRCode(qrHost,{
    text:url.href,width:256,height:256,colorDark:'#061726',colorLight:'#ffffff',
    correctLevel:window.QRCode.CorrectLevel.M
   });
   window.requestAnimationFrame(()=>{
    if(!modal.isConnected)return;
    const data=imageData();
    if(data&&data.length>80){download.disabled=false;print.disabled=false;help.textContent='QR Code pronto para baixar, imprimir ou compartilhar.'}
    else help.textContent='Não foi possível desenhar o QR Code. Copie o link ou atualize a página.';
   });
  }catch(error){help.textContent='Falha ao gerar o QR Code: '+error.message+' O link continua disponível.'}
 }

 return {refresh,render,planFor};
}
