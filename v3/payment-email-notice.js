// Guidance is rendered on XRMOVI's own pages. Mercado Pago's hosted checkout cannot be modified.
// Never use a visitor-supplied address to alter the provider's payer_email or account ownership.
export async function createPaymentEmailNotice(client){
 const {data,error}=await client.auth.getUser();
 const email=!error&&typeof data?.user?.email==='string'?data.user.email.trim():'';
 const notice=document.createElement('div');
 notice.className='xrm-payment-email-notice';
 notice.setAttribute('role','note');
 notice.style.cssText='border:2px solid #f87171;border-radius:12px;background:#3d1920;color:#fff4f4;padding:13px 15px;margin:12px 0;font-size:13px;line-height:1.55;overflow-wrap:anywhere';
 const title=document.createElement('strong');
 title.style.cssText='display:block;color:#ff8585;font-weight:850;font-size:13px;margin-bottom:6px';
 title.textContent='ATENÇÃO — USE O E-MAIL DO CADASTRO';
 const explanation=document.createElement('p');
 explanation.style.cssText='color:#ffe7e7;margin:0 0 6px';
 explanation.textContent='No Mercado Pago, digite exatamente este e-mail quando solicitar a confirmação da assinatura:';
 const value=document.createElement('strong');
 value.className='xrm-payment-email-value';
 value.style.cssText='display:block;color:#fff;font-size:15px;user-select:text';
 value.textContent=email||'Confira o e-mail do seu login XRMOVI.';
 notice.append(title,explanation,value);
 if(email){
  const copy=document.createElement('button');
  copy.type='button';copy.textContent='Copiar e-mail';
  copy.style.cssText='margin-top:10px;border:1px solid #f6a0a0;background:transparent;color:#fff;font-size:12px;padding:7px 10px;border-radius:7px;cursor:pointer';
  copy.addEventListener('click',async()=>{
   try{await navigator.clipboard.writeText(email);copy.textContent='E-mail copiado';}
   catch{value.focus?.();copy.textContent='Selecione o e-mail acima para copiar';}
  });
  notice.append(copy);
 }
 const note=document.createElement('small');
 note.style.cssText='display:block;color:#f4baba;margin-top:9px';
 note.textContent='Se o e-mail for diferente, o Mercado Pago poderá recusar a assinatura. Não é necessário fazer outro cadastro.';
 notice.append(note);
 return notice;
}
