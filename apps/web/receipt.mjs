import { parseUniqueJson, verifyReceiptBundle, MAX_EVIDENCE, MAX_METADATA } from "./receipt-model.mjs";

const $ = id => document.getElementById(id);
const fileFields = ["orderFile", "receiptFile", "artifactFile", "referenceFile"];
const make = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = String(text);
  return node;
};
function fieldText(container, label, value) {
  container.append(make("dt", "", label), make("dd", "", value ?? "—"));
}
function reset() {
  $("verdict").textContent = "Not checked";
  $("verdict").dataset.state = "idle";
  $("passedCount").textContent = "—";
  $("errorCount").textContent = "—";
  $("message").textContent = "";
  $("findingsSection").hidden = true;
  $("errors").replaceChildren();
  $("metadata").replaceChildren();
  $("requirements").replaceChildren();
}
for (const id of fileFields) $(id).addEventListener("change", reset);
async function readLimited(file, max) {
  if (!file || !file.size || file.size > max) throw new Error(
    "File missing, empty, or exceeds " + max + " bytes.");
  return new Uint8Array(await file.arrayBuffer());
}
function showResults(report, order, receipt) {
  $("verdict").dataset.state = report.valid ? "valid" : "invalid";
  $("verdict").textContent = report.valid ? "Structurally consistent" : "Integrity check failed";
  $("passedCount").textContent = String(report.checks.length);
  $("errorCount").textContent = String(report.errors.length);
  const issues = $("errors");
  issues.replaceChildren();
  if (report.valid) issues.append(make("p", "issue success",
    "Supplied files are mutually consistent. This does not authenticate onchain data."));
  else for (const error of report.errors.slice(0, 35))
    issues.append(make("p", "issue error", error));
  if (report.errors.length > 35)
    issues.append(make("p", "issue", "Additional integrity errors omitted."));

  const meta = $("metadata");
  meta.replaceChildren();
  fieldText(meta, "Order ID", typeof order?.id === "string" ? order.id : "—");
  fieldText(meta, "Receipt version", Number.isSafeInteger(receipt?.version) ? receipt.version : "—");
  fieldText(meta, "Claimed outcome", typeof receipt?.outcome === "string" ? receipt.outcome : "—");
  fieldText(meta, "Claimed contract", typeof receipt?.contract === "string" ? receipt.contract : "—");
  fieldText(meta, "Spec commitment", typeof receipt?.spec_sha256 === "string" ? receipt.spec_sha256 : "—");
  fieldText(meta, "Authenticity/finality", "NOT VERIFIED — compare against trusted RPC");

  const target = $("requirements");
  target.replaceChildren();
  const rubric = Array.isArray(order?.spec?.criteria) ? order.spec.criteria : [];
  const decisions = Array.isArray(receipt?.results) ? receipt.results : [];
  if (rubric.length > 5 || decisions.length > 5) return;
  rubric.forEach((r, i) => {
    if (!r || typeof r !== "object") return;
    const decision = decisions[i];
    const card = make("article", "receipt-requirement");
    const status = typeof decision?.status === "string" &&
      ["SATISFIED", "UNSATISFIED", "UNVERIFIABLE"].includes(decision.status)
      ? decision.status : "INVALID";
    card.append(make("h3", "", String(r.id ?? "") + " · " + String(r.text ?? "")));
    const pill = make("span", "status", status);
    pill.dataset.status = status;
    card.append(pill);
    for (const role of ["artifact", "reference"]) {
      const quote = decision?.[role + "_quote"];
      if (typeof quote === "string" && quote.length <= 400 && quote.length) {
        card.append(make("p", "", role === "artifact" ? "Artifact quotation" : "Reference quotation"));
        // textContent only: untrusted contract-stored text cannot run HTML.
        card.append(make("blockquote", "", quote));
      }
    }
    target.append(card);
  });
  $("findingsSection").hidden = false;
}
$("receiptForm").addEventListener("submit", async event => {
  event.preventDefault();
  reset();
  const button = $("verifyButton");
  button.disabled = true;
  $("message").textContent = "Checking local files. Nothing is uploaded.";
  try {
    const files = fileFields.map(id => $(id).files?.[0]);
    if (files.some(x => !x)) throw new Error("Choose all four required files.");
    const [rawOrder, rawReceipt, artifact, reference] = await Promise.all(
      files.map((file, i) => readLimited(file, i < 2 ? MAX_METADATA : MAX_EVIDENCE))
    );
    const order = parseUniqueJson(new TextDecoder("utf-8", { fatal: true }).decode(rawOrder));
    const receipt = parseUniqueJson(new TextDecoder("utf-8", { fatal: true }).decode(rawReceipt));
    const report = await verifyReceiptBundle(order, receipt, artifact, reference);
    showResults(report, order, receipt);
    $("message").textContent = report.valid ?
      "Offline bundle integrity is consistent. Independent network verification is still required." :
      "One or more structural or cryptographic integrity checks failed.";
  } catch (err) {
    showResults({ valid: false, checks: [], errors: ["INPUT_REJECTED: " + (err?.message || "Invalid input")] }, null, null);
    $("message").textContent = "The file bundle was rejected before verification.";
  } finally {
    button.disabled = false;
  }
});
