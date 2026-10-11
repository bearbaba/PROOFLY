import test from "node:test";
import assert from "node:assert/strict";
import { createWorkflowGateway, makeRead, makeWrite, IntegrationError } from "./sdk-workflow.mjs";
import { createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
const CONTRACT = "0x" + "1".repeat(40);
const TXID = "0x" + "a".repeat(64);
const DIGEST = "f".repeat(64);
function fake(options={}) {
  const calls = [];
  const client = {
    async readContract(params) { calls.push(["read", params]); return options.returnValue ?? '{"id":"2"}'; },
    async estimateTransactionFeesForWrite(params) {
      calls.push(["estimate", params]);
      if (options.estimateFails) throw new Error("fee unavailable");
      return { distribution: {max:1}, feeValue: 22n };
    },
    async writeContract(params) {
      calls.push(["write", params]);
      return TXID;
    },
    async waitForFinalization(params) {
      calls.push(["wait", params]);
      if (options.waitFails) throw new Error("RPC timeout");
      return { statusName:"FINALIZED", txExecutionResultName: options.executionFails ? "ERROR" : "FINISHED_WITH_RETURN" };
    }
  };
  return { calls, client, gateway:createWorkflowGateway({
    client, contractAddress:CONTRACT, finalVariant:"LATEST_FINAL",
    isSuccessful: tx => tx.txExecutionResultName === "FINISHED_WITH_RETURN"
  })};
}
test("rejects untrusted action names and bad invocation shapes", () => {
  assert.throws(() => makeWrite("set_verdict", ["1"]), /Unknown write/);
  assert.throws(() => makeWrite("evaluate_submission", ["1", "another"]), /Invalid write/);
  assert.throws(() => makeWrite("accept_order", ["1", "invalid"]), /digest/);
  assert.throws(() => makeRead("get_receipt", ["2", 999]), /Submission version/);
  assert.throws(() => makeRead("get_order", ["./bad"]), /Order ID/);
  assert.deepEqual(makeWrite("evaluate_submission", ["1"]), { functionName:"evaluate_submission", args:["1"] });
});
test("fails closed without verified nonzero address and SDK semantics", () => {
  assert.throws(() => createWorkflowGateway({
    client:{}, contractAddress:"0x"+"0".repeat(40), finalVariant:"LATEST_FINAL", isSuccessful:()=>true
  }), /nonzero/);
  assert.throws(() => createWorkflowGateway({
    client:{}, contractAddress:CONTRACT, finalVariant:"LATEST_FINAL", isSuccessful:()=>true
  }), /does not support contract reads/);
  const {client} = fake();
  assert.throws(() => createWorkflowGateway({
    client,contractAddress:CONTRACT,isSuccessful:()=>true
  }), /LATEST_FINAL/);
});
test("finalized read requests explicit FINAL state and decodes JSON", async () => {
  const {gateway,calls}=fake();
  const r=await gateway.readFinal("get_order", ["2"]);
  assert.deepEqual(r.value,{id:"2"});
  assert.equal(r.finalSnapshotRequested,true);
  assert.equal(calls[0][1].transactionHashVariant,"LATEST_FINAL");
  assert.equal(calls[0][1].address,CONTRACT);
});
test("empty onchain records are not mislabeled as found", async () => {
  const {gateway}=fake({returnValue:""});
  const r=await gateway.readFinal("get_receipt",["2",1]);
  assert.equal(r.found,false);
});
test("submit estimates fees, records transaction hash but never calls finality automatically", async () => {
  const {gateway,calls}=fake();
  let stored=null;
  const sent=await gateway.submit("evaluate_submission",["2"], hash => {stored=hash});
  assert.equal(sent.status,"SUBMITTED_NOT_FINAL");
  assert.equal(sent.final,false);
  assert.equal(stored,TXID);
  assert.deepEqual(calls.map(c=>c[0]),["estimate","write"]);
  assert.deepEqual(calls[1][1].fees,{distribution:{max:1},feeValue:22n});
});
test("estimation errors must not attempt a write", async () => {
  const {gateway,calls}=fake({estimateFails:true});
  await assert.rejects(()=>gateway.submit("cancel_order",["2"]),/fee unavailable/);
  assert.deepEqual(calls.map(c=>c[0]),["estimate"]);
});
test("tracking save failure keeps original transaction hash rather than retrying", async () => {
  const {gateway,calls}=fake();
  const r=await gateway.submit("close_expired",["2"],()=>{throw new Error("storage unavailable")});
  assert.equal(r.txId,TXID);
  assert.match(r.trackingNote,/do not re-send/);
  assert.equal(calls.filter(c=>c[0]==="write").length,1);
});
test("a tracking timeout is not proof of a failed or finalized transaction", async () => {
  const {gateway,calls}=fake({waitFails:true});
  const r=await gateway.resumeFinalization(TXID);
  assert.equal(r.status,"TRACKING_UNRESOLVED");
  assert.equal(r.final,false);
  assert.equal(r.txId,TXID);
  assert.deepEqual(calls.map(c=>c[0]),["wait"]);
});
test("finalized consensus with failed execution must NOT be treated as success", async () => {
  const {gateway}=fake({executionFails:true});
  const r=await gateway.resumeFinalization(TXID);
  assert.equal(r.final,true);
  assert.equal(r.status,"FINALIZED_EXECUTION_FAILED");
  assert.equal(r.executionSuccessful,false);
});
test("explicit finalized success is not inferred from a mere hash", async () => {
  const {gateway}=fake();
  const r=await gateway.resumeFinalization(TXID);
  assert.equal(r.final,true);
  assert.equal(r.status,"FINALIZED_SUCCESS");
  assert.equal(r.executionSuccessful,true);
});
test("invalid saved transaction ID is rejected before network read", async () => {
  const {gateway,calls}=fake();
  await assert.rejects(()=>gateway.resumeFinalization("0xbad"),IntegrationError);
  assert.equal(calls.length,0);
});

test("explicit fee review cancellation blocks signing",async()=>{
  const {gateway,calls}=fake();
  await assert.rejects(()=>gateway.submit("evaluate_submission",["2"],null,estimate=>{
    assert.equal(estimate.feeValue,22n);
    return false;
  }),/cancelled/);
  assert.deepEqual(calls.map(x=>x[0]),["estimate"]);
});
test("fee review approval submits exactly once",async()=>{
  const {gateway,calls}=fake();
  const r=await gateway.submit("evaluate_submission",["2"],null,()=>true);
  assert.equal(r.status,"SUBMITTED_NOT_FINAL");
  assert.deepEqual(calls.map(x=>x[0]),["estimate","write"]);
});

test("real pinned genlayer-js 1.1.8 client is compatible without newer fee/finality APIs",()=>{
  const client=createClient({chain:studionet,account:"0x"+"a".repeat(40)});
  assert.equal(typeof client.readContract,"function");
  assert.equal(typeof client.writeContract,"function");
  assert.equal(typeof client.waitForTransactionReceipt,"function");
  assert.equal(typeof client.estimateTransactionFeesForWrite,"undefined");
  assert.equal(typeof client.waitForFinalization,"undefined");
  assert.doesNotThrow(()=>createWorkflowGateway({
    client,contractAddress:CONTRACT,finalVariant:"latest-final",
    isSuccessful:tx=>tx.txExecutionResultName==="FINISHED_WITH_RETURN"
  }));
});
test("legacy 1.1.8 requires explicit cost warning before any signed write",async()=>{
  const calls=[];
  const client={
    readContract:async()=>"",
    writeContract:async args=>{calls.push(["write",args]);return TXID},
    waitForTransactionReceipt:async args=>{
      calls.push(["wait",args]);
      return {statusName:"FINALIZED",txExecutionResultName:"FINISHED_WITH_RETURN"}
    }
  };
  const gateway=createWorkflowGateway({client,contractAddress:CONTRACT,
    finalVariant:"latest-final",isSuccessful:tx=>tx.statusName==="FINALIZED"&&
      tx.txExecutionResultName==="FINISHED_WITH_RETURN"});
  await assert.rejects(()=>gateway.submit("evaluate_submission",["2"]),/Explicit wallet cost review/);
  await assert.rejects(()=>gateway.submit("evaluate_submission",["2"],null,()=>false),/cancelled/);
  assert.equal(calls.length,0);
  const submitted=await gateway.submit("evaluate_submission",["2"],null,estimate=>{
    assert.equal(estimate,null);return true;
  });
  assert.equal(submitted.txId,TXID);
  assert.equal(calls.length,1);
  assert.equal(calls[0][1].value,0n);
  assert.equal("fees" in calls[0][1],false);
  const final=await gateway.resumeFinalization(TXID);
  assert.equal(final.status,"FINALIZED_SUCCESS");
  assert.deepEqual(calls[1][1],{hash:TXID,status:"FINALIZED",fullTransaction:false});
});
