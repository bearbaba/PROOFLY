/** PROOFLY v2: never confuse finalized RPC readback with transaction execution. */
import {createClient} from "genlayer-js";
import {studionet} from "genlayer-js/chains";
import {TransactionHashVariant} from "genlayer-js/types";
import {createWorkflowGateway} from "./sdk-workflow.mjs";
import {inspectTransaction} from "./tx-verdict.mjs";
import {pendingConfirmedByState} from "./pending-reconcile.mjs";
import {validateMilestoneSnapshot, validateRelease, nextMilestoneAction, V2_CONTRACT} from "./milestones-model.mjs";

const $=id=>document.getElementById(id);
const readClient=createClient({chain:studionet});
const final=TransactionHashVariant.LATEST_FINAL;
const PENDING_KEY="proofly.indexed.61999.b8305f15336a79761157b86e214d3d3deadfc1ce.pending-write";
let order=null, receipt=null, grant=null, account="", gateway=null, busy=false, unresolved=false;
try{unresolved=Boolean(localStorage.getItem(PENDING_KEY));}catch{unresolved=true;}

const provider=()=>window.ethereum;
const PENDING_META_KEY=PENDING_KEY+".meta";
function getPending(){
 try{const hash=localStorage.getItem(PENDING_KEY);if(!hash)return null;
 const m=JSON.parse(localStorage.getItem(PENDING_META_KEY)||"null");
 return {hash,...(m&&typeof m==="object"?m:{})};}catch{return null;}
}
function savePending(hash,method,context={}){
 unresolved=true;
 try{localStorage.setItem(PENDING_KEY,hash);localStorage.setItem(PENDING_META_KEY,JSON.stringify({method,account,orderId:context.orderId||order?.id||null,submittedAt:Date.now(),...context}));}catch{}
}
function clearPending(){unresolved=false;try{localStorage.removeItem(PENDING_KEY);localStorage.removeItem(PENDING_META_KEY);localStorage.removeItem(PENDING_KEY+".method");}catch{}}
function reconcilePending(){
 const pending=getPending();
 if(!pending||!order||!account)return;
 if(pendingConfirmedByState(pending,order,account,grant)){
  clearPending();
  showProgress("On-chain state confirmed","The saved transaction effect is present in the finalized order. Pending tracking cleared without another signature.",pending.hash);
  $("milestoneTx").textContent="Saved "+pending.method+" effect verified from finalized contract state. No resubmission.";
 }
}

