/** Browser-local journal: transaction history is not a chain index. */
export const KEY="proofly.indexed.61999.b8305f15336a79761157b86e214d3d3deadfc1ce.tx-history.v1";
const HASH=/^0x[a-f0-9]{64}$/i,ADDRESS=/^0x[a-f0-9]{40}$/i,ID=/^[1-9][0-9]*$/;
const METHODS=new Set(["create_order","accept_order","cancel_order","submit_evidence","evaluate_submission","claim_milestone_release","close_expired"]);
const STATES=new Set(["SUBMITTED","TRACKING_UNRESOLVED","ONCHAIN_VERIFIED","FINALIZED_SUCCESS","EXECUTION_FAILED"]);
function valid(x){return x&&typeof x==="object"&&HASH.test(x.hash||"")&&ADDRESS.test(x.account||"")&&METHODS.has(x.method)&&
 (x.orderId===null||(typeof x.orderId==="string"&&ID.test(x.orderId)))&&STATES.has(x.status)&&Number.isSafeInteger(x.submittedAt)&&x.submittedAt>0;}
export function readTxs(storage){
 try{const value=JSON.parse(storage.getItem(KEY)||"[]");if(!Array.isArray(value))return [];
 const seen=new Set();return value.filter(x=>{if(!valid(x)||seen.has(x.hash.toLowerCase()))return false;seen.add(x.hash.toLowerCase());return true;});}
 catch{return [];}
}
export function addTx(storage,{hash,account,method,orderId=null,submittedAt=Date.now()}){
 const entry={hash,account,method,orderId,submittedAt,status:"SUBMITTED"};
 if(!valid(entry))return false;
 const list=readTxs(storage);if(!list.some(x=>x.hash.toLowerCase()===hash.toLowerCase()))list.unshift(entry);
 try{storage.setItem(KEY,JSON.stringify(list));return true;}catch{return false;}
}
export function setTxStatus(storage,hash,status,orderId=null){
 if(!HASH.test(hash||"")||!STATES.has(status))return false;
 const list=readTxs(storage),i=list.findIndex(x=>x.hash.toLowerCase()===hash.toLowerCase());
 if(i<0)return false;
 const current=list[i].status;
 if((current==="ONCHAIN_VERIFIED"||current==="FINALIZED_SUCCESS")&&["SUBMITTED","TRACKING_UNRESOLVED"].includes(status))return false;
 if(current==="EXECUTION_FAILED"&&status!=="EXECUTION_FAILED")return false;
 list[i]={...list[i],status,orderId:typeof orderId==="string"&&ID.test(orderId)?orderId:list[i].orderId};
 try{storage.setItem(KEY,JSON.stringify(list));return true;}catch{return false;}
}
export function txLabel(status){
 return {SUBMITTED:"Submitted · awaiting confirmation",TRACKING_UNRESOLVED:"Receipt unknown · check Explorer",ONCHAIN_VERIFIED:"Effect verified on-chain",FINALIZED_SUCCESS:"GenVM execution confirmed",EXECUTION_FAILED:"GenVM execution failed"}[status]||"Unverified";
}
