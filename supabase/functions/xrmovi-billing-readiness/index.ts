// Public, non-sensitive XRMOVI billing readiness flag. Never returns credentials.
const allowed = new Set(['https://frota.nospassa.com.br','https://www.frota.nospassa.com.br']);
Deno.serve((request:Request)=>{
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
 const token=Deno.env.get('MERCADOPAGO_ACCESS_TOKEN')||'';
 const secret=Deno.env.get('MERCADOPAGO_WEBHOOK_SECRET')||'';
 const service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||Deno.env.get('SUPABASE_SECRET_KEYS')||'';
 const enabled=Deno.env.get('XRMOVI_BILLING_ENABLED')==='true'&&token.startsWith('APP_USR-')&&secret.length>=20&&service.length>20;
 return new Response(JSON.stringify({enabled,provider:'mercadopago',mode:enabled?'production':'not_ready'}),{status:200,headers});
});