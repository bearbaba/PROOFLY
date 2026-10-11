/**
 * PROOFLY's actual Studionet client. No mock RPC, local private keys, or
 * fabricated verdicts. No write occurs unless wallet, confirmation and fee
 * estimate are all explicitly provided by the user.
 */
import { createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import { TransactionHashVariant, TransactionStatus } from "genlayer-js/types";
import {inspectTransaction} from "./tx-verdict.mjs";
import {listRecentWork,recommendedOperation} from "./workboard.mjs";
import {candidateFromArgs,restoreCandidate,discoverCreatedOrder,orderLink,queryOrder} from "./order-handoff.mjs";
import { createWorkflowGateway, makeRead } from "./sdk-workflow.mjs";
import { isPinnedUrl } from "./model.mjs";
import { CONTRACT, CHAIN_ID, EXPLORER, parseStudioPlan, decodeRead,
         roleFor, preparedAction, describeReceipt, prepareUserOrder } from "./live-model.mjs";

const $ = id => document.getElementById(id);
const readClient = createClient({ chain: studionet });
let gateway = null;
let wallet = null;
let currentOrder = null;
let currentOrderId = null;
let currentReceipt = null;
let busy = false;
// Stable genlayer-js@1.1.8 does not export the newer isSuccessful helper.
// Enforce the protocol's two-part success condition rather than trusting a
// FINALIZED status alone. Unknown SDK transaction shape must fail closed.
function isSuccessful(tx) {
  return inspectTransaction(tx).kind === "success";
}
const HEX = /^0x[0-9a-fA-F]{64}$/;
const STORAGE_KEY = "proofly.studionet.61999.pending";
const CREATE_KEY = "proofly.studionet.61999.pendingCreate";
const LAST_ORDER_KEY = "proofly.studionet.61999.lastVerifiedOrder";
const DEMO_REFERENCE = "https://raw.githubusercontent.com/bearbaba/PROOFLY/fa4d29b0e6f8efb50e2472530aff1d0ab7aca77e/fixtures/evidence/reference.txt";
const DEMO_CONTRIBUTOR = "0xd6b8a3a5eb329410d9504784812b8569afa8c2af";
let verifiedReference = null;
let verifiedArtifact = null;
let candidateOrder = null;
let creationOutcome = null;
let walletSequence = 0;
let boardBusy = false;
let lastBoardWallet = null;
let boardItems = [];
let lastWorkboardRefresh = 0;
let selectedSyncBusy = false;
let userPickedOrder = Boolean(queryOrder(window.location.search));


function elem(tag, text, className) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = String(text);
  if (className) node.className = className;
  return node;
}
function showError(error, region = $("txResult")) {
  if(region===$("txResult")){
    const quick=$("transactionNotice");
    if(quick){quick.hidden=false;quick.textContent="Transaction needs attention: "+String(error?.message || error);}
  }
  region.replaceChildren(elem("strong", String(error?.message || error), "error-text"));
  region.classList.remove("empty");
}
function textPair(root, name, value) {
  const row = elem("div", undefined, "kv");
  row.append(elem("span", name, "key"), elem("span", value == null ? "—" : value, "value"));
  root.append(row);
}
function pill(value) {
  const alert = ["REVIEWED","CHANGES_REQUIRED","EVIDENCE_REQUIRED","SUBMITTED"].includes(value);
  const fail = ["CLOSED_NOT_ACCEPTED","CANCELLED","UNSATISFIED","FINALIZED_EXECUTION_FAILED"].includes(value);
  return elem("span", value, "state" + (alert ? " warning" : fail ? " error" : ""));
}
function setBusy(value) {
  busy = value;
  $("connectWallet").disabled = value;
  $("loadOrder").disabled = value;
  $("loadReceipt").disabled = value;
  $("trackTx").disabled = value;
  refreshAction();
  refreshCreateForm();
  const refresh=$("refreshMyWork");
  if(refresh)refresh.disabled=value||boardBusy;
}
function getOrderId() {
  const id = $("orderId").value.trim();
  if (!/^[1-9][0-9]*$/.test(id)) throw new Error("Order number must be a positive decimal ID.");
  return id;
}
function requireWallet() {
  if (!wallet || !gateway) throw new Error("Connect an EIP-1193 wallet on Studionet before signing.");
}
function updateHandoff(order) {
  const root=$("orderHandoff");
  if(!root)return;
  const ok=order && /^[1-9][0-9]{0,9}$/.test(String(order.id));
  root.hidden=!ok;
  if(!ok)return;
  $("shareOrderUrl").value=orderLink(window.location.origin+window.location.pathname,order.id);
  $("handoffHeading").textContent="Work order #"+order.id+" is ready to share";
  $("handoffDescription").textContent=order.status==="PROPOSED" ?
    "Send this link to the contributor. They can open and accept the order with their wallet." :
    "This link opens the latest on-chain state for this work order.";
}
function openVerifiedOrder(id,order) {
  if(!order || String(order.id)!==String(id))
    throw Error("On-chain response does not match this order ID.");
  $("orderId").value=String(id);
  currentOrderId=String(id);
  currentOrder=order;
  currentReceipt=null;
  renderOrder();
  renderReceipt();
  selectNextOperation();
  if(order.status==="COMPLETED")void autoLoadReceipt(id,order);
  try{localStorage.setItem(LAST_ORDER_KEY,String(id));}catch{}
  window.history.replaceState(null,"",orderLink(window.location.origin+window.location.pathname,String(id)));
}
function renderOrder() {
  const root = $("orderResult");
  root.replaceChildren();
  root.classList.remove("empty");
  updateHandoff(currentOrder);
  if (!currentOrder) { root.textContent = "No work order found at this finalized state."; return; }
  const header = elem("div");
  header.append(elem("h3", "Work order #" + currentOrder.id), pill(String(currentOrder.status)));
  root.append(header);
  textPair(root, "TITLE", currentOrder.title);
  textPair(root, "OWNER", currentOrder.owner);
  textPair(root, "CONTRIBUTOR", currentOrder.contributor);
  textPair(root, "SPEC HASH", currentOrder.spec_sha256);
  textPair(root, "ROLE", roleFor(currentOrder, wallet));
  textPair(root, "SUBMISSIONS", Array.isArray(currentOrder.submissions) ? currentOrder.submissions.length : 0);
  for (const c of currentOrder.spec?.criteria || []) {
    const section = elem("div", undefined, "criterion");
    section.append(elem("strong", String(c.id || "")), elem("p", String(c.text || "")));
    root.append(section);
  }
  if (Array.isArray(currentOrder.submissions)) for (const sub of currentOrder.submissions) {
    const version = elem("div", undefined, "criterion");
    version.append(elem("strong", "Submission v" + sub.version),
      elem("p", "Outcome: " + (sub.outcome || "Awaiting evaluation")),
      elem("small", String(sub.artifact_sha256 || "")));
    root.append(version);
  }
}

