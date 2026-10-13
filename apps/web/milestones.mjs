/** PROOFLY v2: never confuse finalized RPC readback with transaction execution. */
import {createClient} from "genlayer-js";
import {studionet} from "genlayer-js/chains";
import {TransactionHashVariant} from "genlayer-js/types";
import {createWorkflowGateway} from "./sdk-workflow.mjs";
import {inspectTransaction} from "./tx-verdict.mjs";
import {validateMilestoneSnapshot, validateRelease, nextMilestoneAction, V2_CONTRACT} from "./milestones-model.mjs";

const $=id=>document.getElementById(id);
const readClient=createClient({chain:studionet});
const final=TransactionHashVariant.LATEST_FINAL;
let order=null, receipt=null, grant=null, account="", gateway=null, busy=false, unresolved=false;
const provider=()=>window.ethereum;
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
function renderActions(){const box=$("milestoneActions");box.replaceChildren();if(!order){box.append(node("p","Load a work order to see eligible actions.","milestone-note"));return;}
 const suggestion=nextMilestoneAction(order,account,Boolean(grant));
 if(!account){box.append(node("p","Connect the assigned MetaMask account to prepare a write. Anyone can inspect finalized state.","milestone-note"));return;}
 if(unresolved){box.append(node("p","An earlier write may still be pending or its execution is unresolved. Track it in Studio; do not resend.","milestone-note milestone-error"));return;}
 if(!suggestion){box.append(node("p",grant?"Release authorization already recorded. No further claim is allowed.":"No action is available for this account and order state.","milestone-note"));return;}
 const b=node("button",suggestion.label,"primary");b.type="button";b.disabled=busy;
 let url,sha;
 if(suggestion.method==="submit_evidence"){url=field(box,"Commit-pinned public artifact URL","v2ArtifactUrl","https://raw.githubusercontent.com/.../40-hex-commit/...txt");sha=field(box,"Artifact SHA-256 (64 lowercase hex)","v2ArtifactHash","64 hex characters");}
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
 renderOrder();renderReceipt();renderGrant();const url=new URL(location.href);url.searchParams.set("order",id);history.replaceState(null,"",url);message("Finalized-state snapshot received from GenLayer. Transaction execution history is not independently authenticated by this read.");}
 catch(e){order=null;receipt=null;grant=null;renderOrder();renderReceipt();renderGrant();message("Unable to verify this snapshot: "+String(e.message||e),true);}
 finally{busy=false;$("milestoneLoad").disabled=false;renderActions();}
}
async function connect(){if(!provider()){ $("milestoneWallet").textContent="MetaMask was not found. Install or unlock a trusted wallet.";return;}
 try{const accounts=await provider().request({method:"eth_requestAccounts"});const chain=await provider().request({method:"eth_chainId"});
 if(Number(BigInt(chain))!==61999)throw Error("Switch MetaMask to GenLayer Studionet (chain 61999) before signing.");
 account=String(accounts[0]||"").toLowerCase();
 if(!/^0x[0-9a-f]{40}$/.test(account))throw Error("No usable wallet account.");
 const client=createClient({chain:studionet,account});
 gateway=createWorkflowGateway({client,contractAddress:V2_CONTRACT,finalVariant:final,isSuccessful:tx=>inspectTransaction(tx).kind==="success"});
 $("milestoneWallet").textContent="Connected: "+account+" · Studionet 61999";
 }catch(e){account="";gateway=null;$("milestoneWallet").textContent=String(e.message||e);}
 renderActions();
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
 const ok=window.confirm("PROOFLY V2 · "+method+"\nContract: "+V2_CONTRACT+"\nAccount: "+account+"\nOrder: "+order.id+"\nNo token transfer. This GenLayer SDK cannot quote consensus fees; inspect all costs in MetaMask before signing. Continue?");
 if(!ok)return;
 busy=true;renderActions();$("milestoneTx").textContent="Awaiting wallet approval. Do not submit again.";
 try{const result=await gateway.submit(method,args,hash=>{$("milestoneTx").textContent="Submitted: "+hash+" · Finality/execution unknown. Track before any other write.";},async()=>true);
 unresolved=true;$("milestoneTx").textContent="Transaction "+result.txId+" submitted. Await finality; never retry based on timeout.";
 const verdict=await gateway.resumeFinalization(result.txId);
 $("milestoneTx").textContent="Transaction "+result.txId+" · "+verdict.status+". "+(verdict.note||"")+" Refresh from chain before further actions.";
 // Only a successful explicit execution result allows a new action.
 if(verdict.status==="FINALIZED_SUCCESS")unresolved=false;
 }catch(e){unresolved=true;$("milestoneTx").textContent="Submission may be pending: "+String(e.message||e)+". Check wallet/Studio before any retry.";}
 finally{busy=false;renderActions();}
}
$("milestoneLookup").addEventListener("submit",e=>{e.preventDefault();void load();});
$("milestoneConnect").addEventListener("click",()=>void connect());
provider()?.on?.("accountsChanged",()=>{account="";gateway=null;renderActions();$("milestoneWallet").textContent="Account changed. Reconnect to continue.";});
provider()?.on?.("chainChanged",()=>{account="";gateway=null;renderActions();$("milestoneWallet").textContent="Network changed. Reconnect to continue.";});
const requested=new URLSearchParams(location.search).get("order");if(requested&&/^[1-9][0-9]*$/.test(requested)){$("milestoneId").value=requested;void load();}
