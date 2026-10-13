/** SDK-free fail-closed model for Milestone Gate V2. */
export const V2_CONTRACT="0xb8305F15336a79761157b86e214d3d3DeaDFc1ce";
export const V2_POLICY="proofly.milestone-acceptance.v2";
export const SOURCE_POLICY="AGREED_SPEC_ONLY_V1";
const H=/^[a-f0-9]{64}$/;
const A=/^0x[a-f0-9]{40}$/i;
const id=x=>typeof x==="string"&&/^[1-9][0-9]*$/.test(x);
const assert=(yes,message)=>{if(!yes)throw Error(message);};
const obj=x=>x&&typeof x==="object"&&!Array.isArray(x);
export function validateMilestoneSnapshot(order,expectedId,receipt=null){
 assert(obj(order)&&id(order.id)&&order.id===expectedId,"Order identifier mismatch");
 assert(typeof order.title==="string"&&order.title.trim().length>0,"Invalid title");
 assert(A.test(order.owner)&&A.test(order.contributor)&&order.owner.toLowerCase()!==order.contributor.toLowerCase(),"Invalid parties");
 assert(["PROPOSED","ACTIVE","SUBMITTED","REVIEWED","COMPLETED","CANCELLED","CLOSED_NOT_ACCEPTED"].includes(order.status),"Unknown order status");
 assert(H.test(order.spec_sha256)&&obj(order.spec),"Invalid specification digest");
 assert(order.spec.policy===V2_POLICY&&order.spec.source_policy===SOURCE_POLICY,"Incorrect evidence policy");
 assert(Array.isArray(order.spec.criteria)&&order.spec.criteria.length>=3&&order.spec.criteria.length<=5,"Invalid rubric");
 assert(Array.isArray(order.submissions)&&order.submissions.length<=2,"Invalid submission list");
 for(const [i,s] of order.submissions.entries()){
  assert(obj(s)&&s.version===i+1&&H.test(s.artifact_sha256)&&typeof s.artifact_url==="string","Invalid submission version or evidence");
 }
 if(receipt){
  assert(obj(receipt)&&receipt.schema===V2_POLICY&&receipt.chain_id===61999&&String(receipt.contract).toLowerCase()===V2_CONTRACT.toLowerCase(),"Wrong receipt policy, chain or contract");
  assert(receipt.order_id===order.id&&receipt.spec_sha256===order.spec_sha256&&receipt.reference_sha256===order.spec.reference_sha256&&receipt.reference_url===order.spec.reference_url,"Receipt not bound to specification");
  const submission=order.submissions.find(s=>s.version===receipt.version);
  assert(submission&&submission.artifact_sha256===receipt.artifact_sha256&&submission.artifact_url===receipt.artifact_url&&submission.outcome===receipt.outcome,"Receipt not bound to submission");
  assert(Array.isArray(receipt.results)&&receipt.results.length===order.spec.criteria.length,"Invalid result vector");
  for(const [i,row] of receipt.results.entries()){
   assert(obj(row)&&row.id===order.spec.criteria[i].id&&["SATISFIED","UNSATISFIED","UNVERIFIABLE"].includes(row.status),"Invalid receipt criterion");
   assert(typeof row.artifact_quote==="string"&&typeof row.reference_quote==="string","Invalid quote");
  }
  const expected=receipt.results.some(r=>r.status==="UNSATISFIED")?"CHANGES_REQUIRED":receipt.results.some(r=>r.status==="UNVERIFIABLE")?"EVIDENCE_REQUIRED":"ACCEPTED";
  assert(receipt.outcome===expected,"Receipt verdict contradicts criteria");
  if(order.status==="COMPLETED")assert(receipt.outcome==="ACCEPTED","Completed without accepted receipt");
 }
 return true;
}
export function validateRelease(order,receipt,release){
 assert(obj(release)&&obj(receipt),"Release requires matching receipt");
 assert(order.status==="COMPLETED"&&receipt.outcome==="ACCEPTED","Release without accepted milestone");
 assert(release.order_id===order.id&&release.recipient===order.contributor&&release.policy===SOURCE_POLICY,"Release recipient or policy mismatch");
 assert(release.spec_sha256===order.spec_sha256&&release.artifact_sha256===receipt.artifact_sha256&&release.receipt_version===receipt.version,"Release digest or version mismatch");
 assert(Number.isSafeInteger(release.authorized_at)&&release.authorized_at>0,"Invalid authorization timestamp");
 return true;
}
export function nextMilestoneAction(order,account,hasGrant=false){
 if(!order||!A.test(account||""))return null;
 const contributor=account.toLowerCase()===order.contributor.toLowerCase();
 if(order.status==="PROPOSED"&&contributor)return {method:"accept_order",label:"Accept agreed specification in MetaMask →"};
 if((order.status==="ACTIVE"||order.status==="REVIEWED")&&contributor&&order.submissions.length<2)return {method:"submit_evidence",label:"Submit hashed evidence in MetaMask →"};
 if(order.status==="SUBMITTED")return {method:"evaluate_submission",label:"Request GenLayer verification →"};
 if(order.status==="COMPLETED"&&contributor&&!hasGrant)return {method:"claim_milestone_release",label:"Claim on-chain release authorization →"};
 return null;
}
