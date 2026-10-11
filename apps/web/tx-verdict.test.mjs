import test from "node:test";
import assert from "node:assert/strict";
import {inspectTransaction} from "./tx-verdict.mjs";

test("explicit finalized, executed result is successful",()=>{
  assert.equal(inspectTransaction({statusName:"FINALIZED",
    txExecutionResultName:"FINISHED_WITH_RETURN"}).kind,"success");
  assert.equal(inspectTransaction({status_name:"FINALIZED",
    txExecutionResult:1}).kind,"success");
  assert.equal(inspectTransaction({status:7,tx_execution_result:1}).kind,"success");
});
test("explicit finalized failed execution is failure",()=>{
  assert.equal(inspectTransaction({status_name:"FINALIZED",
    tx_execution_result_name:"FINISHED_WITH_ERROR"}).kind,"failed");
  assert.equal(inspectTransaction({status:7,txExecutionResult:2}).kind,"failed");
});
test("finalized without an execution result MUST NOT be marked failed",()=>{
  const state=inspectTransaction({status_name:"FINALIZED"});
  assert.equal(state.kind,"unverified");
  assert.equal(state.finalized,true);
  assert.equal(state.execution,"UNKNOWN");
});
test("missing status and execution do not invent finality or error",()=>{
  assert.deepEqual(inspectTransaction({result:{consensus_data:{}}}).kind,"pending");
  assert.equal(inspectTransaction({}).consensus,"UNKNOWN");
});
test("accepted is not finalized even with successful execution",()=>{
  const state=inspectTransaction({status_name:"ACCEPTED",
    txExecutionResultName:"FINISHED_WITH_RETURN"});
  assert.equal(state.kind,"pending");
});
test("legacy simplified SDK snake_case status and hidden execution are unverified",()=>{
  const simplified={status_name:"FINALIZED",consensus_data:{votes:[]},txExecutionResultName:undefined};
  assert.equal(inspectTransaction(simplified).kind,"unverified");
});