function showProgress(title,details,hash="",attention=false){
 const box=$("v2LiveStatus");box.hidden=false;box.dataset.state=attention?"attention":"success";
 $("v2LiveTitle").textContent=title;$("v2LiveBody").textContent=details;
 const links=$("v2LiveLinks");links.replaceChildren();
 if(/^0x[a-fA-F0-9]{64}$/.test(hash)){const a=node("a","View transaction in Explorer ↗");a.href="https://explorer-studio.genlayer.com/tx/"+hash;a.target="_blank";a.rel="noopener noreferrer";links.append(a);}
}
async function recoverCreatedOrder(pending){
 if(pending?.method!=="create_order"||pending.account?.toLowerCase()!==account||!pending.expectedOrderId)return null;
 try{
  const rec=await read("get_order",[pending.expectedOrderId]);
  if(!rec||rec.id!==pending.expectedOrderId||rec.title!==pending.title||
     rec.owner.toLowerCase()!==account||rec.contributor.toLowerCase()!==pending.contributor?.toLowerCase()||
     rec.spec.reference_url!==pending.referenceUrl||rec.spec.reference_sha256!==pending.referenceSha||
     JSON.stringify(rec.spec.criteria)!==JSON.stringify(pending.criteria))return null;
  validateMilestoneSnapshot(rec,pending.expectedOrderId);
  $("milestoneId").value=rec.id;
  clearPending();
  showProgress("Created milestone verified","Matching on-chain order #"+rec.id+" was read from finalized state; no second signature was sent.",pending.hash);
  $("milestoneTx").textContent="Created Work Order #"+rec.id+" confirmed by finalized state.";
  await load();void discoverRecentOrders(true);
  return rec.id;
 }catch{return null;}
}
async function recoverLegacyCreate(){
 const pending=getPending();
 if(!pending||pending.method!=="create_order"||pending.expectedOrderId||!account||busy||
    !/^0x[a-fA-F0-9]{64}$/.test(pending.hash))return;
 const yes=window.confirm("Legacy transaction recovery (NO NEW SIGNATURE)\\n\\nVerify this EXACT hash in Explorer:\\n"+pending.hash+"\\n\\nMethod must be create_order. From must match this connected Owner wallet, To must match the PROOFLY V2 contract, and GenVM execution must say SUCCESS / Return. Have you independently verified ALL these fields?");
 if(!yes)return;
 busy=true;renderActions();
 try{
  const n=BigInt(String(await readClient.readContract({address:V2_CONTRACT,functionName:"next_order",args:[],transactionHashVariant:final})));
  const found=[];
  for(let j=n-1n;j>=1n&&j>=n-20n;j--){
   const id=String(j),rec=await read("get_order",[id]);
   if(rec&&rec.title===pending.title&&rec.owner.toLowerCase()===account&&
      rec.contributor.toLowerCase()==="0xd6b8a3a5eb329410d9504784812b8569afa8c2af"&&
      rec.spec.reference_sha256==="0b39481c3ca9bff673adb40d08eb2d0b04cb27ab4510255d3b699778826f1aec"&&
      rec.spec.criteria.length===3&&rec.spec.criteria[2].text.includes("Retry-After")){
    validateMilestoneSnapshot(rec,id);found.push(id);
   }
  }
  if(found.length!==1)throw Error("Expected exactly one matching finalized demo order in the recent 20 orders; found "+found.length+". Manual review required.");
  const id=found[0];
  clearPending();busy=false;$("milestoneId").value=id;
  showProgress("Legacy creation recovered","Verified Owner, Contributor, pinned reference and rubric of Work Order #"+id+" after explicit Explorer check. No transaction resent.",pending.hash);
  await load();void discoverRecentOrders(true);
 }catch(e){
  showProgress("Legacy recovery requires review",String(e.message||e)+" Do not resubmit.",pending.hash,true);
 }finally{busy=false;renderActions();}
}
async function recheckSavedCreate(){
 const pending=getPending();
 if(!pending||pending.method!=="create_order"||!gateway||!account||busy)return;
 busy=true;renderActions();
 try{
  const verdict=await gateway.resumeFinalization(pending.hash);
  busy=false;
  const id=await recoverCreatedOrder(pending);
  if(!id){
   showProgress("Transaction still needs review","Receipt: "+verdict.status+". No exact matching finalized order found. Inspect Explorer; do not sign again.",pending.hash,true);
   $("milestoneTx").textContent="Cannot safely reconcile saved create_order "+pending.hash+".";
  }
 }catch(e){showProgress("Recovery inconclusive",String(e.message||e),pending.hash,true);}
 finally{busy=false;renderActions();}
}
// Single indexed contract: wallet pages are fetched directly from on-chain indexes.
const PAGE_SIZE=20;
let workOffset=0,workMore=false,discoveryBusy=false,discoveryEpoch=0;
const discoveredOrders=new Map(),seenByRole={owner:new Set(),contributor:new Set()};
async function indexedPage(role,wallet,offset){
 const method=role==="owner"?"list_owner_order_ids":"list_contributor_order_ids";
 const result=await read(method,[wallet,offset,PAGE_SIZE]);
 if(!result||result.wallet?.toLowerCase()!==wallet||result.role!==role||
    !Array.isArray(result.order_ids)||result.order_ids.length>PAGE_SIZE||
    !Number.isSafeInteger(result.total)||result.total<0||
    typeof result.has_more!=="boolean")throw Error("Malformed "+method+" index response");
 return result;
}
function renderDiscovery(){
 const box=$("v2RecentOrders");box.replaceChildren();
 const items=[...discoveredOrders.values()].sort((a,b)=>BigInt(a.id)>BigInt(b.id)?-1:1);
 $("v2DiscoveryTitle").textContent=account?"My Work · Owner & Contributor":"Recent milestones";
 if(!items.length)box.append(node("p",account?"No indexed work found for this wallet.":"No milestones found.","milestone-small"));
 for(const item of items){
  const entry=node("button","#"+item.id+" · "+item.title);
  entry.type="button";
  const role=account?(item.contributor.toLowerCase()===account?"Assigned Contributor":item.owner.toLowerCase()===account?"Owner":"Public"):"Public";
  entry.append(node("small",role+" · "+item.status+" · Owner "+item.owner.slice(0,8)+"… · Contributor "+item.contributor.slice(0,8)+"…"));
  entry.addEventListener("click",()=>{$("milestoneId").value=item.id;void load();});
  box.append(entry);
 }
 $("v2LoadOlder").hidden=!workMore;
 $("v2LoadOlder").disabled=discoveryBusy;
 $("v2FindMyWork").hidden=true;
}
async function discoverRecentOrders(reset=true){
 if(discoveryBusy)return;
 const epoch=++discoveryEpoch;
 const button=$("v2RefreshRecent");discoveryBusy=true;button.disabled=true;
 try{
  if(reset){workOffset=0;workMore=false;discoveredOrders.clear();seenByRole.owner.clear();seenByRole.contributor.clear();}
  const idSet=new Set();
  if(account){
   const [own,assigned]=await Promise.all([indexedPage("owner",account,workOffset),indexedPage("contributor",account,workOffset)]);
   workMore=own.has_more||assigned.has_more;
   for(const id of own.order_ids){if(!/^[1-9][0-9]*$/.test(String(id)))throw Error("Invalid indexed owner ID");idSet.add(String(id));seenByRole.owner.add(String(id));}
   for(const id of assigned.order_ids){if(!/^[1-9][0-9]*$/.test(String(id)))throw Error("Invalid indexed contributor ID");idSet.add(String(id));seenByRole.contributor.add(String(id));}
   workOffset+=PAGE_SIZE;
   $("v2DiscoveryProgress").textContent="Indexed My Work · Owner "+own.total+" · Contributor "+assigned.total+" · "+(workMore?"More pages available":"All pages loaded");
  }else{
   const next=BigInt(String(await readClient.readContract({address:V2_CONTRACT,functionName:"next_order",args:[],transactionHashVariant:final})));
   for(let i=next-1n;i>=1n&&i>=next-21n;i--)idSet.add(String(i));
   $("v2DiscoveryProgress").textContent="Public recent milestones · Connect wallet to see indexed My Work";
   workMore=false;
  }
  const ids=[...idSet];
  for(let i=0;i<ids.length;i+=4){
   const batch=ids.slice(i,i+4);
   const results=await Promise.allSettled(batch.map(id=>read("get_order",[id])));
   for(let j=0;j<batch.length;j++){
    const v=results[j];if(v.status!=="fulfilled"||!v.value)throw Error("Could not verify indexed order "+batch[j]);
    validateMilestoneSnapshot(v.value,batch[j]);
    if(account&&v.value.owner.toLowerCase()!==account&&v.value.contributor.toLowerCase()!==account)
      throw Error("Wallet index returned an unrelated order");
    discoveredOrders.set(batch[j],v.value);
   }
  }
  if(epoch!==discoveryEpoch)return;
  renderDiscovery();
  if(account&&!order){
   const proposed=[...discoveredOrders.values()].find(x=>x.contributor.toLowerCase()===account&&x.status==="PROPOSED");
   if(proposed){$("milestoneId").value=proposed.id;void load();}
  }
 }catch(e){$("v2DiscoveryProgress").textContent="Index read failed: "+String(e.message||e)+". No unverified entries shown.";renderDiscovery();}
 finally{discoveryBusy=false;button.disabled=false;renderDiscovery();}
}
$("v2RefreshRecent").addEventListener("click",()=>void discoverRecentOrders(true));
$("v2LoadOlder").addEventListener("click",()=>void discoverRecentOrders(false));
$("v2FindMyWork").addEventListener("click",()=>void discoverRecentOrders(true));
async function findCreatedOrder(title,owner){
 try{
  const val=await readClient.readContract({address:V2_CONTRACT,functionName:"next_order",args:[],transactionHashVariant:final});
  const n=BigInt(String(val));if(n<=1n)return null;
  const id=String(n-1n),rec=await read("get_order",[id]);
  if(!rec||rec.title!==title||rec.owner.toLowerCase()!==owner.toLowerCase())return null;
  validateMilestoneSnapshot(rec,id);
  $("milestoneId").value=id;await load();void discoverRecentOrders(true);return id;
 }catch{return null;}
}
const node=(tag,value,className)=>{const n=document.createElement(tag); if(value!==undefined)n.textContent=String(value); if(className)n.className=className;return n;};
function message(msg,error=false){$("milestoneMessage").textContent=msg;$("milestoneMessage").className=error?"milestone-note milestone-error":"milestone-note";}
function line(parent,name,value){const row=node("dl",undefined,"milestone-kv");row.append(node("dt",name),node("dd",value??"—"));parent.append(row);}
function jsonRead(raw){if(raw===""||raw==null)return null;if(typeof raw!=="string")throw Error("Unexpected contract response type");const value=JSON.parse(raw);if(!value||typeof value!=="object"||Array.isArray(value))throw Error("Malformed contract JSON");return value;}
async function read(name,args){return jsonRead(await readClient.readContract({address:V2_CONTRACT,functionName:name,args,transactionHashVariant:final}));}
function renderOrder(){const box=$("milestoneOrder");box.replaceChildren();if(!order)return;
 const s=node("div",undefined,"milestone-status");s.append(node("strong",order.title),node("span",order.status,"milestone-badge"));box.append(s);
 line(box,"Order",order.id);line(box,"Owner",order.owner);line(box,"Contributor",order.contributor);line(box,"Spec SHA-256",order.spec_sha256);line(box,"Evidence policy",order.spec.source_policy);line(box,"Submissions",order.submissions.length);
 for(const c of order.spec.criteria){const x=node("div",undefined,"milestone-criterion");x.append(node("strong",c.id),node("p",c.text));box.append(x);}
}
function renderReceipt(){const box=$("milestoneReceipt");box.replaceChildren();if(!receipt){box.textContent="No finalized receipt for the latest submission.";return;}
 const heading=node("div",undefined,"milestone-status");heading.append(node("strong",receipt.outcome),node("span",receipt.results.filter(r=>r.status==="SATISFIED").length+"/"+receipt.results.length+" SATISFIED","milestone-badge"));box.append(heading);
 line(box,"Receipt schema",receipt.schema);line(box,"Version",receipt.version);line(box,"Contract",receipt.contract);line(box,"Artifact SHA-256",receipt.artifact_sha256);
 for(const r of receipt.results){const c=node("div",undefined,"milestone-criterion");c.append(node("strong",r.id+" · "+r.status),node("p",r.reason_code),node("small","Artifact quote: "+(r.artifact_quote||"None"),"milestone-quote"),node("small","Reference quote: "+(r.reference_quote||"None"),"milestone-quote"));box.append(c);}
}
function renderGrant(){const box=$("milestoneRelease");box.replaceChildren();if(!grant){box.textContent="No release authorization recorded for this work order.";return;}
 const h=node("div",undefined,"milestone-status");h.append(node("strong","RELEASE AUTHORIZED"),node("span","ON-CHAIN RECORD","milestone-badge"));box.append(h);
 line(box,"Recipient",grant.recipient);line(box,"Order",grant.order_id);line(box,"Receipt version",grant.receipt_version);line(box,"Spec SHA-256",grant.spec_sha256);line(box,"Artifact SHA-256",grant.artifact_sha256);line(box,"Authorized at",new Date(grant.authorized_at*1000).toLocaleString());
 box.append(node("p","Not a payment, token transfer, or an off-chain unlock.","milestone-small"));
}
function field(box,title,id,placeholder){const w=node("label",undefined,"field");w.append(node("span",title));const input=node("input");input.id=id;input.placeholder=placeholder;input.autocomplete="off";w.append(input);box.append(w);return input;}
function renderActions(){const box=$("milestoneActions");box.replaceChildren();if(!order){box.append(node("p",unresolved?"Previous write unresolved. Check the transaction status at the top.":"Load a work order to see eligible actions.","milestone-note"));const pending=getPending();if(pending?.method==="create_order"&&!pending?.expectedOrderId&&account&&!busy){const b=node("button","Recover verified legacy create_order (no signature)","secondary");b.type="button";b.addEventListener("click",()=>void recoverLegacyCreate());box.append(b);}if(pending?.method==="create_order"&&pending?.expectedOrderId&&gateway&&account&&!busy){const b=node("button","Check saved milestone creation again","secondary");b.type="button";b.addEventListener("click",()=>void recheckSavedCreate());box.append(b);}return;}
 const suggestion=nextMilestoneAction(order,account,Boolean(grant));
 if(!account){box.append(node("p","Connect the assigned MetaMask account to prepare a write. Anyone can inspect finalized state.","milestone-note"));return;}
 if(unresolved){
 const saved=getPending();const pending=saved?.hash;
 box.append(node("p","An earlier write may still be pending or its execution is unresolved. "+(pending?"TX: "+pending+". ":"")+"Track it in Studio; do not resend.","milestone-note milestone-error"));
 if(pending&&gateway&&!busy){const check=node("button","Check saved transaction again","secondary");check.type="button";check.addEventListener("click",()=>void resumePending(pending));box.append(check);}
 if(pending&&/^0x[a-fA-F0-9]{64}$/.test(pending)){
  const link=node("a","Inspect saved transaction in Explorer ↗","milestone-link");
  link.href="https://explorer-studio.genlayer.com/tx/"+pending;link.target="_blank";link.rel="noopener noreferrer";box.append(link);
  const notice=node("p","This transaction has a different hash from previously verified actions. Confirm its exact method and GenVM result in Explorer before continuing. Never use an earlier accept_order result to clear a newer transaction.","milestone-note milestone-error");
  box.append(notice);if(saved?.method)box.append(node("p","Saved method: "+saved.method+" · Order: "+(saved.orderId||"unknown")+". Refresh finalized state to automatically reconcile matching on-chain effects.","milestone-note"));
 }
 return;}
 if(!suggestion){box.append(node("p",grant?"Release authorization already recorded. No further claim is allowed.":"No action is available for this account and order state.","milestone-note"));return;}
 const b=node("button",suggestion.label,"primary");b.type="button";b.disabled=busy;
 let url,sha;
 if(suggestion.method==="submit_evidence"){
  url=field(box,"Commit-pinned public artifact URL","v2ArtifactUrl","https://raw.githubusercontent.com/.../40-hex-commit/...txt");
  sha=field(box,"Artifact SHA-256 (64 lowercase hex)","v2ArtifactHash","64 hex characters");
  if(order.title==="Sandbox API Integration Handoff — Live Demonstration"){
   const example=node("button","Fill complete evidence (positive demo) ↘","secondary");
   example.type="button";
   example.addEventListener("click",()=>{
    url.value="https://raw.githubusercontent.com/bearbaba/PROOFLY/b5c70fbb95bd03f9e65d630292c9ac0af2f38eb0/fixtures/evidence/milestone-v2-sandbox-handoff.txt";
    sha.value="397cd4f89a3fb861f52b804b4ebeafe29f91382e8aee226e0cf4abb8d8925894";
    $("milestoneTx").textContent="Complete pinned artifact filled, NOT submitted. Verify bytes and wallet before signing.";
   });
   box.append(example);
  }
  if(order.title==="Sandbox Integration Negative Acceptance Test"){
   const demo=node("button","Fill incomplete evidence (negative test only) ↘","secondary");
   demo.type="button";
   demo.addEventListener("click",()=>{
    url.value="https://raw.githubusercontent.com/bearbaba/PROOFLY/5a98c6be3d74b110ca711e46a30349cb8914e6e1/fixtures/evidence/milestone-v2-incomplete-handoff.txt";
    sha.value="72a9056d2846be017eceb017746860e31c82abe8f9f131a866c02823f71bd5a6";
    $("milestoneTx").textContent="Incomplete artifact filled, NOT submitted. Inspect URL/hash and confirm wallet before signing.";
   });
   box.append(demo);
  }
 }
 const guidance=node("p","Confirm wallet, contract, and fees before approving. The app never auto-retries.","hint");box.append(guidance,b);
 b.addEventListener("click",()=>void submit(suggestion.method,url?.value?.trim(),sha?.value?.trim()));
}
async function load(){if(busy)return;const id=$("milestoneId").value.trim();if(!/^[1-9][0-9]*$/.test(id)){message("Enter a positive work order number.",true);return;}
 busy=true;$("milestoneLoad").disabled=true;message("Reading finalized contract state…");
 try{const next=await read("get_order",[id]);if(!next)throw Error("No work order found at the requested finalized state.");validateMilestoneSnapshot(next,id);
 const v=next.submissions.at(-1)?.version;const rec=v?await read("get_receipt",[id,v]):null;const release=await read("get_milestone_release",[id]);
 if(rec)validateMilestoneSnapshot(next,id,rec);
 if(release)validateRelease(next,rec,release);
 order=next;receipt=rec;grant=release;
 // Keep the indexed My Work card consistent with the already-verified detail.
 discoveredOrders.set(next.id,next);renderDiscovery();
 const wasUnresolved=unresolved;
 reconcilePending();renderOrder();renderReceipt();renderGrant();
 if(wasUnresolved&&!unresolved)void discoverRecentOrders(true);const url=new URL(location.href);url.searchParams.set("order",id);history.replaceState(null,"",url);message("Finalized-state snapshot received from GenLayer. Transaction execution history is not independently authenticated by this read.");}
 catch(e){order=null;receipt=null;grant=null;renderOrder();renderReceipt();renderGrant();message("Unable to verify this snapshot: "+String(e.message||e),true);}
 finally{busy=false;$("milestoneLoad").disabled=false;renderActions();}
}
async function resumePending(hash){
 if(!gateway||busy)return;busy=true;renderActions();
 try{
  const verdict=await gateway.resumeFinalization(hash);
  $("milestoneTx").textContent="Saved transaction "+hash+" · "+verdict.status+".";
  if(verdict.status==="FINALIZED_SUCCESS")clearPending();
  if(verdict.status!=="FINALIZED_EXECUTION_FAILED"){
   busy=false;await load();
   if(unresolved)showProgress("Transaction still unverified","SDK receipt was inconclusive and no matching finalized contract effect was found. Check the exact hash in Explorer; do not resend.",hash,true);
  }else showProgress("GenVM execution failed","The transaction finalized with an explicit execution error. Inspect the exact transaction error before proceeding.",hash,true);
 }catch(e){$("milestoneTx").textContent="Tracking unresolved: "+String(e.message||e);}
 finally{busy=false;renderActions();}
}
async function connect(silent=false){if(!provider()){if(silent)return; $("milestoneWallet").textContent="MetaMask was not found. Install or unlock a trusted wallet.";return;}
 try{const accounts=await provider().request({method:silent?"eth_accounts":"eth_requestAccounts"});if(silent&&!accounts.length)return;const chain=await provider().request({method:"eth_chainId"});
 if(Number(BigInt(chain))!==61999)throw Error("Switch MetaMask to GenLayer Studionet (chain 61999) before signing.");
 account=String(accounts[0]||"").toLowerCase();
 if(!/^0x[0-9a-f]{40}$/.test(account))throw Error("No usable wallet account.");
 const client=createClient({chain:studionet,account,provider:provider()});
 gateway=createWorkflowGateway({client,contractAddress:V2_CONTRACT,finalVariant:final,isSuccessful:tx=>inspectTransaction(tx).kind==="success"});
 $("milestoneWallet").textContent="● Connected · "+account.slice(0,8)+"…"+account.slice(-6)+" · Studionet 61999";$("milestoneWallet").title=account;$("milestoneConnect").textContent="✓ Wallet connected · Switch account";$("milestoneConnect").classList.add("v2-wallet-connected");void discoverRecentOrders(true);
 }catch(e){if(silent)return;account="";gateway=null;$("milestoneConnect").textContent="Connect MetaMask";$("milestoneConnect").classList.remove("v2-wallet-connected");$("milestoneWallet").textContent=String(e.message||e);}
 renderActions();
}
async function verifyPublicArtifact(url,digest){
 const response=await fetch(url,{cache:"no-store",redirect:"error"});
 if(!response.ok)throw Error("Evidence URL did not return HTTP 200.");
 const raw=new Uint8Array(await response.arrayBuffer());
 if(raw.length===0||raw.length>16000)throw Error("Evidence must contain 1–16000 bytes.");
 const text=new TextDecoder("utf-8",{fatal:true}).decode(raw);
 if(text.length>10000||text.includes("\0"))throw Error("Evidence text exceeds policy constraints.");
 const bytes=await crypto.subtle.digest("SHA-256",raw);
 const actual=Array.from(new Uint8Array(bytes),n=>n.toString(16).padStart(2,"0")).join("");
 if(actual!==digest)throw Error("Evidence SHA-256 differs from the fetched public document.");
}
async function submit(method,artifactUrl,artifactHash){if(busy||unresolved||!gateway||!order)return;
 const chain=await provider().request({method:"eth_chainId"});const accounts=await provider().request({method:"eth_accounts"});
 if(Number(BigInt(chain))!==61999||String(accounts[0]||"").toLowerCase()!==account){$("milestoneTx").textContent="Wallet or chain changed. Reconnect and inspect again.";account="";gateway=null;renderActions();return;}
 const action=nextMilestoneAction(order,account,Boolean(grant));if(action?.method!==method){$("milestoneTx").textContent="Action is no longer eligible. Refresh first.";return;}
 let args=[order.id];
 if(method==="accept_order")args=[order.id,order.spec_sha256];
 if(method==="submit_evidence")args=[order.id,artifactUrl,artifactHash];
 if(method==="submit_evidence"&&!/^https:\/\/raw\.githubusercontent\.com\/[\w.-]+\/[\w.-]+\/[a-f0-9]{40}\/[\w./-]+\.txt$/.test(artifactUrl||"")){ $("milestoneTx").textContent="Use a commit-pinned public raw GitHub .txt URL.";return;}
 if(method==="submit_evidence"&&!/^[a-f0-9]{64}$/.test(artifactHash||"")){$("milestoneTx").textContent="Invalid artifact SHA-256.";return;}
 if(method==="submit_evidence"){
  try{await verifyPublicArtifact(artifactUrl,artifactHash);}
  catch(e){$("milestoneTx").textContent="Evidence validation failed; no transaction sent: "+String(e.message||e);return;}
 }
 const ok=window.confirm("PROOFLY V2 · "+method+"\nContract: "+V2_CONTRACT+"\nAccount: "+account+"\nOrder: "+order.id+"\nNo token transfer. This GenLayer SDK cannot quote consensus fees; inspect all costs in MetaMask before signing. Continue?");
 if(!ok)return;
 busy=true;renderActions();$("milestoneTx").textContent="Awaiting wallet approval. Do not submit again.";
 try{const context={orderId:order.id,specSha:order.spec_sha256,artifactUrl,artifactHash,expectedVersion:order.submissions.length+(method==="submit_evidence"?1:0)};
 const result=await gateway.submit(method,args,hash=>{
  savePending(hash,method,context);
  showProgress("Transaction submitted","Waiting for GenVM finality. Do not resubmit.",hash,true);
  $("milestoneTx").textContent="Submitted: "+hash+" · Finality/execution unknown.";
 },async()=>true);
 savePending(result.txId,method,context);
 $("milestoneTx").textContent="Transaction "+result.txId+" submitted. Checking finalized state and execution.";
 const verdict=await gateway.resumeFinalization(result.txId);
 $("milestoneTx").textContent="Transaction "+result.txId+" · "+verdict.status+".";
 if(verdict.status==="FINALIZED_SUCCESS")clearPending();
 if(verdict.status!=="FINALIZED_EXECUTION_FAILED"){
  busy=false;await load();
  if(!unresolved)showProgress("On-chain progress verified","Transaction complete or its exact effect verified in finalized state.",result.txId);
  else showProgress("Transaction still requires verification","The SDK could not establish execution or a matching finalized state. Never resend blindly.",result.txId,true);
 }else showProgress("Contract execution failed","GenVM execution did not succeed. Inspect the transaction error before further writes.",result.txId,true);
 }catch(e){
  const knownNoSubmission=["USER_CANCELLED","BAD_ARGUMENTS","FEE_ESTIMATE_MISSING","FEE_REVIEW_REQUIRED","INVALID_ID"].includes(e?.code);
  if(!knownNoSubmission)unresolved=true;
  $("milestoneTx").textContent=knownNoSubmission?"No transaction submitted: "+String(e.message||e):"Submission may be pending: "+String(e.message||e)+". Check wallet/Studio before any retry.";
 }
 finally{busy=false;renderActions();}
}
$("milestoneLookup").addEventListener("submit",e=>{e.preventDefault();void load();});
$("milestoneConnect").addEventListener("click",()=>void connect());
provider()?.on?.("accountsChanged",()=>{account="";gateway=null;$("milestoneConnect").textContent="Connect MetaMask";$("milestoneConnect").classList.remove("v2-wallet-connected");renderActions();$("milestoneWallet").textContent="Account changed. Reconnect to continue.";});
provider()?.on?.("chainChanged",()=>{account="";gateway=null;$("milestoneConnect").textContent="Connect MetaMask";$("milestoneConnect").classList.remove("v2-wallet-connected");renderActions();$("milestoneWallet").textContent="Network changed. Reconnect to continue.";});
let checkedReference=null;
const pinned=/^https:\/\/raw\.githubusercontent\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\/[a-f0-9]{40}\/[A-Za-z0-9_./-]+\.txt$/;
async function fetchAndHashReference(url){
 if(!pinned.test(url)||url.split("/").slice(6).some(p=>p===""||p==="."||p===".."))throw Error("Use a public, commit-pinned raw GitHub .txt URL.");
 const response=await fetch(url,{cache:"no-store",redirect:"error"});
 if(!response.ok)throw Error("Reference URL must return HTTP 200.");
 const bytes=new Uint8Array(await response.arrayBuffer());
 if(!bytes.length||bytes.length>16000)throw Error("Document must contain 1–16000 bytes.");
 const content=new TextDecoder("utf-8",{fatal:true}).decode(bytes);
 if(content.length>10000||content.includes("\0"))throw Error("Reference document is not acceptable UTF-8 text.");
 const hash=Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",bytes)),n=>n.toString(16).padStart(2,"0")).join("");
 return hash;
}
$("v2PositiveExample").addEventListener("click",()=>{
 const values={
  v2Title:"Sandbox API Integration Handoff — Live Demonstration",
  v2Contributor:"0xd6b8a3a5eb329410d9504784812b8569afa8c2af",
  v2Reference:"https://raw.githubusercontent.com/bearbaba/PROOFLY/4671020f77d3193f9ceacc635b1fa0dd352c6598/fixtures/evidence/milestone-v2-acceptance-reference.txt",
  v2R1:"The handoff explicitly states sandbox only, no real money, demo credentials, and that secrets must never be committed to source control.",
  v2R2:"The handoff describes in order: configure the sandbox endpoint and demo credentials; send a test request with a unique request ID; inspect the response and save the request ID.",
  v2R3:"The handoff instructs users to refresh demo credentials and retry once for AUTH_401, wait for Retry-After on RATE_429, and disable the sandbox integration while preserving logs if errors continue.",
  v2SubmitDays:"2",v2RevisionDays:"7"
 };
 for(const [key,value] of Object.entries(values))$(key).value=value;
 checkedReference=null;
 $("v2ReferenceStatus").textContent="Template prepared. Fetch & hash the agreed reference before Owner signs.";
 $("milestoneTx").textContent="Positive demo inputs ready. This is only a local draft; no wallet request or on-chain write occurred.";
});
document.querySelector(".milestone-start")?.addEventListener("click",()=>{$("v2CreateDetails").open=true;});
$("v2NegativeExample").addEventListener("click",()=>{
 const values={
  v2Title:"Sandbox Integration Negative Acceptance Test",
  v2Contributor:"0xd6b8a3a5eb329410d9504784812b8569afa8c2af",
  v2Reference:"https://raw.githubusercontent.com/bearbaba/PROOFLY/4671020f77d3193f9ceacc635b1fa0dd352c6598/fixtures/evidence/milestone-v2-acceptance-reference.txt",
  v2R1:"The handoff explicitly states sandbox only, no real money, demo credentials, and that secrets must never be committed to source control.",
  v2R2:"The handoff describes in order: configure the sandbox endpoint and demo credentials; send a test request with a unique request ID; inspect the response and save the request ID.",
  v2R3:"The handoff instructs users to refresh demo credentials and retry once for AUTH_401, wait for Retry-After on RATE_429, and disable the sandbox integration while preserving logs if errors continue.",
  v2SubmitDays:"2",v2RevisionDays:"7"
 };
 for(const [key,value] of Object.entries(values))$(key).value=value;
 checkedReference=null;
 $("v2ReferenceStatus").textContent="Template loaded. Click Fetch & hash reference document before signing.";
 $("milestoneTx").textContent="Negative-test agreement fields prepared without submitting anything. The incomplete evidence is submitted separately after acceptance.";
});
$("v2CheckReference").addEventListener("click",async()=>{
 const url=$("v2Reference").value.trim();
 checkedReference=null;$("v2ReferenceStatus").textContent="Checking immutable reference…";
 try{
  const sha=await fetchAndHashReference(url);
  checkedReference={url,sha};
  $("v2ReferenceStatus").textContent="SHA-256 verified: "+sha;
 }catch(e){$("v2ReferenceStatus").textContent="Reference check failed: "+String(e.message||e);}
});
$("v2Reference").addEventListener("input",()=>{checkedReference=null;$("v2ReferenceStatus").textContent="Reference changed. Recheck before creating.";});
$("v2CreateForm").addEventListener("submit",async e=>{
 e.preventDefault();
 if(busy||unresolved){$("milestoneTx").textContent="Another transaction is unresolved or in progress. Resolve it before creating.";return;}
 if(!gateway||!account){$("milestoneTx").textContent="Connect the Owner wallet on Studionet first.";return;}
 const addr=$("v2Contributor").value.trim();
 const title=$("v2Title").value.trim();
 const url=$("v2Reference").value.trim();
 if(!/^0x[0-9a-fA-F]{40}$/.test(addr)||addr.toLowerCase()===account){$("milestoneTx").textContent="Contributor must be another valid wallet.";return;}
 if(!title||title.length>120||!checkedReference||checkedReference.url!==url){$("milestoneTx").textContent="Enter a title and check the agreed reference document.";return;}
 const rows=[1,2,3].map(n=>({id:"R"+n,text:$("v2R"+n).value.trim()}));
 if(rows.some(r=>!r.text||r.text.length>500)){$("milestoneTx").textContent="Each of the three criteria must contain 1–500 characters.";return;}
 const submitDays=Number($("v2SubmitDays").value), revisionDays=Number($("v2RevisionDays").value);
 if(!Number.isSafeInteger(submitDays)||!Number.isSafeInteger(revisionDays)||submitDays<1||submitDays>=revisionDays||revisionDays>59){
  $("milestoneTx").textContent="Choose 1–58 days for submission and a later revision deadline, no more than 59 days.";return;
 }
 const chain=await provider().request({method:"eth_chainId"});
 const accounts=await provider().request({method:"eth_accounts"});
 if(Number(BigInt(chain))!==61999||String(accounts[0]||"").toLowerCase()!==account){$("milestoneTx").textContent="Wallet or network changed. Reconnect.";return;}
 let digest;
 try{digest=await fetchAndHashReference(url);}catch(err){$("milestoneTx").textContent="Reference could not be reverified: "+String(err.message||err);return;}
 if(digest!==checkedReference.sha){$("milestoneTx").textContent="Reference bytes changed since the last verification. Abort.";return;}
 const now=Math.floor(Date.now()/1000);
 const args=[addr,title,JSON.stringify(rows),url,digest,now+submitDays*86400,now+revisionDays*86400];
 let expectedOrderId;
 try{expectedOrderId=String(await readClient.readContract({address:V2_CONTRACT,functionName:"next_order",args:[],transactionHashVariant:final}));if(!/^[1-9][0-9]*$/.test(expectedOrderId))throw Error("bad id");}catch{$("milestoneTx").textContent="Could not capture the next on-chain order ID. No transaction sent; retry after network recovers.";return;}
 const createContext={orderId:null,expectedOrderId,title,contributor:addr.toLowerCase(),referenceUrl:url,referenceSha:digest,criteria:rows};
 if(!window.confirm("PROOFLY V2 CREATE ORDER\\nContract: "+V2_CONTRACT+"\\nOwner: "+account+"\\nContributor: "+addr+"\\nReference SHA-256: "+digest+"\\nNo escrow/payment. Confirm fees in MetaMask before signing."))return;
 busy=true;$("v2CreateButton").disabled=true;
 showProgress("Approve agreement in MetaMask","Review the wallet, contract and fee. Do not submit another request.", "",true);
 $("milestoneTx").textContent="Awaiting wallet signature for create_order.";
 let submittedHash="";
 try{
  const tx=await gateway.submit("create_order",args,hash=>{
   submittedHash=hash;savePending(hash,"create_order",createContext);
   showProgress("Milestone transaction submitted","Waiting for finalized GenVM execution. Do not sign again.",hash,true);
  },async()=>true);
  submittedHash=tx.txId;savePending(tx.txId,"create_order",createContext);
  showProgress("Milestone creation pending","Transaction submitted. Checking finality and execution.",tx.txId,true);
  const status=await gateway.resumeFinalization(tx.txId);
  if(status.status==="FINALIZED_SUCCESS"){
   clearPending();
   showProgress("Agreement created","GenVM execution succeeded. Finding the new Work Order.",tx.txId);
   busy=false;
   const id=await findCreatedOrder(title,account);
   showProgress("Agreement created",id?"Work Order #"+id+" loaded. Contributor can now accept the agreement.":"Contract execution succeeded; Work Order number could not be matched automatically. Inspect next_order in Studio.",tx.txId);
   $("milestoneTx").textContent=id?"Work Order #"+id+" created and loaded.":"Created successfully; use Studio to identify Work Order.";
  }else{
   busy=false;
   if(await recoverCreatedOrder(getPending()))return;
   showProgress("Execution not confirmed","Status: "+status.status+". Inspect GenVM execution in Explorer before further writes.",tx.txId,true);
   $("milestoneTx").textContent="Create TX "+tx.txId+" · "+status.status+". Do not resubmit.";
  }
 }catch(err){
  const aborted=["USER_CANCELLED","BAD_ARGUMENTS","FEE_ESTIMATE_MISSING","FEE_REVIEW_REQUIRED"].includes(err?.code);
  if(!aborted)unresolved=true;
  showProgress(aborted?"No transaction submitted":"Transaction requires review",aborted?String(err.message||err):"A write may have been broadcast. Inspect MetaMask activity and Studio before retrying.",submittedHash,true);
  $("milestoneTx").textContent=aborted?"No transaction submitted: "+String(err.message||err):"Submission uncertain: "+String(err.message||err)+". Do not resubmit.";
 }finally{busy=false;$("v2CreateButton").disabled=false;renderActions();}
});

