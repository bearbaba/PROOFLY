import { test } from "node:test";
import assert from "node:assert/strict";
import { parseStudioPlan, decodeRead, roleFor, preparedAction, describeReceipt, prepareUserOrder, CONTRACT, CHAIN_ID } from "./live-model.mjs";

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

test("ordinary work order form builds real seven-argument ABI without JSON export",()=>{
  const now=1791710000000;
  const args=prepareUserOrder({
    title:"Test a real customer guide",
    contributor:"0x"+"2".repeat(40),
    reference_url:"https://raw.githubusercontent.com/bearbaba/PROOFLY/"+"a".repeat(40)+"/fixtures/evidence/reference.txt",
    reference_sha256:"f".repeat(64),
    criterion1:"Include a trial notice.",criterion2:"State all three reading steps.",
    criterion3:"Explain how to fix two documented errors.",
    submit_days:"2",revision_days:"7"
  },now);
  assert.equal(args.length,7);
  assert.equal(args[0],"0x"+"2".repeat(40));
  assert.equal(JSON.parse(args[2]).length,3);
  assert.equal(args[5],Math.floor(now/1000)+2*86400);
  assert.equal(args[6],Math.floor(now/1000)+7*86400);
});
test("ordinary form rejects incomplete requirements or invalid deadlines",()=>{
  const form={
    title:"Docs",contributor:"0x"+"2".repeat(40),
    reference_url:"https://raw.githubusercontent.com/bearbaba/PROOFLY/"+"a".repeat(40)+"/fixtures/evidence/reference.txt",
    reference_sha256:"a".repeat(64),
    criterion1:"Good one",criterion2:"Good two",criterion3:"Good three",
    submit_days:"2",revision_days:"7"
  };
  assert.throws(()=>prepareUserOrder({...form,criterion3:""},1791710000000));
  assert.throws(()=>prepareUserOrder({...form,revision_days:"2"},1791710000000),/later revision/);
  assert.throws(()=>prepareUserOrder({...form,reference_sha256:"invalid"},1791710000000));
});
