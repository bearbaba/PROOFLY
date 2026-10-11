import test from "node:test";
import assert from "node:assert/strict";
import {listRecentWork,recommendedOperation,myWorkSummary} from "./workboard.mjs";
const owner="0x"+"a".repeat(40),contributor="0x"+"b".repeat(40),other="0x"+"c".repeat(40);
const order=(id,status="PROPOSED",o=owner,c=contributor)=>({id:String(id),title:"Job "+id,status,owner:o,contributor:c});
test("automatically selects actionable Contributor step, never destructive Owner cancel",()=>{
  assert.equal(recommendedOperation(order(2),contributor),"accept_order");
  assert.equal(recommendedOperation(order(2,"ACTIVE"),contributor),"submit_evidence");
  assert.equal(recommendedOperation(order(2,"REVIEWED"),contributor),"submit_evidence");
  assert.equal(recommendedOperation(order(2,"SUBMITTED"),owner),"evaluate_submission");
  assert.equal(recommendedOperation(order(2),owner),null);
  assert.equal(recommendedOperation(order(2,"COMPLETED"),contributor),null);
});
test("workboard separates jobs assigned to Contributor and Owner, sorted by newest",()=>{
 const data=[order(1,"COMPLETED"),order(2,"PROPOSED"),order(3,"ACTIVE",other,other)];
 assert.deepEqual(myWorkSummary(data,contributor).map(x=>x.order.id),["2","1"]);
 assert.deepEqual(myWorkSummary(data,owner).map(x=>x.role),["owner","owner"]);
 assert.equal(myWorkSummary(data,other).length,1);
});
test("recent workboard scans bounded range and does not infer wallet history",async()=>{
 const calls=[];
 const read=async(name,args)=>{calls.push([name,args]);return name==="next_order"?"10":order(args[0]);};
 const r=await listRecentWork(read,contributor,{limit:3});
 assert.equal(r.scanned,3);
 assert.equal(r.hasOlder,true);
 assert.deepEqual(r.items.map(x=>x.order.id),["9","8","7"]);
 assert.deepEqual(calls.slice(1).map(c=>c[1][0]),["9","8","7"]);
});
test("no matching orders is a valid state and no unbounded requests",async()=>{
 const r=await listRecentWork(async(name,args)=>name==="next_order"?"5":order(args[0],"ACTIVE",other,other),owner);
 assert.deepEqual(r.items,[]);
 assert.equal(r.scanned,4);
});
test("partial RPC failure does not fabricate items",async()=>{
 const r=await listRecentWork(async(name,args)=>{
  if(name==="next_order")return "3";
  if(args[0]==="2")throw Error("read timeout");
  return order(args[0]);
 },contributor);
 assert.equal(r.errors,1);
 assert.deepEqual(r.items.map(x=>x.order.id),["1"]);
});
