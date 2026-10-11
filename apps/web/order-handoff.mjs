/** Deterministic recovery of a newly created on-chain work order.
 * Reads contract state; never equates "next order number" with transaction ID.
 * Multiple exact matches are ambiguous rather than silently selecting one.
 */
const ID=/^[1-9][0-9]{0,9}$/;
const ADDRESS=/^0x[0-9a-f]{40}$/i;
const HEX=/^[0-9a-f]{64}$/;
const HASH=/^0x[0-9a-f]{64}$/i;
function validId(value) {
  const id=String(value);
  if(!ID.test(id))throw Error("Invalid work order counter.");
  return Number(id);
}
export function orderLink(origin,id) {
  const n=validId(id);
  const url=new URL(origin);
  if(url.protocol!=="https:" && url.protocol!=="http:")
    throw Error("Invalid link origin");
  url.searchParams.set("order",String(n));
  url.hash="";
  return url.toString();
}
export function queryOrder(search) {
  const raw=new URLSearchParams(search).get("order");
  if(raw===null)return null;
  try{return String(validId(raw));}catch{return null;}
}
export function candidateFromArgs({before,hash,owner,args}) {
  validId(before);
  if(!HASH.test(hash)||!ADDRESS.test(owner)||!Array.isArray(args)||args.length!==7)
    throw Error("Invalid pending transaction metadata.");
  const [contributor,title,criteriaJson,referenceUrl,referenceHash,submit,revision]=args;
  if(!ADDRESS.test(contributor)||typeof title!=="string"||typeof referenceUrl!=="string"||
     !HEX.test(referenceHash)||!Number.isSafeInteger(submit)||!Number.isSafeInteger(revision))
    throw Error("Invalid planned create_order arguments.");
  const criteria=JSON.parse(criteriaJson);
  if(!Array.isArray(criteria)||criteria.length<3)
    throw Error("Invalid criteria for planned order.");
  return {before:String(before),hash,owner:owner.toLowerCase(),
    contributor:contributor.toLowerCase(),title,criteria,
    referenceUrl,referenceHash,submit,revision};
}
export function restoreCandidate(raw,hash) {
  try{
    const data=JSON.parse(raw);
    if(!data || data.hash!==hash) return null;
    return candidateFromArgs({before:data.before,hash:data.hash,owner:data.owner,
      args:[data.contributor,data.title,JSON.stringify(data.criteria),
        data.referenceUrl,data.referenceHash,data.submit,data.revision]});
  }catch{return null;}
}
function matches(order,id,c) {
  const spec=order?.spec;
  return String(order?.id)===String(id) &&
    String(order?.owner).toLowerCase()===c.owner &&
    String(order?.contributor).toLowerCase()===c.contributor &&
    order.title===c.title &&
    spec?.reference_url===c.referenceUrl &&
    spec?.reference_sha256===c.referenceHash &&
    Number(spec?.submit_deadline)===c.submit &&
    Number(spec?.revision_deadline)===c.revision &&
    JSON.stringify(spec?.criteria)===JSON.stringify(c.criteria);
}
/** Never invent order IDs, even if another user created one concurrently.
 * Only one exact match and full range coverage qualifies as verified.
 */
export async function discoverCreatedOrder(candidate,readFinal,{maxScan=32}={}) {
  const first=validId(candidate.before);
  const after=validId(await readFinal("next_order",[]));
  if(after<=first)return {status:"awaiting_state",matches:[]};
  if(after-first>maxScan)return {status:"range_too_large",matches:[]};
  const matchesFound=[];
  for(let id=first;id<after;id++){
    const order=await readFinal("get_order",[String(id)]);
    if(matches(order,id,candidate))matchesFound.push(order);
  }
  if(matchesFound.length!==1)
    return {status:matchesFound.length?"ambiguous":"not_found",matches:matchesFound};
  return {status:"verified",order:matchesFound[0]};
}
