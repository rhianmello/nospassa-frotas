// XRMOVI - Edge Function de checkout Mercado Pago (desativada até configuração comercial).
// Deploy com verify_jwt=true. NUNCA inserir token Mercado Pago ou service_role no GitHub.
import { createClient } from "npm:@supabase/supabase-js@2.58.0";
const json=(body:unknown,status=200,origin="https://frota.nospassa.com.br")=>new Response(JSON.stringify(body),{
 status,headers:{"content-type":"application/json","access-control-allow-origin":origin,"vary":"Origin"}
});
const originAllowed=(origin:string|null)=>origin===null||["https://frota.nospassa.com.br","https://www.frota.nospassa.com.br"].includes(origin);
Deno.serve(async(req:Request)=>{
 const origin=req.headers.get("origin");
 if(!originAllowed(origin))return json({error:"Origem não autorizada"},403);
 const outputOrigin=origin||"https://frota.nospassa.com.br";
 if(req.method==="OPTIONS")return new Response(null,{status:204,headers:{
  "access-control-allow-origin":outputOrigin,"access-control-allow-methods":"POST, OPTIONS",
  "access-control-allow-headers":"authorization, apikey, content-type","vary":"Origin"
 }});
 if(req.method!=="POST")return json({error:"Método não permitido"},405,outputOrigin);
 if(Deno.env.get("XRMOVI_BILLING_ENABLED")!=="true")return json({error:"Checkout ainda não habilitado."},503,outputOrigin);
 const token=Deno.env.get("MERCADOPAGO_ACCESS_TOKEN");
 const supabaseUrl=Deno.env.get("SUPABASE_URL"),anonKey=Deno.env.get("SUPABASE_ANON_KEY"),serviceKey=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
 if(!token||!supabaseUrl||!anonKey||!serviceKey)return json({error:"Configuração de cobrança incompleta."},503,outputOrigin);
 const bearer=req.headers.get("authorization")||"";
 if(!bearer.startsWith("Bearer "))return json({error:"Faça login antes de contratar."},401,outputOrigin);
 try{
  const authClient=createClient(supabaseUrl,anonKey,{global:{headers:{Authorization:bearer}}});
  const {data:auth,error:authError}=await authClient.auth.getUser(bearer.slice(7));
  if(authError||!auth.user)return json({error:"Sessão inválida."},401,outputOrigin);
  const payload=await req.json();
  const cid=String(payload?.company_id||""),chosen=String(payload?.plan||"");
  if(!/^[0-9a-f-]{36}$/i.test(cid)||!["start","pro","business","advanced"].includes(chosen))
    return json({error:"Dados inválidos."},400,outputOrigin);
  const {data:intent,error:intentError}=await authClient.rpc("xrmovi_checkout_prepare",{cid,chosen_plan:chosen});
  if(intentError)throw new Error(intentError.message);
  const price=Number(intent.amount_brl);
  if(!Number.isFinite(price)||price<=0)throw new Error("Preço inválido.");
  const mp=await fetch("https://api.mercadopago.com/preapproval",{
   method:"POST",
   headers:{"Authorization":"Bearer "+token,"Content-Type":"application/json","X-Idempotency-Key":String(intent.intent_id)},
   body:JSON.stringify({
    reason:"XRMOVI — Plano "+chosen,
    external_reference:String(intent.intent_id),
    payer_email:String(intent.payer_email),
    auto_recurring:{frequency:1,frequency_type:"months",transaction_amount:price,currency_id:"BRL"},
    back_url:"https://frota.nospassa.com.br/v3/#subscription",
    status:"pending"
   })
  });
  if(!mp.ok)throw new Error("O provedor de cobrança não autorizou a criação do checkout.");
  const response=await mp.json();
  if(!response?.id||!response?.init_point||!String(response.init_point).startsWith("https://"))
    throw new Error("Checkout sem link válido.");
  const service=createClient(supabaseUrl,serviceKey,{auth:{persistSession:false}});
  const {error:bindError}=await service.rpc("xrmovi_checkout_attach",{intent_id:intent.intent_id,preapproval_id:String(response.id)});
  if(bindError)throw new Error("Falha no vínculo seguro da assinatura.");
  return json({checkout_url:String(response.init_point),status:"pending"},200,outputOrigin);
 }catch(error){
  return json({error:error instanceof Error?error.message:"Não foi possível abrir o checkout."},400,outputOrigin);
 }
});
