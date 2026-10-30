// Public, non-sensitive XRMOVI billing readiness flag. Never returns credentials.
import {createClient} from 'npm:@supabase/supabase-js@2.58.0';
const allowed = new Set(['https://frota.nospassa.com.br','https://www.frota.nospassa.com.br']);
Deno.serve(async (request:Request)=>{
 const origin=request.headers.get('origin');
 const headers:Record<string,string>={
  'content-type':'application/json; charset=utf-8',
  'cache-control':'no-store, max-age=0',
  'vary':'Origin'
 };
 if(origin&&allowed.has(origin))headers['access-control-allow-origin']=origin;
 if(origin&&!allowed.has(origin))return new Response(JSON.stringify({enabled:false}),{status:403,headers});
 if(request.method==='OPTIONS'){
  headers['access-control-allow-methods']='GET, OPTIONS';
  headers['access-control-allow-headers']='authorization, apikey, content-type, x-client-info';
  return new Response(null,{status:204,headers});
 }
 if(request.method!=='GET')return new Response(JSON.stringify({enabled:false,error:'Method not allowed'}),{status:405,headers});
 const token=Deno.env.get('XRMOVI_MP_ACCESS_TOKEN')||'';
 const secret=Deno.env.get('XRMOVI_MP_WEBHOOK_SECRET')||'';
 const service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||'';
 const anon=Deno.env.get('SUPABASE_ANON_KEY')||'';
 const url=Deno.env.get('SUPABASE_URL')||'';
 const configured=Deno.env.get('XRMOVI_BILLING_ENABLED')==='true'&&token.startsWith('APP_USR-')&&secret.length>=20&&service.length>20&&anon.length>20&&url.startsWith('https://');
 const pilotOnly=Deno.env.get('XRMOVI_BILLING_PILOT_ONLY')!=='false';
 let pilotAllowed=false;
 if(configured&&pilotOnly){
  const auth=request.headers.get('authorization')||'';
  if(auth.startsWith('Bearer ')){
   try{
    const client=createClient(url,anon,{global:{headers:{Authorization:auth}}});
    const {data,error}=await client.rpc('xrmovi_billing_pilot_allowed');
    pilotAllowed=!error&&data===true;
   }catch{pilotAllowed=false;}
  }
 }
 const enabled=configured&&(!pilotOnly||pilotAllowed);
 return new Response(JSON.stringify({enabled,provider:'mercadopago',mode:enabled?(pilotOnly?'pilot':'production'):'not_ready'}),{status:200,headers});
});