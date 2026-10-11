/** Read-only recent work-order discovery, with a strict bounded RPC budget. */
const ADDR=/^0x[0-9a-fA-F]{40}$/;
const POS=/^[1-9][0-9]*$/;
export function recommendedOperation(order, account) {
  if(!order || !ADDR.test(String(account||"")))return null;
  const connected=account.toLowerCase();
  if(order.contributor?.toLowerCase()===connected) {
    if(order.status==="PROPOSED")return "accept_order";
    if(order.status==="ACTIVE" || order.status==="REVIEWED")return "submit_evidence";
  }
  if(order.status==="SUBMITTED")return "evaluate_submission";
  return null;
}
export function myWorkSummary(records,account) {
  if(!ADDR.test(String(account||"")))return [];
  const a=account.toLowerCase();
  return records.filter(o=>o?.id && (o.owner?.toLowerCase()===a || o.contributor?.toLowerCase()===a))
    .sort((x,y)=>Number(y.id)-Number(x.id)).map(order=>({
      order,
      role:order.owner.toLowerCase()===a?"owner":"contributor",
      next:recommendedOperation(order,account)
    }));
}
export async function listRecentWork(readFinal,account,{limit=25,concurrency=4}={}) {
  if(!ADDR.test(String(account||"")))return {items:[],scanned:0,hasOlder:false};
  const next=String(await readFinal("next_order",[])).replace(/^"|"$/g,"");
  if(!POS.test(next) || !Number.isSafeInteger(Number(next)))throw Error("Unusable finalized next_order count.");
  const latest=Number(next)-1;
  const cap=Math.max(1,Math.min(40,Math.trunc(limit)||25));
  const first=Math.max(1,latest-cap+1);
  const ids=Array.from({length:Math.max(0,latest-first+1)},(_,i)=>String(latest-i));
  const fetched=[];
  const width=Math.max(1,Math.min(5,Math.trunc(concurrency)||4));
  let errors=0;
  for(let i=0;i<ids.length;i+=width){
    const batch=await Promise.allSettled(ids.slice(i,i+width).map(id=>readFinal("get_order",[id])));
    for(const b of batch){if(b.status==="fulfilled"){if(b.value?.id)fetched.push(b.value);} else errors++;}
  }
  return {items:myWorkSummary(fetched,account),scanned:ids.length,
    hasOlder:first>1,errors,latest};
}