function selectNextOperation() {
  const action=recommendedOperation(currentOrder,wallet);
  if(action && $("operation").value!==action){
    $("operation").value=action;
    refreshExtras(); // never signs; only prepares the appropriate manual action
  }else refreshAction();
}
function clearMyWork(message) {
  boardItems=[];
  lastBoardWallet=null;
  const list=$("myWorkList");
  if(list)list.replaceChildren();
  if($("myWorkStatus"))$("myWorkStatus").textContent=message;
}
function renderMyWork(items) {
  const root=$("myWorkList");
  root.replaceChildren();
  for(const item of items){
    const order=item.order;
    const row=elem("button",undefined,"my-work-row");
    row.type="button";
    const left=elem("div");
    const title=elem("span","#"+order.id+" · "+String(order.title||"Untitled"),"my-work-name");
    const next=item.next==="accept_order"?" · Accept next" :
      item.next==="submit_evidence"?" · Submit evidence next" :
      item.next==="evaluate_submission"?" · Verify next" : "";
    const meta=elem("span",item.role.toUpperCase()+" · "+String(order.status)+next,"my-work-meta");
    left.append(title,meta);
    const right=elem("span","Open →","my-work-state");
    row.append(left,right);
    row.addEventListener("click",()=>{
      userPickedOrder=true;
      $("orderId").value=String(order.id);
      // An existing snapshot has already been read from the blockchain.
      openVerifiedOrder(String(order.id),order);
      $("orderResult").scrollIntoView({behavior:"smooth",block:"center"});
    });
    root.append(row);
  }
}
async function refreshMyWork({autoOpen=true}={}) {
  if(busy||boardBusy||!wallet)return;
  const account=wallet,sequence=walletSequence;
  boardBusy=true;
  $("refreshMyWork").disabled=true;
  $("myWorkStatus").textContent="Finding your work from finalized on-chain records…";
  try {
    const result=await listRecentWork(readFinal,account,{limit:25,concurrency:4});
    if(account!==wallet || sequence!==walletSequence)return;
    boardItems=result.items;
    lastBoardWallet=account;
    renderMyWork(result.items);
    // A refreshed finalized record is the source of truth. Update status,
    // role and recommended action without manual "Load order" clicks.
    const selected=result.items.find(x=>String(x.order.id)===String(currentOrderId));
    if(selected && currentOrder?.status!==selected.order.status) {
      openVerifiedOrder(selected.order.id,selected.order);
    }
    $("myWorkStatus").textContent=result.items.length ?
      result.items.length+" linked work order(s) · recent "+result.scanned+" checked"+
      (result.errors?" · "+result.errors+" RPC read(s) unavailable":"") :
      "No work orders for this wallet in the latest "+result.scanned+
      " records"+(result.hasOlder?" (older orders may exist)":"")+".";
    if(autoOpen && !userPickedOrder && result.items.length){
      const actionable=result.items.find(x=>x.next&&x.role==="contributor") ||
        result.items.find(x=>x.next) || result.items[0];
      const currentForWallet=currentOrder &&
        (currentOrder.owner?.toLowerCase()===account ||
         currentOrder.contributor?.toLowerCase()===account);
      if(!currentForWallet || (currentOrder.status==="COMPLETED" && actionable.next)){
        openVerifiedOrder(String(actionable.order.id),actionable.order);
      } else {
        selectNextOperation();
      }
    }
  } catch(error){
    if(account===wallet&&sequence===walletSequence)
      $("myWorkStatus").textContent="Could not refresh work orders: "+String(error?.message||error)+
        ". Your current work order remains available.";
  } finally {
    boardBusy=false;
    $("refreshMyWork").disabled=busy;
    if(wallet && wallet!==account && !busy)void refreshMyWork();
  }
}

