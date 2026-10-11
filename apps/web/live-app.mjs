/**
 * PROOFLY's actual Studionet client. No mock RPC, local private keys, or
 * fabricated verdicts. No write occurs unless wallet, confirmation and fee
 * estimate are all explicitly provided by the user.
 */
import { createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import { TransactionHashVariant, TransactionStatus } from "genlayer-js/types";
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
  return ["ACCEPTED", "FINALIZED"].includes(String(tx?.statusName || "")) &&
    tx?.txExecutionResultName === "FINISHED_WITH_RETURN";
}
const HEX = /^0x[0-9a-fA-F]{64}$/;
const STORAGE_KEY = "proofly.studionet.61999.pending";
const DEMO_REFERENCE = "https://raw.githubusercontent.com/bearbaba/PROOFLY/fa4d29b0e6f8efb50e2472530aff1d0ab7aca77e/fixtures/evidence/reference.txt";
const DEMO_CONTRIBUTOR = "0xd6b8a3a5eb329410d9504784812b8569afa8c2af";
let verifiedReference = null;
let verifiedArtifact = null;
let candidateOrder = null;
let creationOutcome = null;

function elem(tag, text, className) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = String(text);
  if (className) node.className = className;
  return node;
}
function showError(error, region = $("txResult")) {
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
}
function getOrderId() {
  const id = $("orderId").value.trim();
  if (!/^[1-9][0-9]*$/.test(id)) throw new Error("Order number must be a positive decimal ID.");
  return id;
}
function requireWallet() {
  if (!wallet || !gateway) throw new Error("Connect an EIP-1193 wallet on Studionet before signing.");
}
function renderOrder() {
  const root = $("orderResult");
  root.replaceChildren();
  root.classList.remove("empty");
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
    currentOrderId = id;
    currentOrder = record;
    currentReceipt = null;
    renderOrder();
    $("receiptResult").textContent = "Click Read finalized Proof Receipt to inspect results.";
  } catch(error) { showError(error,$("orderResult")); }
  finally { setBusy(false); }
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
  wallet = null;
  gateway = null;
  $("walletState").textContent = message;
  $("connectWallet").textContent = "Connect wallet ↗";
  if (currentOrder) renderOrder();
  refreshAction();
  refreshCreateForm();
}
async function connectWallet() {
  if (busy) return;
  const provider = window.ethereum;
  if (!provider || typeof provider.request !== "function") {
    showError(new Error("No EIP-1193 browser wallet found. Install MetaMask or a compatible wallet."),$("walletState"));
    return;
  }
  setBusy(true);
  try {
    const accounts = await provider.request({method:"eth_requestAccounts"});
    if (!Array.isArray(accounts) || !/^0x[0-9a-fA-F]{40}$/.test(accounts[0] || "")) throw new Error("Wallet returned no valid account.");
    const account = accounts[0];
    const client = createClient({chain:studionet,account,provider});
    // SDK network connection is a user-triggered action, never automatic.
    await client.connect("studionet");
    const chainHex = await provider.request({method:"eth_chainId"});
    if (parseInt(String(chainHex),16) !== CHAIN_ID) throw new Error("Wrong chain. Switch wallet to Studionet (61999).");
    const bound = createWorkflowGateway({
      client,contractAddress:CONTRACT,
      finalVariant:TransactionHashVariant.LATEST_FINAL,isSuccessful
    });
    wallet = account.toLowerCase();
    gateway = bound;
    $("walletState").textContent = "Connected / " + wallet + " / Studionet " + CHAIN_ID;
    $("connectWallet").textContent = "Reconnect / switch account";
    renderOrder();
    refreshAction();
    refreshCreateForm();
  } catch(error) { walletChanged(String(error?.message || error)); showError(error,$("walletState")); }
  finally { setBusy(false); }
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
    const planned={id:String(next),title:fields.title,owner:wallet,
      contributor:fields.contributor.toLowerCase()};
    const sent=await gateway.submit("create_order",args,hash=>{
      candidateOrder=planned;
      $("txHash").value=hash;
      try{localStorage.setItem(STORAGE_KEY,hash);}catch{}
      showTx("SUBMITTED — CHECK FINALITY",hash);
    },estimate=>{
      const feeMessage=estimate ?
        "Estimated protocol feeValue (raw units): "+String(estimate.feeValue) :
        "No upfront protocol fee estimate is available from SDK 1.1.8. Review MetaMask's network cost carefully.";
      return window.confirm("CREATE A REAL STUDIONET WORK ORDER\n\nWallet: "+wallet+
        "\nContract: "+CONTRACT+"\n"+feeMessage+
        "\nThis is not escrow or a payment.\n\nProceed to wallet approval?");
    });
    creationOutcome="Transaction submitted! Expected work order #"+
      planned.id+". Click Track finality to confirm. Do not create again while pending.";
    showTx("CREATION SUBMITTED — TRACK FINALITY",sent.txId);
    $("txResult").scrollIntoView({behavior:"smooth",block:"start"});
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
function refreshAction() {
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
  $("actionInfo").textContent = explanation + (!wallet ? " Connect a wallet first." : !needed ? " Load a finalized order first." : !correctRole ? " Current wallet is not authorized." : !validState ? " Order state does not allow this call." : "");
  $("writeAction").disabled = busy || !wallet || !needed || !correctRole || !validState;
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
  } catch(error) {showError(error);}
  finally { setBusy(false); }
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
        hash, status: TransactionStatus.FINALIZED, fullTransaction: false
      });
    const ok = isSuccessful(tx);
    showTx(ok ? "FINALIZED / EXECUTION SUCCESS" : "FINALIZED / EXECUTION FAILED",hash);
    textPair($("txResult"),"CONSENSUS",String(tx?.statusName || "Inspect transaction record"));
    textPair($("txResult"),"EXECUTION",String(tx?.txExecutionResultName || (ok ? "SUCCESS" : "ERROR")));
    try {localStorage.removeItem(STORAGE_KEY);} catch {}
    // Read the latest finalized state only after checking execution.
    if (ok && candidateOrder) {
      try{
        const proposed=await readFinal("get_order",[candidateOrder.id]);
        if(proposed?.owner?.toLowerCase()===candidateOrder.owner &&
           proposed?.contributor?.toLowerCase()===candidateOrder.contributor &&
           proposed?.title===candidateOrder.title){
          $("orderId").value=candidateOrder.id;
          currentOrderId=candidateOrder.id;
          currentOrder=proposed;
          renderOrder();
          creationOutcome="Work order #"+candidateOrder.id+
            " created and finalized. Share this order number with your contributor.";
          candidateOrder=null;
        }else{
          $("createState").textContent="Transaction finalized, but the proposed order ID could not be confirmed. Check on-chain orders before another write.";
        }
      }catch(error){showError(error,$("createState"));}
    } else if (ok && currentOrderId) {
      try {
        currentOrder = await readFinal("get_order",[currentOrderId]);
        renderOrder();
        currentReceipt = null;
        $("receiptResult").textContent = "Refresh receipt after successful evaluation.";
      } catch(error){showError(error,$("orderResult"));}
    }
  } catch(error){
    showError(new Error("Tracking unresolved or failed: " + String(error?.message||error)+". Check transaction hash before retrying."));
  } finally {setBusy(false);}
}
$("loadOrder").addEventListener("click",loadOrder);
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
$("orderId").addEventListener("input",refreshAction);
$("receiptResult").textContent="Read an order first, then select a receipt version.";
$("txResult").textContent="Only real hashes from signed wallet transactions appear here.";
refreshCreateForm();
try { const pending=localStorage.getItem(STORAGE_KEY); if (pending && HEX.test(pending)) $("txHash").value=pending; } catch {}
if(window.ethereum?.on) {
  window.ethereum.on("accountsChanged",()=>walletChanged("Wallet account changed. Reconnect before signing."));
  window.ethereum.on("chainChanged",()=>walletChanged("Wallet network changed. Reconnect to Studionet."));
}
refreshExtras();
