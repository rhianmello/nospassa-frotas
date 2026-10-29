// XRMOVI - webhook Mercado Pago. Desativado até ter credenciais, testes e ativação explícita.
// Deploy com verify_jwt=false: validação HMAC é obrigatória ANTES de consultar/processar recursos.
import { createClient } from "npm:@supabase/supabase-js@2.58.0";
const reply=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{"content-type":"application/json"}});
function parseSignature(value:string){
 const fields=Object.fromEntries(value.split(",").map(part=>part.trim().split("=")));
 return {ts:fields.ts||"",hash:fields.v1||""};
}
function hexBytes(hex:string):Uint8Array{
 if(!/^[a-f0-9]{64}$/i.test(hex))throw new Error("Assinatura inválida");
 return Uint8Array.from(hex.match(/../g)!.map(x=>parseInt(x,16)));
}
async function signed(req:Request,dataId:string,secret:string){
 const xSignature=req.headers.get("x-signature")||"",requestId=req.headers.get("x-request-id")||"";
 const {ts,hash}=parseSignature(xSignature);
 if(!/^\d{10,13}$/.test(ts)||!requestId||!dataId)return false;
 const eventMs=Number(ts)*(ts.length===13?1:1000);
 if(Math.abs(Date.now()-eventMs)>600000)return false;
 const manifest="id:"+dataId+";request-id:"+requestId+";ts:"+ts+";";
 const key=await crypto.subtle.importKey("raw",new TextEncoder().encode(secret),{name:"HMAC",hash:"SHA-256"},false,["verify"]);
 return crypto.subtle.verify("HMAC",key,hexBytes(hash),new TextEncoder().encode(manifest));
}
Deno.serve(async(req:Request)=>{
 if(req.method!=="POST")return reply({error:"Método inválido"},405);
 if(Deno.env.get("XRMOVI_BILLING_ENABLED")!=="true")return reply({error:"Integração ainda não ativa."},503);
 const token=Deno.env.get("MERCADOPAGO_ACCESS_TOKEN"),secret=Deno.env.get("MERCADOPAGO_WEBHOOK_SECRET");
 const url=Deno.env.get("SUPABASE_URL"),serviceKey=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
 if(!token||!secret||!url||!serviceKey)return reply({error:"Configuração incompleta"},503);
 const dataId=new URL(req.url).searchParams.get("data.id")||"";
 try{
  if(!await signed(req,dataId,secret))return reply({error:"Assinatura de webhook inválida"},401);
  const body=await req.json();
  if(body?.data?.id!=null&&String(body.data.id)!==dataId)return reply({error:"ID não corresponde ao evento"},400);
  const type=String(body?.type||body?.topic||"");
  const mpGet=async(path:string)=>{
   const r=await fetch("https://api.mercadopago.com"+path,{headers:{Authorization:"Bearer "+token}});
   if(!r.ok)throw new Error("Falha ao validar recurso no provedor");
   return r.json();
  };
  const client=createClient(url,serviceKey,{auth:{persistSession:false}});
  if(type==="subscription_authorized_payment"){
   const invoice=await mpGet("/authorized_payments/"+encodeURIComponent(dataId));
   if(String(invoice?.payment?.status)!=="approved")return reply({ok:true,reason:"Cobrança não aprovada"});
   if(String(invoice?.currency_id)!=="BRL")return reply({ok:true,reason:"Moeda não confirmada"});
   const preapproval=await mpGet("/preapproval/"+encodeURIComponent(String(invoice.preapproval_id)));
   if(String(preapproval?.id)!==String(invoice.preapproval_id)||!preapproval?.external_reference)
    throw new Error("Assinatura não corresponde à cobrança");
   const {error}=await client.rpc("xrmovi_checkout_settle",{
    intent_id:String(preapproval.external_reference),preapproval_id:String(preapproval.id),
    invoice_id:String(invoice.id),payment_id:String(invoice.payment.id),
    paid_amount:Number(invoice.transaction_amount),payment_date:String(invoice.debit_date||invoice.date_created)
   });
   if(error)throw new Error(error.message);
   return reply({ok:true,kind:"payment"});
  }
  if(type==="subscription_preapproval"){
   const sub=await mpGet("/preapproval/"+encodeURIComponent(dataId));
   if(["paused","canceled"].includes(String(sub.status))){
    const {error}=await client.rpc("xrmovi_checkout_provider_status",{preapproval_id:String(sub.id),new_status:String(sub.status)});
    if(error)throw new Error(error.message);
   }
   return reply({ok:true,kind:"subscription"});
  }
  return reply({ok:true,ignored:true});
 }catch(error){
  // Responder erro para permitir retry do provedor; não ativar plano em falhas.
  return reply({error:error instanceof Error?error.message:"Falha ao verificar cobrança"},500);
 }
});
