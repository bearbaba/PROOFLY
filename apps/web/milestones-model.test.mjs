import test from "node:test";
import assert from "node:assert/strict";
import {validateMilestoneSnapshot,validateRelease,nextMilestoneAction,isMilestoneCompleted,V2_CONTRACT} from "./milestones-model.mjs";
const contributor="0xd6b8a3a5eb329410d9504784812b8569afa8c2af";
const owner="0x4c7cb73ac8f8999af21cfc9ff4cf2333a9508dcb";
const h=x=>x.repeat(64);
function fixture(status="COMPLETED"){
 const order={id:"1",title:"Sandbox handoff",owner,contributor,status,spec_sha256:h("9"),spec:{policy:"proofly.milestone-acceptance.v2",source_policy:"AGREED_SPEC_ONLY_V1",reference_url:"https://example.com/reference",reference_sha256:h("a"),criteria:[1,2,3].map(n=>({id:"R"+n,text:"Criterion "+n}))},submissions:[{version:1,artifact_url:"https://example.com/artifact",artifact_sha256:h("b"),outcome:status==="COMPLETED"?"ACCEPTED":null}]};
 const receipt={schema:"proofly.milestone-acceptance.v2",chain_id:61999,contract:V2_CONTRACT,order_id:"1",spec_sha256:h("9"),reference_url:order.spec.reference_url,reference_sha256:h("a"),version:1,artifact_url:order.submissions[0].artifact_url,artifact_sha256:h("b"),outcome:"ACCEPTED",results:[1,2,3].map(n=>({id:"R"+n,status:"SATISFIED",artifact_quote:"yes",reference_quote:"must"}))};
 const grant={order_id:"1",recipient:contributor,policy:"AGREED_SPEC_ONLY_V1",spec_sha256:h("9"),artifact_sha256:h("b"),receipt_version:1,authorized_at:1791858161};
 return {order,receipt,grant};
}
test("v2 accepted receipt and release are bound to deployment, owner spec and contributor",()=>{
 const {order,receipt,grant}=fixture();
 assert.equal(validateMilestoneSnapshot(order,"1",receipt),true);
 assert.equal(validateRelease(order,receipt,grant),true);
});
test("reject wrong contract, network, order, policy, digest or false criterion status",()=>{
 for(const change of [r=>r.chain_id=1,r=>r.contract=owner,r=>r.spec_sha256=h("e"),r=>r.results[0].id="R9",r=>r.results[0].status="UNSATISFIED"]){
  const {order,receipt}=fixture();change(receipt);
  assert.throws(()=>validateMilestoneSnapshot(order,"1",receipt));
 }
 const {order,receipt}=fixture();assert.throws(()=>validateMilestoneSnapshot(order,"2",receipt));
 order.spec.source_policy="UNRESTRICTED";assert.throws(()=>validateMilestoneSnapshot(order,"1",receipt));
});
test("reject mismatched or premature releases",()=>{
 const {order,receipt,grant}=fixture();
 grant.recipient=owner;assert.throws(()=>validateRelease(order,receipt,grant));
 grant.recipient=contributor;grant.artifact_sha256=h("e");assert.throws(()=>validateRelease(order,receipt,grant));
 order.status="SUBMITTED";assert.throws(()=>validateRelease(order,receipt,grant));
});
test("state machine never recommends another claim after a grant",()=>{
 const {order}=fixture();
 assert.equal(nextMilestoneAction(order,contributor,false).method,"claim_milestone_release");
 assert.equal(nextMilestoneAction(order,contributor,true),null);
 assert.equal(nextMilestoneAction(order,owner,false),null);
 order.status="SUBMITTED";assert.equal(nextMilestoneAction(order,owner,false).method,"evaluate_submission");
 order.status="PROPOSED";assert.equal(nextMilestoneAction(order,contributor,false).method,"accept_order");
 order.status="ACTIVE";assert.equal(nextMilestoneAction(order,contributor,false).method,"submit_evidence");
 order.status="CANCELLED";assert.equal(nextMilestoneAction(order,contributor,false),null);
});

test("public completion banner requires a fully validated accepted receipt and matching release grant",()=>{
 const {order,receipt,grant}=fixture();
 assert.equal(isMilestoneCompleted(order,receipt,grant),true);
 assert.equal(isMilestoneCompleted(order,receipt,null),false);
 assert.equal(isMilestoneCompleted({...order,status:"SUBMITTED"},receipt,grant),false);
 assert.equal(isMilestoneCompleted(order,{...receipt,outcome:"CHANGES_REQUIRED"},grant),false);
 assert.equal(isMilestoneCompleted(order,receipt,{...grant,order_id:"999"}),false);
 assert.equal(isMilestoneCompleted(order,{...receipt,contract:owner},grant),false);
});
