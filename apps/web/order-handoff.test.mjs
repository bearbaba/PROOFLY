import test from "node:test";
import assert from "node:assert/strict";
import {candidateFromArgs,restoreCandidate,discoverCreatedOrder,orderLink,queryOrder} from "./order-handoff.mjs";
const owner="0x"+"a".repeat(40),contributor="0x"+"b".repeat(40),hash="0x"+"c".repeat(64);
const criteria=[{id:"R1",text:"Check one"},{id:"R2",text:"Check two"},{id:"R3",text:"Check three"}];
const args=[contributor,"My task",JSON.stringify(criteria),"https://raw.githubusercontent.com/a/b/commit/doc.txt",
  "d".repeat(64),1791901511,1792333511];
const candidate=candidateFromArgs({before:"2",hash,owner,args});
const order=(id="2")=>({id,title:args[1],owner,contributor,
  status:"PROPOSED",spec:{criteria,reference_url:args[3],reference_sha256:args[4],
    submit_deadline:args[5],revision_deadline:args[6]}});
test("full metadata restores safely after refresh; storage corruption not trusted",()=>{
  assert.deepEqual(restoreCandidate(JSON.stringify(candidate),hash),candidate);
  assert.equal(restoreCandidate(JSON.stringify({...candidate,hash:"bad"}),hash),null);
  assert.equal(restoreCandidate("{",hash),null);
});
test("automatic order handoff works with concurrent different work order",async()=>{
  const scan=[];
  const read=async(name,params=[])=>{
    if(name==="next_order")return "4";
    scan.push(params[0]);
    return params[0]==="2"? {id:"2",owner,contributor,title:"Another task"} : order("3");
  };
  const result=await discoverCreatedOrder(candidate,read);
  assert.equal(result.status,"verified");
  assert.equal(result.order.id,"3");
  assert.deepEqual(scan,["2","3"]);
});
test("never assume transaction id from next counter alone",async()=>{
  const r=await discoverCreatedOrder(candidate,async name=>name==="next_order"?"3":{...order(),owner:"0x"+"e".repeat(40)});
  assert.equal(r.status,"not_found");
});
test("same owner/title but different requirements are not falsely associated",async()=>{
  const r=await discoverCreatedOrder(candidate,async name=>name==="next_order"?"3":({...order(),spec:{...order().spec,reference_sha256:"0".repeat(64)}}));
  assert.equal(r.status,"not_found");
});
test("do not choose among multiple identical concurrent orders",async()=>{
  const r=await discoverCreatedOrder(candidate,async(name,params=[])=>name==="next_order"?"4":order(params[0]));
  assert.equal(r.status,"ambiguous");
});
test("no counter advance and unbounded concurrent changes remain unresolved",async()=>{
  assert.equal((await discoverCreatedOrder(candidate,async()=>"2")).status,"awaiting_state");
  assert.equal((await discoverCreatedOrder(candidate,async()=>"100")).status,"range_too_large");
});
test("deep link carries on-chain order but refuses invalid input",()=>{
  assert.equal(orderLink("https://proofly-lovat.vercel.app/?x=1","2"),
    "https://proofly-lovat.vercel.app/?x=1&order=2");
  assert.equal(queryOrder("?order=2"),"2");
  assert.equal(queryOrder("?order=not-an-id"),null);
  assert.equal(queryOrder("?order=0"),null);
});
