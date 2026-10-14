import test from "node:test";
import assert from "node:assert/strict";
import {addTx,setTxStatus,readTxs,txLabel,KEY} from "./tx-history.mjs";
const storage=()=>{const m=new Map();return {getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,v)}};
const owner="0x"+"a".repeat(40),worker="0x"+"b".repeat(40),hash="0x"+"c".repeat(64),hash2="0x"+"d".repeat(64);
test("transaction history persists distinct txs across wallet accounts",()=>{
 const s=storage();
 assert.equal(addTx(s,{hash,account:owner,method:"create_order"}),true);
 assert.equal(addTx(s,{hash,account:owner,method:"create_order"}),true);
 assert.equal(addTx(s,{hash:hash2,account:worker,method:"accept_order",orderId:"2"}),true);
 assert.deepEqual(readTxs(s).map(x=>x.hash),[hash2,hash]);
 assert.equal(setTxStatus(s,hash,"ONCHAIN_VERIFIED","2"),true);
 assert.equal(readTxs(s)[1].orderId,"2");
 addTx(s,{hash,account:owner,method:"create_order"});
 assert.equal(readTxs(s)[1].status,"ONCHAIN_VERIFIED");
});
test("a tracking timeout never downgrades a successful verified read",()=>{
 const s=storage();addTx(s,{hash,account:owner,method:"evaluate_submission",orderId:"2"});
 setTxStatus(s,hash,"ONCHAIN_VERIFIED");
 assert.equal(setTxStatus(s,hash,"TRACKING_UNRESOLVED"),false);
 assert.equal(readTxs(s)[0].status,"ONCHAIN_VERIFIED");
 assert.match(txLabel("ONCHAIN_VERIFIED"),/on-chain/);
});
test("no fabricated, duplicate or malformed entry",()=>{
 const s=storage();
 assert.equal(addTx(s,{hash:"bad",account:owner,method:"create_order"}),false);
 assert.equal(addTx(s,{hash,account:owner,method:"unknown"}),false);
 assert.equal(addTx(s,{hash,account:owner,method:"create_order",orderId:"<script>"}),false);
 assert.equal(setTxStatus(s,hash,"FINALIZED_SUCCESS"),false);
 s.setItem(KEY,'[{"bad":"entry"}]');
 assert.deepEqual(readTxs(s),[]);
});
test("unavailable storage fails open for real wallet flow, not fabricated success",()=>{
 const s={getItem:()=>{throw Error("blocked")},setItem:()=>{throw Error("blocked")}};
 assert.deepEqual(readTxs(s),[]);
 assert.equal(addTx(s,{hash,account:owner,method:"submit_evidence",orderId:"2"}),false);
 assert.equal(setTxStatus(s,hash,"ONCHAIN_VERIFIED"),false);
});
test("all supported write methods can be recorded without a global cap",()=>{
 const s=storage(),methods=["create_order","accept_order","cancel_order","submit_evidence","evaluate_submission","claim_milestone_release","close_expired"];
 methods.forEach((method,i)=>assert.equal(addTx(s,{hash:"0x"+String(i+1).repeat(64),account:owner,method}),true));
 assert.equal(readTxs(s).length,7);
});