async function autoLoadReceipt(id,order) {
  if(!Array.isArray(order?.submissions)||!order.submissions.length)return;
  const version=Number(order.submissions[order.submissions.length-1]?.version);
  if(!Number.isInteger(version)||version<1||version>2)return;
  $("receiptVersion").value=String(version);
  $("receiptResult").textContent="Loading the finalized verification result…";
  try{
    const receipt=await readFinal("get_receipt",[String(id),version]);
    if(String(currentOrderId)!==String(id))return;
    currentReceipt=receipt;
    renderReceipt();
  }catch(error){
    if(String(currentOrderId)===String(id))
      $("receiptResult").textContent="Result read unavailable. Use Refresh result to try again.";
  }
}
function renderReceipt() {
  const root = $("receiptResult");
  root.replaceChildren();
  root.classList.remove("empty");
  if (!currentReceipt) { root.textContent = "No finalized Proof Receipt for this order and version yet."; return; }
  try {
    const parsed = describeReceipt(currentReceipt);
    root.append(elem("h3", "Proof Receipt / v" + currentReceipt.version),pill(parsed.status));
    textPair(root,"CRITERIA",parsed.satisfied + " / " + parsed.total + " SATISFIED");
    textPair(root,"AGGREGATION",parsed.consistent ? "CONSISTENT" : "INCONSISTENT — REVIEW");
    textPair(root,"CHAIN",currentReceipt.chain_id);
    textPair(root,"EVALUATED",currentReceipt.evaluated_at ? new Date(currentReceipt.evaluated_at * 1000).toLocaleString() : "—");
    for (const r of currentReceipt.results || []) {
      const section = elem("div", undefined, "criterion");
      section.append(elem("strong", String(r.id) + " / " + String(r.status)),
        elem("p", String(r.artifact_quote || "No artifact excerpt"), "quote"),
        elem("small", "Reference: " + String(r.reference_quote || "No excerpt")));
      root.append(section);
    }
    const note = elem("p","Verified state is requested from GenLayer RPC. For independent proof check network, source bytes, and full transaction receipt.","hint");
    root.append(note);
  } catch (error) { showError(error,root); }
}
function showTx(label, hash = "") {
  const quick=$("transactionNotice");
  if(quick){
    quick.hidden=false;
    quick.replaceChildren(elem("strong",label),
      elem("span"," · "+(hash ? hash.slice(0,12)+"…"+hash.slice(-8) : "See status below.")));
    const link=elem("a","View transaction details ↗");
    link.href="#advancedTools";
    link.addEventListener("click",()=>{$("advancedTools").open=true;});
    quick.append(link);
  }
  const root = $("txResult");
  root.replaceChildren();
  root.classList.remove("empty");
  root.append(elem("h3", label));
  if (hash) { textPair(root,"HASH",hash); textPair(root,"NETWORK",String(CHAIN_ID)); }
}
async function readFinal(name, args) {
  const raw = await readClient.readContract({
    address: CONTRACT, ...makeRead(name,args),
    transactionHashVariant: TransactionHashVariant.LATEST_FINAL
  });
  return decodeRead(name,raw);
}
async function loadOrder() {
  if (busy) return;
  setBusy(true);
  try {
    const id = getOrderId();
    const record = await readFinal("get_order",[id]);
    if(record)openVerifiedOrder(id,record);
    else{
      currentOrderId=id;
      currentOrder=null;
      currentReceipt=null;
      renderOrder();
    }
    $("receiptResult").textContent = "Click Read finalized Proof Receipt to inspect results.";
  } catch(error) { showError(error,$("orderResult")); }
  finally { setBusy(false); if(wallet && !boardBusy) void refreshMyWork({autoOpen:!userPickedOrder}); }
}
async function loadReceipt() {
  if (busy) return;
  setBusy(true);
  try {
    const id = getOrderId();
    const version = Number($("receiptVersion").value);
    if (!Number.isInteger(version) || version < 1 || version > 2) throw new Error("Receipt version must be 1 or 2.");
    currentReceipt = await readFinal("get_receipt",[id,version]);
    renderReceipt();
  } catch(error) { showError(error,$("receiptResult")); }
  finally { setBusy(false); }
}
function walletChanged(message) {
  walletSequence++;
  wallet=null;
  gateway=null;
  $("walletState").textContent=message;
  $("connectWallet").textContent="Connect wallet ↗";
  clearMyWork("Connect your wallet to see your recent work orders.");
  if(currentOrder)renderOrder();
  refreshAction();
  refreshCreateForm();
}
/** Rebind the injected EIP-1193 account without triggering any wallet prompt.
 * The only active permission request is a deliberate Connect wallet click.
 */
