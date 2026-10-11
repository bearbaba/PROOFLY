import { test } from "node:test";
import { strict as assert } from "node:assert";
import { isPinnedUrl, normalizeDraft, validateDraft } from "./model.mjs";

const NOW = 1_800_000_000_000;
const URL = "https://raw.githubusercontent.com/bearbaba/PROOFLY/" + "a".repeat(40) +
  "/fixtures/evidence/reference.txt";
function valid() {
  return {
    title: "Document review",
    contributor: "0x" + "1".repeat(40),
    reference_url: URL, reference_sha256: "f".repeat(64),
    submit_deadline: NOW / 1000 + 3600,
    revision_deadline: NOW / 1000 + 7200,
    criteria: [
      { id: "R1", text: "Explain the trial environment." },
      { id: "R2", text: "List all steps in order." },
      { id: "R3", text: "Include two sourced troubleshooting examples." }
    ]
  };
}
test("valid structural draft is explicitly not an onchain verdict", () => {
  const x = validateDraft(valid(), NOW);
  assert.equal(x.valid, true);
  assert.equal(x.errors.length, 0);
  assert.ok(x.warnings.some(e => e.field === "network"));
});
test("reject unsafe source URLs and traversal", () => {
  for (const url of ["http://localhost/test.txt", URL.replace("a".repeat(40), "main"),
    URL.replace("raw.githubusercontent.com", "evil.example"),
    URL + "?auth=token", URL.replace("fixtures/evidence", "fixtures/../evidence")]) {
    assert.equal(isPinnedUrl(url), false, url);
  }
});
test("do not accept duplicate criterion IDs", () => {
  const x = valid();
  x.criteria[2].id = "R1";
  assert.equal(validateDraft(x, NOW).valid, false);
});
test("vague acceptance condition generates warning", () => {
  const x = valid();
  x.criteria[0].text = "Write an excellent and professional guide.";
  const out = validateDraft(x, NOW);
  assert.equal(out.valid, true);
  assert.ok(out.warnings.some(w => w.field === "criteria[0]"));
});
test("reject past and reversed deadlines", () => {
  const x = valid();
  x.submit_deadline = NOW / 1000 - 1;
  assert.equal(validateDraft(x, NOW).valid, false);
  x.submit_deadline = NOW / 1000 + 9000;
  assert.equal(validateDraft(x, NOW).valid, false);
});
test("reject zero and malformed addresses", () => {
  for (const address of ["0x" + "0".repeat(40), "alice", "0x123"]) {
    const x = valid();
    x.contributor = address;
    assert.equal(validateDraft(x, NOW).valid, false);
  }
});
test("must have 3–5 nonempty requirements", () => {
  const x = valid();
  x.criteria = x.criteria.slice(0, 2);
  assert.equal(validateDraft(x, NOW).valid, false);
  x.criteria = valid().criteria;
  x.criteria[0].text = "";
  assert.equal(validateDraft(x, NOW).valid, false);
});
test("export contains no claim of consensus, finality or signing", () => {
  const normalized = normalizeDraft(valid());
  assert.equal(normalized.schema, "proofly.offline-draft.v1");
  assert.ok(normalized.disclaimer.includes("Unsigned"));
  assert.equal(normalized.criteria.length, 3);
  assert.equal(normalized.title, "Document review");
});
