// XRMOVI — gestão privada de documentos por veículo e motorista.
// O bucket continua privado; links assinados expiram em 60 segundos.
export function createDocumentCenter({
  client, rpc, getCompany, getVehicles, getDrivers, getLegacyDocs, getCatalog,
  canWrite, upload, refresh, notify
}) {
  const byId=id=>document.getElementById(id);
  const kinds={vehicle:'Veículo / CRLV',driver:'Motorista / CNH',maintenance:'Manutenção',fuel:'Abastecimento',expense:'Despesa'};
  const labelOf=doc=>{
    if(doc.kind==='driver')return doc.driver_name||
      getDrivers().find(row=>row.id===doc.record_id)?.name||'Motorista';
    const vehicle=getVehicles().find(row=>row.id===doc.vehicle_id||row.id===doc.record_id);
    return vehicle?.plate||doc.plate||'Veículo';
  };
  const datestring=value=>value?new Date(value).toLocaleDateString('pt-BR'):'—';
  const docList=()=>{
    const legacy=(getLegacyDocs()||[]).map(doc=>({
      ...doc,kind:'vehicle',legacy:true,record_id:doc.vehicle_id
    }));
    const modern=(getCatalog()||[]).map(doc=>({...doc,legacy:false}));
    // Do not expose driver documents in UI to users without owner/manager rights.
    return [...legacy,...modern.filter(doc=>doc.kind!=='driver'||canWrite())]
      .sort((a,b)=>String(b.created_at||'').localeCompare(String(a.created_at||'')));
  };
  const style=document.createElement('style');
  style.textContent=`
  .xrm-doc-filters{display:grid;grid-template-columns:minmax(180px,2fr) repeat(3,minmax(125px,1fr));gap:10px;margin:12px 0 16px;align-items:end}
  .xrm-doc-filters label{display:grid;gap:5px;color:#b1c9d8;font-size:12px}
  .xrm-doc-filters input,.xrm-doc-filters select{min-width:0;width:100%;background:#102c41;color:#f0fbff;border:1px solid #39677b;border-radius:9px;padding:10px}
  .xrm-doc-summary{font-size:12px;color:#a8c9d7;margin:10px 0}
  .xrm-doc-actions{display:flex;flex-wrap:wrap;gap:6px;align-items:center}
  .xrm-doc-actions .fleet-button{font-size:12px;white-space:nowrap}
  .xrm-doc-actions .xrm-doc-danger{color:#ffb4b4;border-color:#a85862;background:#3e2632}
  .xrm-doc-row small{display:block;color:#b1c9d8;font-size:11px}
  .xrm-doc-expired{color:#ffb8b8}.xrm-doc-soon{color:#ffdfa4}
  .xrm-doc-dialog-backdrop{position:fixed;inset:0;z-index:1500;background:#010b13dd;display:grid;place-items:center;padding:16px}
  .xrm-doc-dialog-backdrop[hidden]{display:none!important}
  .xrm-doc-dialog{width:min(850px,100%);max-height:92vh;overflow:auto;padding:20px;background:#10283a;color:#eaf8ff;border:1px solid #427385;border-radius:16px;box-shadow:0 20px 70px #0009}
  .xrm-doc-dialog-head{display:flex;justify-content:space-between;gap:12px;align-items:center;margin-bottom:12px}
  .xrm-doc-dialog-head h2{font-size:19px;margin:0}
  .xrm-doc-dialog-head button{font-size:22px;border:0;background:#244b5d;color:white;border-radius:8px;padding:3px 12px}
  .xrm-doc-upload{display:flex;gap:8px;flex-wrap:wrap;align-items:center;padding:14px;border:1px dashed #447388;border-radius:10px;margin:12px 0}
  .xrm-doc-upload input{min-width:0;max-width:100%;color:#d7eaf3}
  .xrm-doc-feedback{min-height:17px;color:#aadbd7;font-size:12px}
  .xrm-doc-history{margin-top:15px;padding:12px;border:1px solid #2b5769;border-radius:10px}
  .xrm-doc-history p{font-size:12px;margin:7px 0;color:#b9d8e3}
  @media(max-width:850px){.xrm-doc-filters{grid-template-columns:1fr 1fr}}
  @media(max-width:530px){.xrm-doc-filters{grid-template-columns:1fr}.xrm-doc-actions{flex-direction:column;align-items:stretch}}
  `;
  document.head.append(style);

  let modalRecord=null,modalKind='';
  const backdrop=document.createElement('div');
  backdrop.className='xrm-doc-dialog-backdrop';backdrop.hidden=true;
  backdrop.innerHTML='<section class="xrm-doc-dialog" role="dialog" aria-modal="true" aria-labelledby="xrm-doc-dialog-title">'+
   '<div class="xrm-doc-dialog-head"><h2 id="xrm-doc-dialog-title">Documentos</h2><button type="button" data-close aria-label="Fechar">×</button></div>'+
   '<p class="xrm-doc-summary" data-summary></p><div data-record-list></div>'+
   '<div data-upload class="xrm-doc-upload" hidden><input data-file type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" aria-label="Selecionar documento (PDF ou imagem)">'+
   '<button data-upload-button type="button" class="fleet-button primary">Adicionar documento</button></div>'+
   '<p class="xrm-doc-feedback" role="status" data-feedback></p></section>';
  document.body.append(backdrop);
  const query=(selector)=>backdrop.querySelector(selector);
  const dialog=backdrop.querySelector('[role="dialog"]');
  let previousFocus=null,busy=false;
  function close(force=false){
    if(busy&&!force)return;
    modalRecord=null;modalKind='';backdrop.hidden=true;
    if(previousFocus?.isConnected)previousFocus.focus({preventScroll:true});
  }
  query('[data-close]').onclick=close;
  backdrop.addEventListener('click',e=>{if(e.target===backdrop)close()});
  backdrop.addEventListener('keydown',e=>{
    if(e.key==='Escape'){e.preventDefault();close();}
    if(e.key==='Tab'){
      const focusable=[...dialog.querySelectorAll('button:not(:disabled),input:not(:disabled)')]
        .filter(x=>!x.hidden&&x.getClientRects().length);
      if(focusable.length){
        const first=focusable[0],last=focusable.at(-1);
        if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}
        else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
      }
    }
  });
  const notice=text=>{query('[data-feedback]').textContent=text||'';};
  const validFor=(doc,kind,record)=>kind==='driver'
    ?doc.kind==='driver'&&doc.record_id===record.id
    :kind==='fuel'
    ?doc.kind==='fuel'&&doc.record_id===record.id
    :doc.vehicle_id===record.id||(doc.kind==='vehicle'&&doc.record_id===record.id);

  async function openFile(doc,download=false){
    const bucket=doc.legacy?'xrmovi-vehicle-docs':'xrmovi-record-attachments';
    const store=client().storage.from(bucket);
    const {data,error}=await store.createSignedUrl(doc.path,60,download?{download:doc.name||'documento'}:{});
    if(error||!data?.signedUrl)throw new Error('Não foi possível gerar o link de acesso.');
    const url=new URL(data.signedUrl);
    const base=new URL(client().supabaseUrl);
    if(url.protocol!=='https:'||url.origin!==base.origin)throw new Error('Endereço de arquivo não autorizado.');
    const link=document.createElement('a');link.href=url.href;
    link.target='_blank';link.rel='noopener noreferrer';
    if(download)link.download=doc.name||'documento';
    document.body.append(link);link.click();link.remove();
  }
  async function deleteFile(doc){
    if(!canWrite())return notify('Somente proprietário ou gestor pode excluir documentos.');
    const cid=getCompany()?.id;
    if(!cid||busy)return;
    if(!window.confirm('Excluir permanentemente o arquivo "'+(doc.name||'Documento')+'"? Esta operação não pode ser desfeita e ficará registrada no histórico.'))return;
    busy=true;
    notice('Excluindo documento e registrando a operação...');
    try{
      const {data,error}=await client().functions.invoke('xrmovi-document-delete',{
        body:{company_id:cid,attachment_id:doc.id,source:doc.legacy?'legacy':'record'}
      });
      if(error){
        let msg=error.message||'Falha na exclusão.';
        try{const detail=await error.context?.json?.();if(detail?.error)msg=String(detail.error)}catch{}
        throw new Error(msg);
      }
      if(!data?.deleted)throw new Error('Exclusão não confirmada pelo servidor.');
      await refresh();
      renderCentral();
      if(modalRecord&&modalKind)renderModal();
      notify('Documento excluído. A ação foi registrada no histórico.');
    }catch(e){notice('Não foi possível excluir: '+e.message);notify('Falha na exclusão: '+e.message)}
    finally{busy=false;query('[data-close]').disabled=false;}
  }
  function actionButton(title,callback,destructive=false){
    const b=document.createElement('button');b.type='button';b.className='fleet-button'+(destructive?' xrm-doc-danger':'');b.textContent=title;b.onclick=()=>void callback();return b;
  }
  function actions(doc){
    const wrap=document.createElement('div');wrap.className='xrm-doc-actions';
    wrap.append(actionButton('Visualizar',async()=>{
      try{await openFile(doc)}catch(error){notify(error.message)}
    }));
    wrap.append(actionButton('Baixar',async()=>{
      try{await openFile(doc,true)}catch(error){notify(error.message)}
    }));
    if(canWrite())wrap.append(actionButton('Excluir',()=>deleteFile(doc),true));
    return wrap;
  }
  function makeTable(docs,container){
    container.replaceChildren();
    if(!docs.length){const empty=document.createElement('p');empty.className='xrm-doc-summary';empty.textContent='Nenhum documento encontrado para esta consulta.';container.append(empty);return;}
    const wrap=document.createElement('div');wrap.className='fleet-table-wrap';
    const table=document.createElement('table');table.className='fleet-table';
    const head=document.createElement('thead'),header=document.createElement('tr');
    for(const title of ['Vínculo','Tipo','Arquivo','Enviado','Vencimento','Ações']){
      const col=document.createElement('th');col.textContent=title;header.append(col);
    }
    head.append(header);
    const body=document.createElement('tbody');
    for(const doc of docs){
      const row=document.createElement('tr');row.className='xrm-doc-row';
      for(const value of [labelOf(doc),kinds[doc.kind]||'Documento',doc.name||'Documento',datestring(doc.created_at)]){
        const td=document.createElement('td');td.textContent=value;row.append(td);
      }
      const expiry=document.createElement('td');
      if(doc.kind==='driver'&&doc.expires_on){
        expiry.textContent=datestring(doc.expires_on+'T12:00:00');
        const today=new Date();today.setHours(0,0,0,0);
        const days=Math.ceil((new Date(doc.expires_on+'T12:00:00')-today)/86400000);
        if(days<0)expiry.className='xrm-doc-expired';
        else if(days<=30)expiry.className='xrm-doc-soon';
      }else expiry.textContent='Não informado';
      row.append(expiry);
      const cell=document.createElement('td');cell.append(actions(doc));row.append(cell);
      body.append(row);
    }
    table.append(head,body);wrap.append(table);container.append(wrap);
  }
  function filterRows(rows){
    const q=(byId('xrm-doc-search')?.value||'').trim().toLocaleLowerCase('pt-BR');
    const kind=byId('xrm-doc-kind')?.value||'';
    const link=byId('xrm-doc-link')?.value||'';
    const expiry=byId('xrm-doc-expiry')?.value||'';
    const now=new Date();now.setHours(0,0,0,0);
    return rows.filter(doc=>{
      const subject=doc.kind==='driver'?'driver:'+doc.record_id:
        'vehicle:'+(doc.vehicle_id||(doc.kind==='vehicle'?doc.record_id:''));
      if(kind&&doc.kind!==kind)return false;
      if(link&&subject!==link)return false;
      if(q&&![doc.name,labelOf(doc),doc.kind,kinds[doc.kind]].some(v=>String(v||'').toLocaleLowerCase('pt-BR').includes(q)))return false;
      if(!expiry)return true;
      if(!doc.expires_on)return expiry==='unknown';
      const days=Math.ceil((new Date(doc.expires_on+'T12:00:00')-now)/86400000);
      return expiry==='expired'?days<0:expiry==='soon'?days>=0&&days<=30:expiry==='valid'?days>30:false;
    });
  }
  function updateLinkOptions(){
    const select=byId('xrm-doc-link');if(!select)return;
    const before=select.value;select.replaceChildren();
    const any=document.createElement('option');any.value='';any.textContent='Todos os cadastros';select.append(any);
    for(const v of getVehicles()){
      const o=document.createElement('option');o.value='vehicle:'+v.id;o.textContent='Veículo · '+v.plate;select.append(o);
    }
    if(canWrite())for(const d of getDrivers()){
      const o=document.createElement('option');o.value='driver:'+d.id;o.textContent='Motorista · '+d.name;select.append(o);
    }
    select.value=[...select.options].some(o=>o.value===before)?before:'';
  }
  function renderCentral(){
    const target=byId('vehicle-documents');if(!target)return;
    updateLinkOptions();
    const all=docList(),filtered=filterRows(all);
    byId('xrm-doc-total')&&(byId('xrm-doc-total').textContent=filtered.length+' de '+all.length+' arquivo(s) da empresa ativa');
    makeTable(filtered,target);
    const history=byId('xrm-doc-history');if(history)history.hidden=!canWrite();
  }
  async function loadHistory(kind=null,rid=null,target=null){
    if(!canWrite())return;
    const root=target||byId('xrm-doc-history-list');
    if(!root)return;
    root.textContent='Consultando histórico de exclusões...';
    const cid=getCompany()?.id;if(!cid)return;
    try{
      const entries=await rpc('document_deletion_history',{cid,p_kind:kind,p_record_id:rid});
      if(getCompany()?.id!==cid)return;
      root.replaceChildren();
      if(!entries?.length){root.textContent='Nenhuma exclusão registrada.';return;}
      for(const e of entries){
        const p=document.createElement('p');
        p.textContent=new Date(e.deleted_at).toLocaleString('pt-BR')+' · '+e.name+
          ' · '+(kinds[e.kind]||e.kind)+' · excluído por '+e.actor;
        root.append(p);
      }
    }catch(error){root.textContent='Não foi possível carregar o histórico: '+error.message;}
  }
  const historyButton=byId('xrm-doc-history-button');
  if(historyButton)historyButton.onclick=()=>{
    const pane=byId('xrm-doc-history-list');if(!pane)return;
    pane.hidden=!pane.hidden;
    historyButton.setAttribute('aria-expanded',String(!pane.hidden));
    if(!pane.hidden)void loadHistory();
  };
  for(const id of ['xrm-doc-search','xrm-doc-kind','xrm-doc-link','xrm-doc-expiry']){
    const node=byId(id);if(node)node.addEventListener(id==='xrm-doc-search'?'input':'change',renderCentral);
  }
  const clear=byId('xrm-doc-clear');if(clear)clear.onclick=()=>{
    for(const id of ['xrm-doc-search','xrm-doc-kind','xrm-doc-link','xrm-doc-expiry'])if(byId(id))byId(id).value='';
    renderCentral();
  };

  function renderModal(){
    if(!modalRecord||!modalKind)return;
    const cid=getCompany()?.id, record=modalRecord, kind=modalKind;
    if(!cid){close();return;}
    const title=kind==='driver'?'Documentos do motorista: '+record.name
      :kind==='fuel'?'Comprovantes do abastecimento: '+(record.plate||getVehicles().find(v=>v.id===record.vehicle_id)?.plate||'Veículo')+
        ' · '+(record.date||record.fueled_on||'')
      :'Documentos do veículo: '+record.plate;
    query('[data-close]').disabled=false;
    query('[data-summary]').textContent='Arquivos privados. Visualização temporária, download e exclusão auditada.';
    byId('xrm-doc-dialog-title').textContent=title;
    const docs=docList().filter(doc=>validFor(doc,kind,record));
    makeTable(docs,query('[data-record-list]'));
    const form=query('[data-upload]');form.hidden=!canWrite();
    notice('');
    const uploadButton=query('[data-upload-button]');
    uploadButton.onclick=async()=>{
      if(busy||!canWrite())return;
      const file=query('[data-file]').files?.[0];
      if(!file)return notice('Selecione um PDF ou imagem de até 10 MB.');
      busy=true;uploadButton.disabled=true;notice('Enviando arquivo...');
      try{
        await upload(cid,kind,record.id,file);
        query('[data-file]').value='';
        await refresh();
        renderCentral();renderModal();
        notify('Documento anexado ao cadastro.');
      }catch(error){notice('Falha ao anexar: '+error.message);}
      finally{busy=false;uploadButton.disabled=false;query('[data-close]').disabled=false;}
    };
    let history=query('[data-record-history]');
    if(!history){
      history=document.createElement('div');history.dataset.recordHistory='';
      history.className='xrm-doc-history';dialog.append(history);
    }
    history.replaceChildren();
    if(canWrite()){
      const b=actionButton('Ver histórico de exclusões',()=>loadHistory(kind,record.id,history));
      history.append(b);
    }
  }
  function openRecord(kind,record){
    if(!getCompany()||!record||!['driver','vehicle','fuel'].includes(kind))return;
    if(kind==='driver'&&!canWrite())return;
    previousFocus=document.activeElement;
    modalKind=kind;modalRecord={...record};
    backdrop.hidden=false;renderModal();
    query('[data-close]').focus();
  }
  return {renderCentral,openRecord,close,loadHistory};
}
