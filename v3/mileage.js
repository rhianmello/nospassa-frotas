/* XRMOVI | Controle de KM e revisões; funções públicas limitadas à empresa autenticada. */
export function setupMileage({client,getCompany,getVehicles,getFilteredIds,onReload,onEditVehicle,canWrite}){
 const id=x=>document.getElementById(x);
 const money=n=>Number(n||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
 const km=n=>Number(n||0).toLocaleString('pt-BR',{maximumFractionDigits:0});
 const day=date=>date?new Date(date).toLocaleDateString('pt-BR'):'Nunca';
 const days=['Domingo','Segunda-feira','Terça-feira','Quarta-feira','Quinta-feira','Sexta-feira','Sábado'];
 let state=null,companyId=null,request=0,loadError='',busy=false;
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
 function status(message,type=''){const notice=id('xrm-mileage-message');if(notice){notice.textContent=message;notice.dataset.type=type}}
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
    if(v.interval_km)actions.append(btn('Concluir óleo',()=>showOil(v),'subtle small'));
    if(v.interval_km)actions.append(btn('Histórico de óleo',()=>void showOilHistory(v),'subtle small'));
   }
   tr.append(actions);tbody.append(tr);
  }
  if(!rows().length){const tr=add('tr');const td=add('td','', 'Nenhum ativo cadastrado. Cadastre um veículo primeiro.');td.colSpan=8;tr.append(td);tbody.append(tr)}
  table.append(tbody);wrap.append(table);root.append(wrap);
  const pending=state?.pending||[];
  if(pending.length){
   const box=add('div','xrm-mileage-review');box.append(add('h3','','Leituras suspeitas aguardando conferência'));
   for(const r of pending){
    const line=add('div','xrm-mileage-review-row');
    const info=add('div');info.append(add('strong','',r.plate+' · '+km(r.meter)+' km'),add('small','',r.reason||'Leitura pendente'),add('small','',(r.driver_name||'')+' · '+day(r.submitted_at)));
    line.append(info);
    if(r.photo&&owned())line.append(btn('Ver foto',()=>void openProof(r.photo),'subtle small'));
    if(owned())line.append(btn('Conferir',()=>showReview(r),'primary small'));
    box.append(line);
   }
   root.append(box);
  }
  root.append(add('p','xrm-mileage-message',''));const notice=root.lastChild;notice.id='xrm-mileage-message';
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
  const token=vehicle.qr_token;if(!token)return status('Cadastre as configurações do veículo para gerar o QR.','warn');
  const url=new URL('/km/',location.origin);url.searchParams.set('token',token);
  const modal=makeDialog('QR Code · '+vehicle.plate);
  const content=add('div','xrm-mileage-qr');
  const canvas=add('canvas');canvas.width=260;canvas.height=260;content.append(canvas);
  content.append(add('p','',vehicle.plate+' · Acesso para motorista informar KM com foto.'));
  const link=labelInput('Link de leitura','text',url.href);link.input.readOnly=true;content.append(link.label);
  const actions=add('div','xrm-mileage-actions');
  const draw=()=>{if(window.QRCode?.toCanvas)window.QRCode.toCanvas(canvas,url.href,{width:260,margin:1,color:{dark:'#072433',light:'#ffffff'}},err=>{if(err)status('Falha ao gerar QR Code.','error')});else content.append(add('p','xrm-mileage-modal-help','Biblioteca de QR Code indisponível. Copie o link para enviar.'))};
  draw();
  actions.append(btn('Copiar link',async()=>{try{await navigator.clipboard.writeText(url.href)}catch{link.input.select();document.execCommand('copy')}}));
  actions.append(btn('Baixar QR',()=>{const a=add('a');a.download='xrmovi-'+vehicle.plate+'-qr.png';a.href=canvas.toDataURL('image/png');a.click()},'primary'));
  actions.append(btn('Imprimir',()=>{const popup=window.open('','_blank');if(!popup)return status('Permita pop-ups para imprimir.','error');const pic=canvas.toDataURL('image/png');popup.document.write('<html><head><title>QR - '+vehicle.plate+'</title></head><body style="text-align:center;font-family:sans-serif"><h1>'+vehicle.plate.replace(/[&<>"']/g,'')+'</h1><img alt="QR Code" src="'+pic+'"><p>Escaneie para atualizar o KM no XRMOVI.</p></body></html>');popup.document.close();popup.onload=()=>popup.print()}));
  actions.append(btn('Revogar e gerar outro',async()=>{if(!confirm('O QR Code anterior deixará de funcionar. Continuar?'))return;try{await rpc('mileage_qr_rotate',{cid:companyId,vid:vehicle.id});modal.close();await refresh();status('QR Code substituído. Imprima o novo código.')}catch(error){status(error.message,'error')}},'subtle'));
  content.append(actions);modal.append(content);
 }
 return {refresh,render,planFor};
}