async function bindAuthorizedWallet(accounts,provider=window.ethereum) {
  const account=Array.isArray(accounts) ? accounts[0] : null;
  if(!/^0x[0-9a-fA-F]{40}$/.test(String(account||""))) {
    walletChanged("No account authorized for this site. Connect wallet to continue.");
    return false;
  }
  const sequence=++walletSequence;
  const chainHex=await provider.request({method:"eth_chainId"});
  if(sequence!==walletSequence)return false; // account switched again during RPC
  if(Number.parseInt(String(chainHex),16)!==CHAIN_ID) {
    walletChanged("Wrong network. Switch MetaMask to GenLayer Studionet 61999.");
    return false;
  }
  const client=createClient({chain:studionet,account,provider});
  const bound=createWorkflowGateway({
    client,contractAddress:CONTRACT,
    finalVariant:TransactionHashVariant.LATEST_FINAL,isSuccessful
  });
  if(sequence!==walletSequence)return false;
  const different=wallet!==account.toLowerCase();
  if(different)clearMyWork("Loading the selected wallet's work orders…");
  wallet=account.toLowerCase();
  gateway=bound;
  $("walletState").textContent="Connected / "+wallet+" / Studionet "+CHAIN_ID;
  $("connectWallet").textContent="Connected · switch in MetaMask ↗";
  if(different)userPickedOrder=false; // prioritize tasks relevant to new account
  if(currentOrder)renderOrder();
  selectNextOperation();
  refreshCreateForm();
  // Do not await a full dashboard RPC scan before the wallet can sign.
  if(!busy)void refreshMyWork();
  return true;
}
async function connectWallet() {
  if(busy)return;
  const provider=window.ethereum;
  if(!provider||typeof provider.request!=="function"){
    showError(Error("No EIP-1193 wallet found. Install MetaMask or another compatible wallet."),$("walletState"));
    return;
  }
  setBusy(true);
  try{
    const accounts=await provider.request({method:"eth_requestAccounts"});
    await bindAuthorizedWallet(accounts,provider);
  }catch(error){
    walletChanged(String(error?.message||error));
  }finally{
    setBusy(false);
    if(wallet)void refreshMyWork();
  }
}
async function syncAuthorizedWallet() {
  const provider=window.ethereum;
  if(!provider?.request)return;
  try{
    // eth_accounts checks existing site permission silently; never prompts.
    const accounts=await provider.request({method:"eth_accounts"});
    await bindAuthorizedWallet(accounts,provider);
  }catch(error){
    walletChanged("Wallet permission or network unavailable. Connect wallet if needed.");
  }
}

/* Human-facing create flow. Public bytes are re-fetched and SHA-256 checked
   immediately before signing; no local private key, fake verdict or JSON file. */
function humanFields() {
  return {
    title:$("jobTitle").value.trim(),
    contributor:$("jobContributor").value.trim(),
    reference_url:$("jobReference").value.trim(),
    reference_sha256:verifiedReference?.url===$("jobReference").value.trim() ? verifiedReference.hash : "",
    criterion1:$("jobR1").value.trim(),
    criterion2:$("jobR2").value.trim(),
    criterion3:$("jobR3").value.trim(),
    submit_days:$("submitDays").value,
    revision_days:$("revisionDays").value
  };
}
function refreshCreateForm() {
  if(!$("createNow")) return;
  let message;
  let ready=false;
  let pending=null;
  try{pending=localStorage.getItem(STORAGE_KEY);}catch{}
  if(HEX.test(String(pending||""))) message="A previous transaction is unresolved. Track its hash before creating another work order.";
  else if(!wallet) message="Connect your wallet first.";
  else if(!/^0x[0-9a-fA-F]{40}$/.test($("jobContributor").value.trim()))
    message="Enter the Contributor Wallet: a valid 0x address with 40 hexadecimal characters.";
  else if($("jobContributor").value.trim().toLowerCase()===wallet.toLowerCase())
    message="Contributor must be another wallet, not your connected Owner wallet.";
  else if(!verifiedReference ||
      verifiedReference.url!==$("jobReference").value.trim())
    message="Verify the public reference document to calculate its SHA-256.";
  else {
    try {
      const fields=humanFields();
      prepareUserOrder(fields);
      if(fields.contributor.toLowerCase()===wallet.toLowerCase())
        throw new Error("Owner and contributor need different wallet addresses.");
      message="Ready to create. Review the network cost in MetaMask before signing.";
      ready=true;
    }catch(error){message=String(error?.message||error);}
  }
  $("createNow").disabled=busy||!ready;
  $("createState").textContent=creationOutcome || message;
  $("createState").classList.toggle("empty",!ready);
  $("jobContributor").setAttribute("aria-invalid", wallet && !/^0x[0-9a-fA-F]{40}$/.test($("jobContributor").value.trim()) ? "true" : "false");
}
function loadDemoRequirements(){
  $("jobTitle").value="PROOFLY Demo - User Guide Verification";
  $("jobReference").value=DEMO_REFERENCE;
  $("jobR1").value="The guide explicitly states that this is a trial environment and that it does not accept real money.";
  $("jobR2").value="The guide gives all three steps for reading a saved draft in the order documented by the reference.";
  $("jobR3").value="The guide provides two troubleshooting instructions whose claimed remedies are supported by the reference.";
  $("submitDays").value="2";
  $("revisionDays").value="7";
  verifiedReference=null;
  $("referenceStatus").textContent="Example loaded. Enter your contributor's wallet and verify the reference below.";
  $("referenceStatus").classList.remove("verified");
  refreshCreateForm();
  void verifyReference();
}
async function hashPublicReference(url){
  if(!isPinnedUrl(url))
    throw new Error("Reference must be a public, commit-pinned GitHub raw .txt URL.");
  const response=await fetch(url,{cache:"no-store"});
  if(!response.ok) throw new Error("Reference fetch failed (HTTP "+response.status+").");
  const bytes=await response.arrayBuffer();
  if(!bytes.byteLength||bytes.byteLength>16000)
    throw new Error("Reference must contain 1–16,000 bytes.");
  const hash=await crypto.subtle.digest("SHA-256",bytes);
  return [...new Uint8Array(hash)].map(x=>x.toString(16).padStart(2,"0")).join("");
}
async function verifyReference(){
  if(busy)return;
  setBusy(true);
  try{
    const url=$("jobReference").value.trim();
    const hash=await hashPublicReference(url);
    verifiedReference={url,hash};
    $("referenceStatus").textContent="Reference verified. SHA-256: "+hash;
    $("referenceStatus").classList.add("verified");
  }catch(error){
    verifiedReference=null;
    showError(error,$("referenceStatus"));
    $("referenceStatus").classList.remove("verified");
  }finally{setBusy(false);}
}
async function createNewOrder(){
  if(busy)return;
  creationOutcome=null;
  setBusy(true);
  try{
    requireWallet();
    const fields=humanFields();
    if(!verifiedReference||verifiedReference.url!==fields.reference_url)
      throw new Error("Verify the reference before creating an order.");
    const freshHash=await hashPublicReference(fields.reference_url);
    if(freshHash!==verifiedReference.hash)
      throw new Error("Reference bytes changed. Verify the document again before signing.");
    const args=prepareUserOrder(fields);
    if(fields.contributor.toLowerCase()===wallet.toLowerCase())
      throw new Error("Owner and contributor must be different wallets.");
    const next=await readFinal("next_order",[]);
    if(!/^[1-9][0-9]*$/.test(String(next)))
      throw new Error("Next order ID could not be read from finalized chain state.");
    // The counter here is a pre-sign snapshot, never a verified order ID.
    // At finality discover the EXACT matching order, even if others create
    // their orders concurrently.
    const sent=await gateway.submit("create_order",args,hash=>{
      candidateOrder=candidateFromArgs({before:next,hash,owner:wallet,args});
      $("txHash").value=hash;
      try{
        localStorage.setItem(STORAGE_KEY,hash);
        localStorage.setItem(CREATE_KEY,JSON.stringify(candidateOrder));
      }catch{}
      showTx("SUBMITTED — AUTOMATIC VERIFICATION",hash);
    },estimate=>{
      const feeMessage=estimate ?
        "Estimated protocol feeValue (raw units): "+String(estimate.feeValue) :
        "No upfront protocol fee estimate is available from SDK 1.1.8. Review MetaMask's network cost carefully.";
      return window.confirm("CREATE A REAL STUDIONET WORK ORDER\n\nWallet: "+wallet+
        "\nContract: "+CONTRACT+"\n"+feeMessage+
        "\nThis is not escrow or a payment.\n\nProceed to wallet approval?");
    });
    creationOutcome="Transaction submitted. Automatically verifying execution and finding your new order on-chain. Do not resubmit.";
    showTx("CREATION SUBMITTED — AUTO TRACKING",sent.txId);
    $("txResult").scrollIntoView({behavior:"smooth",block:"start"});
    // Start read-only tracking after the signing action releases its busy guard.
    Promise.resolve().then(()=>track());
  }catch(error){creationOutcome=String(error?.message||error);}
  finally{setBusy(false);}
}

