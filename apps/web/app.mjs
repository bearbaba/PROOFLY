import { validateDraft, normalizeDraft } from "./model.mjs";

const $ = selector => document.querySelector(selector);
const SAMPLE_REFERENCE = "https://raw.githubusercontent.com/bearbaba/PROOFLY/" +
  "fa4d29b0e6f8efb50e2472530aff1d0ab7aca77e/fixtures/evidence/reference.txt";
const SAMPLE_HASH = "9edf98b490eeb1b64f5e3f0b71a368ce38e9ba0e79070818eae3b2c70bb48527";
const SAMPLE_CRITERIA = [
  "State that the demo is a trial environment that accepts no real money.",
  "Provide the three saved-draft reading steps in the correct order.",
  "Include two troubleshooting remedies supported by the reference."
];
let criteria = SAMPLE_CRITERIA.map((text, i) => ({ id: "R" + (i + 1), text }));
let latest = null;

function el(tag, klass, text) {
  const node = document.createElement(tag);
  if (klass) node.className = klass;
  if (text !== undefined) node.textContent = text;
  return node;
}

function localDate(days) {
  const d = new Date(Date.now() + days * 86400000);
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function renderCriteria() {
  const target = $("#criteria");
  target.replaceChildren();
  criteria.forEach((item, index) => {
    const wrapper = el("div", "criterion");
    const row = el("div", "criterion-top");
    const tag = el("span", "criterion-id", "R" + (index + 1));
    const label = el("label", "criterion-label", "REQUIREMENT " + (index + 1));
    const textArea = el("textarea", "criterion-input");
    textArea.id = "criterion-" + index;
    label.htmlFor = textArea.id;
    textArea.maxLength = 500;
    textArea.rows = 2;
    textArea.placeholder = "Describe exactly what evidence must show.";
    textArea.value = item.text;
    textArea.addEventListener("input", () => {
      criteria[index].text = textArea.value;
      update();
    });
    const remove = el("button", "remove-criterion", "Remove");
    remove.type = "button";
    remove.disabled = criteria.length <= 3;
    remove.setAttribute("aria-label", "Remove requirement " + (index + 1));
    remove.addEventListener("click", () => {
      if (criteria.length <= 3) return;
      criteria.splice(index, 1);
      renumber();
      renderCriteria();
      update();
    });
    row.append(tag, label, remove);
    wrapper.append(row, textArea);
    target.append(wrapper);
  });
  $("#addCriterion").disabled = criteria.length >= 5;
  $("#criterionCount").textContent = criteria.length + " / 5";
}

function renumber() {
  criteria = criteria.map((item, i) => ({ id: "R" + (i + 1), text: item.text }));
}

function parseDeadline(selector) {
  const raw = $(selector).value;
  const timestamp = raw ? new Date(raw).getTime() : NaN;
  return Number.isFinite(timestamp) ? Math.floor(timestamp / 1000) : null;
}

function draft() {
  return {
    title: $("#title").value,
    contributor: $("#contributor").value,
    reference_url: $("#source").value,
    reference_sha256: $("#sourceHash").value,
    criteria: criteria.map(item => ({ ...item })),
    submit_deadline: parseDeadline("#submitDeadline"),
    revision_deadline: parseDeadline("#revisionDeadline")
  };
}

function showIssues(report) {
  const root = $("#issues");
  root.replaceChildren();
  const findings = [
    ...report.errors.map(x => ({ ...x, level: "error" })),
    ...report.warnings.map(x => ({ ...x, level: "warning" }))
  ];
  if (!findings.length) {
    root.append(el("p", "issue success", "No local structural issues detected."));
    return;
  }
  for (const f of findings.slice(0, 10)) {
    const item = el("div", "issue " + f.level);
    item.append(el("span", "issue-icon", f.level === "error" ? "!" : "i"));
    const details = el("div");
    details.append(el("strong", "", f.field), el("p", "", f.message));
    item.append(details);
    root.append(item);
  }
  if (findings.length > 10) root.append(el("p", "issue", "Additional issues omitted."));
}

function update() {
  const raw = draft();
  const report = validateDraft(raw);
  latest = report.valid ? normalizeDraft(raw) : null;
  $("#errorCount").textContent = String(report.errors.length).padStart(2, "0");
  $("#warningCount").textContent = String(report.warnings.length).padStart(2, "0");
  $("#criteriaPreview").textContent = criteria.length + " required";
  $("#healthBadge").textContent = report.valid ? "Structure valid" : "Needs review";
  $("#healthBadge").className = "health-badge" + (report.valid ? " is-valid" : "");
  $("#healthBar").style.width = report.valid ? "100%" :
    Math.max(12, 100 - report.errors.length * 14) + "%";
  $("#healthBar").className = "meter-bar" + (report.valid ? " is-valid" : "");
  $("#exportButton").disabled = !report.valid;
  $("#copyButton").disabled = !report.valid;
  showIssues(report);
  return report;
}

function loadExample() {
  $("#title").value = "Proofly Demo Service — User Guide";
  $("#contributor").value = "0x1111111111111111111111111111111111111111";
  $("#source").value = SAMPLE_REFERENCE;
  $("#sourceHash").value = SAMPLE_HASH;
  $("#submitDeadline").value = localDate(2);
  $("#revisionDeadline").value = localDate(7);
  criteria = SAMPLE_CRITERIA.map((text, i) => ({ id: "R" + (i + 1), text }));
  renderCriteria();
  update();
  $("#actionMessage").textContent = "Example loaded. Review all values before using any draft.";
}

$("#fillSample").addEventListener("click", loadExample);
$("#addCriterion").addEventListener("click", () => {
  if (criteria.length >= 5) return;
  criteria.push({ id: "R" + (criteria.length + 1), text: "" });
  renderCriteria();
  update();
});
$("#specForm").addEventListener("input", update);
$("#specForm").addEventListener("submit", event => {
  event.preventDefault();
  const result = update();
  $("#actionMessage").textContent = result.valid
    ? "Offline structure is valid. Export the unsigned draft for review."
    : "Resolve the blocking issues before exporting.";
});

$("#exportButton").addEventListener("click", () => {
  const report = update();
  if (!report.valid || !latest) return;
  const data = JSON.stringify(latest, null, 2) + "\n";
  const objectURL = URL.createObjectURL(new Blob([data], { type: "application/json" }));
  const a = document.createElement("a");
  a.href = objectURL;
  a.download = "proofly-work-order-draft.json";
  document.body.append(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(objectURL);
  $("#actionMessage").textContent = "Unsigned JSON draft exported. No transaction was submitted.";
});

$("#copyButton").addEventListener("click", async () => {
  const report = update();
  if (!report.valid || !latest) return;
  if (!navigator.clipboard?.writeText) {
    $("#actionMessage").textContent = "Clipboard unavailable. Use Export JSON draft instead.";
    return;
  }
  try {
    await navigator.clipboard.writeText(JSON.stringify(latest, null, 2));
    $("#actionMessage").textContent = "Unsigned JSON copied to clipboard.";
  } catch {
    $("#actionMessage").textContent = "Clipboard permission denied. Use Export JSON draft instead.";
  }
});

loadExample();
