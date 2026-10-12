import test from "node:test";
import assert from "node:assert/strict";
import {transactionBanner} from "./tx-progress.mjs";
test("finalized receipt without execution result is not interpreted as failure",()=>{
 const a=transactionBanner("FINALIZED / EXECUTION NOT VERIFIED");
 assert.equal(a.tone,"partial");
 assert.match(a.title,/details incomplete/i);
 assert.match(a.detail,/outcome remains unverified/i);
});
test("verified order status and unknown receipt are distinguished",()=>{
 const a=transactionBanner("FINALIZED / EXECUTION NOT VERIFIED",{id:"2",status:"ACTIVE"});
 assert.equal(a.title,"Work order #2 · ACTIVE on-chain");
 assert.match(a.detail,/not independently verified/);
 assert.doesNotMatch(a.detail,/transaction succeeded/i);
});
test("never attribute a malformed or arbitrary on-chain record to a transaction",()=>{
 const a=transactionBanner("FINALIZED / EXECUTION NOT VERIFIED",{id:"foo",status:"ACTIVE"});
 assert.equal(a.title,"Transaction finalized · details incomplete");
 const b=transactionBanner("FINALIZED / EXECUTION NOT VERIFIED",{id:"2",status:"FAKE"});
 assert.equal(b.title,"Transaction finalized · details incomplete");
});
test("explicit GenVM error remains error even when order is ACTIVE",()=>{
 const a=transactionBanner("FINALIZED / EXECUTION FAILED",{id:"2",status:"ACTIVE"});
 assert.equal(a.tone,"error");
 assert.match(a.title,/failed/);
});
test("explicit finalized and executed-success gets success badge",()=>{
 const a=transactionBanner("FINALIZED / EXECUTION SUCCESS",{id:"2",status:"ACTIVE"});
 assert.equal(a.tone,"success");
});
test("unconfirmed transaction never tells user to resubmit",()=>{
 const a=transactionBanner("SUBMITTED — AUTO TRACKING");
 assert.equal(a.tone,"pending");
 assert.match(a.detail,/Do not submit/i);
});
