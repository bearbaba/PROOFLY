import { test } from "node:test";
import assert from "node:assert/strict";
import { parseStudioPlan, decodeRead, roleFor, preparedAction, describeReceipt, CONTRACT, CHAIN_ID } from "./live-model.mjs";

const fixture = (await import("./studio-plan.mjs")).createStudioPlan({
  contributor:"0x" + "2".repeat(40), title:"Docs",
  criteria:[1,2,3].map(n=>({id:"R"+n,text:"Check the evidence for step "+n})),
  reference_url:"https://raw.githubusercontent.com/bearbaba/PROOFLY/"+"a".repeat(40)+"/fixtures/evidence/reference.txt",
  reference_sha256:"a".repeat(64),submit_deadline:1800010000,revision_deadline:1800020000
},1799900000000);
test("studio plan prepares seven real ABI args",()=>{
  assert.equal(parseStudioPlan(fixture,1799900000000).args.length,7);
  assert.equal(CHAIN_ID,61999);
  assert.equal(CONTRACT.length,42);
});
test("altered or expired plan rejected",()=>{
  assert.throws(()=>parseStudioPlan({...fixture,stage:"SIGNED"},1799900000000));
  assert.throws(()=>parseStudioPlan(fixture,1900000000000));
  assert.throws(()=>parseStudioPlan({...fixture,named_args:{...fixture.named_args,title:"tampered"}},1799900000000));
});
test("read decoding and wallet role use exact values",()=>{
  assert.equal(decodeRead("get_order",""),null);
  assert.deepEqual(decodeRead("get_order",'{"status":"ACTIVE"}'),{status:"ACTIVE"});
  assert.equal(roleFor({owner:"0x"+"1".repeat(40),contributor:"0x"+"2".repeat(40)},"0x"+"2".repeat(40)),"contributor");
  assert.equal(roleFor(null,"0x"+"1".repeat(40)),"viewer");
});
test("write preparation never invents spec or arbitrary method",()=>{
  assert.throws(()=>preparedAction("accept_order","1",null));
  assert.deepEqual(preparedAction("evaluate_submission","1",null),["1"]);
  assert.throws(()=>preparedAction("set_verdict","1",null));
  assert.deepEqual(preparedAction("accept_order","1",{spec_sha256:"a".repeat(64)}),["1","a".repeat(64)]);
});
test("receipt result must match deterministic aggregation",()=>{
  assert.deepEqual(describeReceipt({outcome:"ACCEPTED",results:[{status:"SATISFIED"},{status:"SATISFIED"}]}),
    {status:"ACCEPTED",satisfied:2,total:2,consistent:true});
  assert.equal(describeReceipt({outcome:"ACCEPTED",results:[{status:"UNVERIFIABLE"}]}).consistent,false);
  assert.throws(()=>describeReceipt({results:[{status:"SKIPPED"}]}));
});