function field(label,id,placeholder,type="text") {
  const wrapper = elem("div",undefined,"field");
  const tag = elem("label",label);
  tag.htmlFor = id;
  const input = document.createElement(type === "textarea" ? "textarea" : "input");
  input.id = id;
  if (type !== "textarea") input.type = "text";
  input.placeholder = placeholder;
  input.autocomplete = "off";
  wrapper.append(tag,input);
  return wrapper;
}
function refreshExtras() {
  const op = $("operation").value;
  const root = $("actionExtra");
  root.replaceChildren();
  if (op === "submit_evidence") {
    verifiedArtifact=null;
    root.append(field("PUBLIC DELIVERABLE LINK","artifactUrl","Permanent public GitHub raw .txt URL"));
    const verify=document.createElement("button");
    verify.type="button";verify.className="secondary";verify.textContent="Verify deliverable automatically";
    const example=document.createElement("button");
    example.type="button";example.className="secondary";example.textContent="Use sample deliverable";
    example.addEventListener("click",()=>{
      $("artifactUrl").value="https://raw.githubusercontent.com/bearbaba/PROOFLY/fa4d29b0e6f8efb50e2472530aff1d0ab7aca77e/fixtures/evidence/pass.txt";
      verifiedArtifact=null;
      $("artifactStatus").textContent="Example loaded. Click Verify deliverable automatically.";
    });
    const status=elem("p","Verification pending. PROOFLY calculates the content hash for you.","hint");
    status.id="artifactStatus";
    root.append(example,verify,status);
    $("artifactUrl").addEventListener("input",()=>{
      verifiedArtifact=null;
      status.textContent="Link changed. Verify again before signing.";
    });
    verify.addEventListener("click",async()=>{
      if(busy)return;
      setBusy(true);
      try{
        const url=$("artifactUrl").value.trim();
        const hash=await hashPublicReference(url);
        verifiedArtifact={url,hash};
        status.textContent="Document verified. SHA-256: "+hash;
      }catch(error){
        verifiedArtifact=null;
        status.textContent=String(error?.message||error);
      }finally{setBusy(false);}
    });
  }
  if (op === "create_order") {
    root.append(field("PASTE EXPORTED UNSIGNED STUDIO CALL PLAN","planJson","Paste the JSON exported from Spec Builder","textarea"));
    const file = document.createElement("input");
    file.type = "file"; file.accept = ".json,application/json";file.id = "planFile";
    file.setAttribute("aria-label","Import unsigned Studio plan JSON");
    file.addEventListener("change",async()=>{
      try {
        if (file.files?.[0]) $("planJson").value = await file.files[0].text();
        refreshAction();
      } catch(error){showError(error,$("actionInfo"));}
    });
    root.append(file);
  }
  root.addEventListener("input", refreshAction, {once:true});
  refreshAction();
}
function updateNextStep() {
  const role=roleFor(currentOrder,wallet);
  const status=String(currentOrder?.status||"");
  const id=currentOrder?.id;
  let label="GET STARTED",title="Connect your wallet",
    detail="Your assigned jobs will appear automatically. You can browse public work without connecting.",
    progress=0;
  if(wallet && !currentOrder){
    label="CHOOSE A JOB";title="Select a work order";
    detail="Pick an assigned job from Your work orders below, or create a new job.";
  }else if(currentOrder){
    const suffix=" · Work order #"+id;
    if(status==="PROPOSED"){
      progress=1;
      if(role==="contributor"){
        label="ACTION REQUIRED"+suffix;title="Accept this work";
        detail="Review the three agreed requirements, then approve acceptance in MetaMask.";
      } else {
        label="AWAITING ACCEPTANCE"+suffix;title="Waiting for contributor";
        detail="Your job is created. Share its link; the assigned contributor must accept before submitting.";
      }
    }else if(status==="ACTIVE"||status==="REVIEWED"){
      progress=2;
      if(role==="contributor"){
        label="ACTION REQUIRED"+suffix;title="Submit your finished work";
        detail="Add a public, commit-pinned deliverable link. PROOFLY checks its content before your signature.";
      }else {
        label="IN PROGRESS"+suffix;title="Waiting for evidence";
        detail="The contributor is working. The next step is their evidence submission.";
      }
    }else if(status==="SUBMITTED"){
      progress=3;label="READY TO VERIFY"+suffix;title="Verify the submitted work";
      detail="Run GenLayer verification and review the cost in MetaMask. The result will appear automatically.";
    }else if(status==="COMPLETED"){
      progress=4;label="VERIFIED"+suffix;title="Verification complete";
      detail="The outcome and requirement-level Proof Receipt are shown in Work details.";
    }else {
      label=status+suffix;title="Review this work order";
      detail="Check the latest on-chain status and any available verification result.";
    }
    if(!wallet){label="PUBLIC VIEW"+suffix;detail+=" Connect the assigned wallet to take action.";}
  }
  $("nextStepState").textContent=label;
  $("nextStepTitle").textContent=title;
  $("nextStepDescription").textContent=detail;
  const steps=$("nextStepPanel").querySelectorAll(".workflow-mini span");
  steps.forEach((el,i)=>el.classList.toggle("is-active",progress>0 && i<progress));
}
function refreshAction() {
  updateNextStep();
  const op = $("operation").value;
  const role = roleFor(currentOrder,wallet);
  let explanation = "";
  if (op === "create_order") explanation = "Create a new order as connected Owner from a reviewed Spec Builder plan. You must control the wallet.";
  if (op === "accept_order") explanation = "Requires Contributor wallet, an existing PROPOSED order, and its exact on-chain spec hash.";
  if (op === "submit_evidence") explanation = "As the contributor, share a permanent public deliverable link. PROOFLY verifies its hash automatically.";
  if (op === "evaluate_submission") explanation = "Permissionless AI + independent validators. Requires SUBMITTED order. Fees may be significant.";
  if (op === "cancel_order") explanation = "Requires Owner and PROPOSED order. This cannot be reversed.";
  if (op === "close_expired") explanation = "Permissionless closing after the revision deadline; only certain states allow it.";
  const needed = op === "create_order" ? true :
    !!currentOrder && currentOrderId === $("orderId").value.trim();
  const correctRole = op === "create_order" || op === "evaluate_submission" || op === "close_expired" ||
    (op === "cancel_order" && role === "owner") ||
    ((op === "accept_order" || op === "submit_evidence") && role === "contributor");
  const validState = op === "create_order" || op === "close_expired" ||
    (op === "accept_order" && currentOrder?.status === "PROPOSED") ||
    (op === "submit_evidence" && ["ACTIVE","REVIEWED"].includes(currentOrder?.status)) ||
    (op === "evaluate_submission" && currentOrder?.status === "SUBMITTED") ||
    (op === "cancel_order" && currentOrder?.status === "PROPOSED");
  const waiting=role==="owner" && op==="accept_order" && currentOrder?.status==="PROPOSED";
  const roleInfo=waiting ? " Waiting for the Contributor wallet to accept this order." :
    role==="viewer" ? " Connect the assigned wallet to act on this order." :
    !correctRole ? " This action is not available to your wallet role." : "";
  $("actionInfo").textContent = explanation + (!wallet ? " Connect your wallet to continue." :
    !needed ? " Choose a work order from Your work orders above." :
    roleInfo || (!validState ? " This step is not available in the current order state." : " Ready to review and sign."));
  const names={
    accept_order:"Accept this work order →",
    submit_evidence:"Submit evidence & sign →",
    evaluate_submission:"Run AI verification →",
    cancel_order:"Cancel work order →",
    close_expired:"Close expired order →"
  };
  const waiting=!!currentOrder && (
    (role==="owner" && ["PROPOSED","ACTIVE","REVIEWED"].includes(currentOrder.status)) ||
    currentOrder.status==="COMPLETED");
  $("writeAction").textContent=waiting ?
    (currentOrder.status==="COMPLETED" ? "View verification result below ↓" : "Waiting for contributor") :
    names[op]||"Review cost & sign →";
  $("writeAction").disabled = busy || !wallet || !needed || !correctRole || !validState || waiting;
}
function parameters() {
  const op = $("operation").value;
  if (op === "create_order") {
    const plan = parseStudioPlan($("planJson").value);
    if (wallet?.toLowerCase() === plan.contributor.toLowerCase())
      throw new Error("Owner and contributor must be different wallet addresses.");
    return {op,args:plan.args};
  }
  const id = getOrderId();
  if (!currentOrder || currentOrderId !== id) throw new Error("Read the finalized order before signing.");
  if (op === "submit_evidence" && !isPinnedUrl($("artifactUrl")?.value?.trim()))
    throw new Error("Only public 40-character commit-pinned GitHub raw TXT URLs are allowed.");
  if(op==="submit_evidence" &&
     (!verifiedArtifact || verifiedArtifact.url!==$("artifactUrl").value.trim()))
    throw new Error("Verify the current deliverable link before signing.");
  const args = preparedAction(op,id,currentOrder,{
    artifact_url:$("artifactUrl")?.value,artifact_sha256:verifiedArtifact?.hash
  });
  return {op,args};
}
async function submit() {
  if (busy) return;
  let trackedHash=null;
  setBusy(true);
  try {
    requireWallet();
    const {op,args} = parameters();
    if(op==="submit_evidence") {
      const fresh=await hashPublicReference(verifiedArtifact.url);
      if(fresh!==verifiedArtifact.hash)
        throw new Error("Deliverable bytes changed. Verify the link again before signing.");
    }
    const r = await gateway.submit(op,args,hash=>{
      $("txHash").value = hash;
      try {localStorage.setItem(STORAGE_KEY,hash);} catch {}
      showTx("SUBMITTED — NOT YET FINAL",hash);
    },estimate=>{
      const feeMessage = estimate ?
        "Estimated protocol feeValue (raw GEN units): " +
          String(estimate.feeValue) :
        "GENLAYER SDK 1.1.8 DOES NOT PROVIDE AN UPFRONT PROTOCOL FEE ESTIMATE. " +
          "No value is transferred to the contract. Examine network fees " +
          "in MetaMask before approving its signature. Reject if unexpected.";
      return window.confirm("REAL STUDIONET TRANSACTION\n\nMethod: "+op+"\nWallet: "+wallet+
        "\nContract: "+CONTRACT+"\n"+feeMessage+
        "\n\nContinue to MetaMask cost review and signing? No automatic retries.");
    });
    showTx(r.status,r.txId);
    trackedHash=r.txId;
  } catch(error) {showError(error);}
  finally {
    setBusy(false);
    // Read-only transaction tracking follows wallet approval automatically.
    // Never trigger another signature or retry this transaction.
    if(trackedHash)window.setTimeout(()=>{if(!busy)void track();},0);
  }
}
async function track() {
  if (busy) return;
  setBusy(true);
  try {
    const hash=$("txHash").value.trim();
    if (!HEX.test(hash)) throw new Error("Enter a complete 0x-prefixed 32-byte transaction hash.");
    showTx("WAITING FOR FINALIZATION — do not resend",hash);
    const tx = typeof readClient.waitForFinalization === "function" ?
      await readClient.waitForFinalization({hash}) :
      await readClient.waitForTransactionReceipt({
        hash, status: TransactionStatus.FINALIZED, fullTransaction: true
      });
    let verdict = inspectTransaction(tx);
    // The pinned GenLayerJS 1.1.8 simplified receipt renames statusName
    // to status_name and can omit execution fields. Attempt a full
    // independent SDK read rather than displaying a fabricated ERROR.
    if (verdict.kind === "unverified" && typeof readClient.getTransaction === "function") {
      try {
        const extended = await readClient.getTransaction({hash});
        const inspected = inspectTransaction(extended);
        if (inspected.kind === "success" || inspected.kind === "failed")
          verdict = inspected;
      } catch (_) { /* Full receipt remains unknown; never fake failure. */ }
    }
    const outcome = verdict.kind === "success" ? "FINALIZED / EXECUTION SUCCESS" :
      verdict.kind === "failed" ? "FINALIZED / EXECUTION FAILED" :
      verdict.kind === "unverified" ? "FINALIZED / EXECUTION NOT VERIFIED" :
      "TRANSACTION STATUS NOT VERIFIED";
    showTx(outcome,hash);
    textPair($("txResult"),"CONSENSUS",verdict.consensus);
    textPair($("txResult"),"EXECUTION",verdict.execution);
    const explorer = document.createElement("a");
    explorer.href = EXPLORER + "/tx/" + hash;
    explorer.target = "_blank";
    explorer.rel = "noopener noreferrer";
    explorer.textContent = "Inspect original transaction and GenVM logs in Explorer ↗";
    $("txResult").append(explorer);
    if (verdict.kind !== "success" && verdict.kind !== "failed") {
      textPair($("txResult"),"NEXT STEP","Receipt lacks enough detail to classify execution. Keep this hash, check Explorer and do NOT resend.");
      // Preserve pending local transaction hash, protecting users from repeats.
      return;
    }
    if (verdict.kind === "failed") {
      try{
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(CREATE_KEY);
      }catch{}
      candidateOrder=null;
      textPair($("txResult"),"NEXT STEP","GenVM execution failed. Inspect the full error in Explorer before considering a new action.");
      return;
    }
    // Consensus + execution succeeded. Do not assume order ID from a
    // previous counter snapshot. Recover exactly one matching on-chain order.
    if(candidateOrder && candidateOrder.hash===hash){
      try{
        const found=await discoverCreatedOrder(candidateOrder,readFinal);
        if(found.status==="verified"){
          openVerifiedOrder(found.order.id,found.order);
          creationOutcome="Work order #"+found.order.id+" created. Share its link with the contributor.";
          $("createState").textContent=creationOutcome;
          textPair($("txResult"),"ON-CHAIN ORDER","#"+found.order.id+" / "+found.order.status);
          candidateOrder=null;
          try{
            localStorage.removeItem(STORAGE_KEY);
            localStorage.removeItem(CREATE_KEY);
          }catch{}
          $("orderHandoff").scrollIntoView({behavior:"smooth",block:"center"});
          return;
        }
        textPair($("txResult"),"ORDER IDENTIFICATION","Execution succeeded; on-chain order not uniquely confirmed ("+found.status+"). Keep the hash. PROOFLY will not guess an ID or resend.");
      }catch(error){
        textPair($("txResult"),"ORDER IDENTIFICATION","Could not read the new order: "+String(error?.message||error)+". Keep the hash and retry tracking later.");
      }
      // Preserve pending metadata: user can reload and resume reads safely.
      return;
    }
    try{
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(CREATE_KEY);
    }catch{}
    if(currentOrderId){
      try{
        const order=await readFinal("get_order",[currentOrderId]);
        if(order)openVerifiedOrder(currentOrderId,order);
        $("receiptResult").textContent="Refresh receipt after successful evaluation.";
      }catch(error){showError(error,$("orderResult"));}
    }
  } catch(error){
    showError(new Error("Tracking unresolved or failed: " + String(error?.message||error)+". Check transaction hash before retrying."));
  } finally {
    setBusy(false);
    if(wallet)void refreshMyWork({autoOpen:false});
  }
}
$("loadOrder").addEventListener("click",()=>{
  userPickedOrder=true;
  void loadOrder();
});
$("refreshMyWork").addEventListener("click",()=>{void refreshMyWork({autoOpen:false});});
$("loadDemo").addEventListener("click",loadDemoRequirements);
$("fillDemoContributor").addEventListener("click",()=>{
  $("jobContributor").value=DEMO_CONTRIBUTOR;
  creationOutcome=null;
  refreshCreateForm();
  $("jobContributor").focus();
});
$("verifyReference").addEventListener("click",verifyReference);
$("createNow").addEventListener("click",createNewOrder);
$("createForm").addEventListener("submit",event=>event.preventDefault());
$("createForm").addEventListener("input",event=>{
  if(event.target?.id==="jobReference"){
    verifiedReference=null;
    creationOutcome=null;
    $("referenceStatus").textContent="Reference changed. Verify again before creating.";
    $("referenceStatus").classList.remove("verified");
  }
  creationOutcome=null;
  refreshCreateForm();
});
$("loadReceipt").addEventListener("click",loadReceipt);
$("connectWallet").addEventListener("click",connectWallet);
$("operation").addEventListener("change",refreshExtras);
$("writeAction").addEventListener("click",submit);
$("trackTx").addEventListener("click",track);
$("copyOrderLink").addEventListener("click",async()=>{
  const link=$("shareOrderUrl").value;
  if(!link)return;
  try{
    await navigator.clipboard.writeText(link);
    $("copyOrderLink").textContent="Copied ✓";
  }catch{
    $("shareOrderUrl").focus();
    $("shareOrderUrl").select();
    $("copyOrderLink").textContent="Select the link and copy it";
  }
});
$("orderId").addEventListener("input",refreshAction);
$("receiptResult").textContent="Read an order first, then select a receipt version.";
$("txResult").textContent="Only real hashes from signed wallet transactions appear here.";
refreshCreateForm();
// Public deep links and last verified order load without MetaMask prompts.
const requested=queryOrder(window.location.search);
let last=null;
try{last=localStorage.getItem(LAST_ORDER_KEY);}catch{}
const initial=requested||(/^[1-9][0-9]{0,9}$/.test(last||"")?last:null);
if(initial){
  $("orderId").value=initial;
  void loadOrder();
}
// Resume read-only finality monitoring after a page reload. No new signature.
try {
  const pending=localStorage.getItem(STORAGE_KEY);
  if(pending && HEX.test(pending)){
    $("txHash").value=pending;
    candidateOrder=restoreCandidate(localStorage.getItem(CREATE_KEY),pending);
    const resume=()=>{
      if(!busy)void track();
      else window.setTimeout(resume,300);
    };
    window.setTimeout(resume,0);
  }
}catch{}
if(window.ethereum?.on) {
  window.ethereum.on("accountsChanged",accounts=>{
    if(!Array.isArray(accounts)||!accounts.length) {
      walletChanged("No wallet selected. Connect a wallet to act.");
      return;
    }
    void bindAuthorizedWallet(accounts).catch(error=>walletChanged(String(error?.message||error)));
  });
  window.ethereum.on("chainChanged",()=>{
    // Revalidate silently. No wallet signature, Snap, or requestAccounts prompt.
    void syncAuthorizedWallet();
  });
}
refreshExtras();
void syncAuthorizedWallet();
window.setInterval(()=>{
  if(document.visibilityState!=="visible" || busy || boardBusy)return;
  if(wallet)void refreshMyWork({autoOpen:false});
},45000);
