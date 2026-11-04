import test from "node:test";
import assert from "node:assert/strict";
import {
  CANCELED_STATUS, preapprovalPath, preapprovalSearchPath,
  cancelPreapproval, searchPreapprovals
} from "../supabase/functions/xrmovi-pix/preapproval-transport.js";

const id="0123456789abcdef0123456789abcdef";
test("PUT cancel sends clean 'canceled' in JSON body; GET confirms state",async()=>{
  const calls=[];
  const request=async(path,method="GET",body)=>{
    calls.push({path,method,body});
    return method==="PUT"?{status:"canceled"}:{id,status:"canceled"};
  };
  const result=await cancelPreapproval(request,id);
  assert.equal(result.status,"canceled");
  assert.deepEqual(calls,[
    {path:"/preapproval/"+id,method:"PUT",body:{status:"canceled"}},
    {path:"/preapproval/"+id,method:"GET",body:undefined}
  ]);
  assert.equal(CANCELED_STATUS,"canceled");
  assert.equal(JSON.stringify(calls).includes("Timestamp"),false);
});

test("GET search never sends status, including pending or canceled",async()=>{
  const calls=[];
  const request=async(path,method="GET",body)=>{
    calls.push({path,method,body});
    return {results:[],paging:{total:0}};
  };
  await searchPreapprovals(request,{payerEmail:"tester@example.invalid",limit:50,offset:0});
  assert.equal(calls.length,1);
  assert.equal(calls[0].method,"GET");
  assert.equal(calls[0].path,"/preapproval/search?payer_email=tester%40example.invalid&limit=50&offset=0");
  assert.equal(calls[0].path.includes("status="),false);
  assert.equal(calls[0].body,undefined);
});

test("search rejects status filter and log/timestamp suffix before any HTTP call",()=>{
  assert.throws(()=>preapprovalSearchPath({payerEmail:"tester@example.invalid",status:"canceled"}),/não suportado/);
  assert.throws(()=>preapprovalSearchPath({payerEmail:"tester@example.invalid",status:"canceled[Timestamp: 2026-11-04T16:06:31-03:00]"}),/não suportado/);
  assert.throws(()=>preapprovalPath(id+"[Timestamp: 2026-11-04]"),/inválido/);
});

test("a provider 400 is not retried or converted into a successful cancellation",async()=>{
  const calls=[];
  const request=async(path,method,body)=>{
    calls.push({path,method,body});
    const error=new Error("Invalid preapproval status param: canceled");
    error.httpStatus=400;
    throw error;
  };
  await assert.rejects(cancelPreapproval(request,id),/Invalid preapproval status/);
  assert.equal(calls.length,1);
  assert.deepEqual(calls[0].body,{status:"canceled"});
});
