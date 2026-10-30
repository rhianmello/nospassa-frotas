// XRMOVI: authenticated read-only reconciliation against Mercado Pago. NEVER creates a payment.
// Settles only verified, approved recurring invoices that belong to the caller's own account.
import {createClient} from "npm:@supabase/supabase-js@2.58.0";
const origins=new Set(["https://frota.nospassa.com.br","https://www.frota.nospassa.com.br"]);
const json=(data:unknown,status=200,origin:string|null=null)=>{
 const headers:Record<string,string>={"content-type":"application/json; charset=utf-8","cache-control":"no-store","vary":"Origin"};
 if(origin&&origins.has(origin))headers["access-control-allow-origin"]=origin;
 return new Response(JSON.stringify(data),{status,headers});
};
Deno.serve(async(req:Request)=>{
 const origin=req.headers.get("origin");
 if(origin&&!origins.has(origin))return json({error:"Origem não autorizada"},403,origin);
 if(req.method==="OPTIONS")return new Response(null,{status:204,headers:{
  "access-control-allow-origin":origin||"https://frota.nospassa.com.br",
  "access-control-allow-methods":"POST, OPTIONS",
  "access-control-allow-headers":"authorization,apikey,content-type,x-client-info",
  "vary":"Origin"
 }});
 if(req.method!=="POST")return json({error:"Método não permitido"},405,origin);
 const auth=req.headers.get("authorization")||"";
 if(!auth.startsWith("Bearer "))return json({error:"Faça login."},401,origin);
 const url=Deno.env.get("SUPABASE_URL")||"";
 const anon=Deno.env.get("SUPABASE_ANON_KEY")||"";
 const serviceKey=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
 const mpToken=Deno.env.get("XRMOVI_MP_ACCESS_TOKEN")||"";
 if(!url||!anon||!serviceKey||!mpToken.startsWith("APP_USR-"))return json({error:"Verificação de cobrança indisponível."},503,origin);
 try{
  const client=createClient(url,anon,{global:{headers:{Authorization:auth}}});
  const {data:identity,error:authError}=await client.auth.getUser(auth.slice(7));
  if(authError||!identity.user)return json({error:"Sessão inválida."},401,origin);
  const body=await req.json();
  const cid=String(body?.company_id||"");
  if(!/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(cid))
    return json({error:"Empresa inválida."},400,origin);
  const {data:record,error:lookupError}=await client.rpc("xrmovi_checkout_reconcile_lookup",{cid});
  if(lookupError)throw new Error(lookupError.message);
  if(record?.status==="active"&&record?.intent_status==="paid")return json({status:"active",message:"Assinatura já ativa."},200,origin);
  if(!record?.intent_id||!record?.provider_subscription_id||!["created","pending","paid"].includes(record?.intent_status))
    return json({status:"no_payment",message:"Não foi encontrada cobrança vinculada a essa empresa."},200,origin);
  const mpGet=async(path:string)=>{
   const result=await fetch("https://api.mercadopago.com"+path,{headers:{Authorization:"Bearer "+mpToken,Accept:"application/json"},signal:AbortSignal.timeout(10000)});
   if(!result.ok)throw new Error("Falha ao consultar o Mercado Pago. HTTP "+result.status);
   return result.json();
  };
  const preapproval=String(record.provider_subscription_id);
  const subscription=await mpGet("/preapproval/"+encodeURIComponent(preapproval));
  if(String(subscription.id)!==preapproval
    ||String(subscription.external_reference)!==String(record.intent_id)
    ||Number(subscription.collector_id)!==10284642)
    throw new Error("Cobrança não corresponde à conta XRMOVI.");
  if(subscription.status!=="authorized")
    return json({status:"pending",provider_status:subscription.status,message:"Assinatura ainda não autorizada pelo pagador."},200,origin);
  const found=await mpGet("/authorized_payments/search?preapproval_id="+encodeURIComponent(preapproval)+"&limit=10");
  const invoices=Array.isArray(found?.results)?found.results:[];
  const backend=createClient(url,serviceKey,{auth:{persistSession:false}});
  const expected=Number(record.expected_amount);
  for(const item of invoices){
   if(!/^\d+$/.test(String(item?.id||""))||!item?.payment?.id||item.payment.status!=="approved")continue;
   const invoice=await mpGet("/authorized_payments/"+encodeURIComponent(String(item.id)));
   if(String(invoice.preapproval_id)!==preapproval
     ||String(invoice.payment?.id)!==String(item.payment.id)
     ||invoice.payment?.status!=="approved"||invoice.currency_id!=="BRL"
     ||Math.abs(Number(invoice.transaction_amount)-expected)>0.009)continue;
   const payment=await mpGet("/v1/payments/"+encodeURIComponent(String(invoice.payment.id)));
   if(payment.status!=="approved"||payment.currency_id!=="BRL"||payment.live_mode===false
    ||Math.abs(Number(payment.transaction_amount)-expected)>0.009)continue;
   const at=String(payment.date_approved||invoice.debit_date||"");
   if(!Number.isFinite(Date.parse(at)))continue;
   const {data:settled,error:err}=await backend.rpc("xrmovi_checkout_settle",{
    intent_id:String(record.intent_id),preapproval_id:preapproval,invoice_id:String(invoice.id),
    payment_id:String(invoice.payment.id),paid_amount:expected,payment_date:at
   });
   if(err)throw new Error("Pagamento confirmado, mas ativação pendente: "+err.message);
   return json({status:"active",message:"Pagamento confirmado e assinatura liberada.",settlement:settled?.status||"paid"},200,origin);
  }
  return json({status:"pending",message:"Não foi localizada fatura aprovada para esta assinatura. Se acabou de pagar, atualize depois de alguns instantes."},200,origin);
 }catch(error){return json({error:error instanceof Error?error.message:"Falha na verificação de pagamento"},502,origin);}
});