if(unresolved){let saved="";try{saved=localStorage.getItem(PENDING_KEY)||"";}catch{}showProgress("Previous transaction needs review","A previous write may still be pending. Verify the GenVM result before signing again.",saved,true);}
$("v2LiveClose").addEventListener("click",()=>{$("v2LiveStatus").hidden=true;});
// Read-only recovery: independently query finalized on-chain effects while a
// tracked transaction is unresolved. Never auto-send or clear unknown writes.
let recoveryInFlight=false;
const recoveryTicker=setInterval(async()=>{
 if(!unresolved||busy||recoveryInFlight||!account||document.hidden)return;
 const pending=getPending();
 if(!pending||pending.account?.toLowerCase()!==account)return;
 recoveryInFlight=true;
 try{
 if(pending.method==="create_order"){
  if(pending.expectedOrderId)await recoverCreatedOrder(pending);
 }else if(pending.orderId&&/^[1-9][0-9]*$/.test(pending.orderId)){
  $("milestoneId").value=pending.orderId;
  await load();
 }
 if(!unresolved)void discoverRecentOrders(true);
 }catch(error){$("milestoneTx").textContent="Background reconciliation paused by RPC: "+String(error.message||error)+". No new transaction sent.";}
 finally{recoveryInFlight=false;}
},12000);
window.addEventListener("pagehide",()=>clearInterval(recoveryTicker));
void discoverRecentOrders(true);
void connect(true); // Restore an already authorized wallet without prompting or signing.
const requested=new URLSearchParams(location.search).get("order");if(requested&&/^[1-9][0-9]*$/.test(requested)){$("milestoneId").value=requested;void load();}
