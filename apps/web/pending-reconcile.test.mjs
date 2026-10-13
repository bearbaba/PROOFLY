import {test} from "node:test";
import assert from "node:assert/strict";
import {pendingConfirmedByState as matches} from "./pending-reconcile.mjs";
const alice="0xd6b8a3a5eb329410d9504784812b8569afa8c2af";
const bob="0x4c7cb73ac8f8999af21cfc9ff4cf2333a9508dcb";
const base={id:"2",status:"ACTIVE",accepted_at:1791864226,contributor:alice,spec_sha256:"spec-2",submissions:[]};
test("legacy hash without metadata never unlocks",()=>assert.equal(matches({hash:"0xabc"},base,alice),false));
test("acceptance reconciles only correct owner, order and spec",()=>{
 const p={method:"accept_order",orderId:"2",account:alice,specSha:"spec-2"};
 assert.equal(matches(p,base,alice),true);
 assert.equal(matches({...p,orderId:"1"},base,alice),false);
 assert.equal(matches({...p,account:bob},base,alice),false);
 assert.equal(matches({...p,specSha:"wrong"},base,alice),false);
 assert.equal(matches(p,{...base,status:"PROPOSED",accepted_at:null},alice),false);
});
test("submitted evidence must match exact URL, digest, and submission version",()=>{
 const record={method:"submit_evidence",orderId:"2",account:alice,expectedVersion:1,artifactHash:"hash",artifactUrl:"pinned-url"};
 const state={...base,status:"SUBMITTED",submissions:[{version:1,artifact_sha256:"hash",artifact_url:"pinned-url"}]};
 assert.equal(matches(record,state,alice),true);
 assert.equal(matches({...record,artifactHash:"wrong"},state,alice),false);
 assert.equal(matches({...record,expectedVersion:2},state,alice),false);
 assert.equal(matches({...record,artifactUrl:"other-url"},state,alice),false);
 assert.equal(matches(record,{...base,submissions:[]},alice),false);
});
test("verification and release require matching finalized state",()=>{
 const p={method:"evaluate_submission",orderId:"2",account:alice,expectedVersion:1};
 assert.equal(matches(p,{...base,submissions:[{version:1,outcome:null}]},alice),false);
 assert.equal(matches(p,{...base,submissions:[{version:1,outcome:"CHANGES_REQUIRED"}]},alice),true);
 const claim={method:"claim_milestone_release",orderId:"2",account:alice,specSha:"spec-2"};
 assert.equal(matches(claim,base,alice),false);
 assert.equal(matches(claim,base,alice,{order_id:"2",recipient:alice,spec_sha256:"spec-2"}),true);
 assert.equal(matches(claim,base,alice,{order_id:"2",recipient:alice,spec_sha256:"wrong"}),false);
});
