import test from "node:test";
import assert from "node:assert/strict";
import { canonicalJson, parseUniqueJson, sha256, verifyReceiptBundle } from "./receipt-model.mjs";
const enc = new TextEncoder();
const CONTRACT = "0x" + "4".repeat(40);
const OWNER = "0x" + "1".repeat(40);
const CONTRIBUTOR = "0x" + "2".repeat(40);
const base = "https://raw.githubusercontent.com/bearbaba/PROOFLY/" + "a".repeat(40) + "/fixtures/evidence/";
const artifact = enc.encode("Artifact document. Evidence sentence.");
const reference = enc.encode("Reference document. Reference sentence.");

async function fixture() {
  const artifactHash = await sha256(artifact), referenceHash = await sha256(reference);
  const criteria = ["R1", "R2", "R3"].map(id => ({ id, text: "A documented requirement " + id }));
  const spec = { policy: "proofly.work-order.v1", criteria, reference_url: base + "reference.txt",
    reference_sha256: referenceHash, submit_deadline: 100, revision_deadline: 200 };
  const envelope = { policy: "proofly.work-order.v1", chain_id: 1337, contract: CONTRACT,
    order_id: "1", owner: OWNER, contributor: CONTRIBUTOR, title: "Documentation", spec };
  const commitment = await sha256(enc.encode(canonicalJson(envelope)));
  const order = { id: "1", title: "Documentation", owner: OWNER, contributor: CONTRIBUTOR,
    spec, spec_sha256: commitment, status: "COMPLETED",
    submissions: [{ version: 1, artifact_url: base + "pass.txt", artifact_sha256: artifactHash,
      submitted_at: 120, outcome: "ACCEPTED" }] };
  const results = criteria.map(({id}) => ({
    id, status: "SATISFIED", reason_code: "EVIDENCE_SUPPORTS",
    artifact_quote: "Evidence sentence.", reference_quote: "Reference sentence."
  }));
  const receipt = { schema: "proofly.work-order.v1", chain_id: 1337, contract: CONTRACT, order_id: "1",
    version: 1, spec_sha256: commitment, reference_url: spec.reference_url,
    reference_sha256: referenceHash, artifact_url: base + "pass.txt",
    artifact_sha256: artifactHash, submitted_at: 120, results, outcome: "ACCEPTED",
    evaluated_at: 123 };
  return { order, receipt, artifact, reference };
}
test("canonical JSON sorts nested keys and hashes deterministically", async () => {
  assert.equal(canonicalJson({b:2,a:{z:3,y:4}}), '{"a":{"y":4,"z":3},"b":2}');
  assert.equal(await sha256(enc.encode("abc")),
    "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
});
test("unique JSON parser rejects repeated keys even with escapes", () => {
  assert.throws(() => parseUniqueJson('{"status":"good","status":"bad"}'), /Duplicate JSON key/);
  assert.throws(() => parseUniqueJson('{"a":0,"\\u0061":1}'), /Duplicate JSON key/);
  assert.throws(() => parseUniqueJson('{"nested":{"id":1,"id":2}}'), /Duplicate JSON key/);
  assert.throws(() => parseUniqueJson('{"a":[1,2,]}'), /Invalid JSON token/);
  assert.throws(() => parseUniqueJson('{"a":1}{"a":2}'), /trailing/);
});
test("parser does not allow prototype property mutation", () => {
  const data = parseUniqueJson('{"__proto__":{"polluted":true},"ok":[true,false,null,1.5]}');
  assert.equal(data.__proto__.polluted, true);
  assert.equal(({}).polluted, undefined);
  assert.deepEqual(data.ok, [true, false, null, 1.5]);
});
test("consistent source bundle passes offline ONLY", async () => {
  const x = await fixture();
  const result = await verifyReceiptBundle(x.order, x.receipt, x.artifact, x.reference);
  assert.equal(result.status, "STRUCTURALLY_CONSISTENT", JSON.stringify(result));
  assert.equal(result.valid, true);
  assert.equal(result.chain_finality_verified, false);
  assert.equal(result.semantic_correctness_verified, false);
  assert.ok(result.checks.length >= 25);
});
test("tampered artifact and reference bytes cannot pass", async () => {
  const x = await fixture();
  assert.ok((await verifyReceiptBundle(x.order, x.receipt, enc.encode("tampered"), x.reference))
    .errors.includes("ARTIFACT_BYTE_HASH"));
  assert.ok((await verifyReceiptBundle(x.order, x.receipt, x.artifact, enc.encode("tampered")))
    .errors.includes("REFERENCE_BYTE_HASH"));
});
test("cross-order, cross-network and modified spec are rejected", async () => {
  const x = await fixture();
  x.order.id = "2";
  assert.ok((await verifyReceiptBundle(x.order, x.receipt, x.artifact, x.reference))
    .errors.includes("ORDER_BINDING"));
  const y = await fixture();
  y.receipt.chain_id = 1;
  assert.ok((await verifyReceiptBundle(y.order, y.receipt, y.artifact, y.reference))
    .errors.includes("RECEIPT_SPEC_COMMITMENT"));
  const z = await fixture();
  z.order.spec.criteria[0].text = "Changed text";
  assert.ok((await verifyReceiptBundle(z.order, z.receipt, z.artifact, z.reference))
    .errors.includes("ORDER_SPEC_COMMITMENT"));
});
test("fabricated supporting quote and verdict fail", async () => {
  const x = await fixture();
  x.receipt.results[0].artifact_quote = "Not present in evidence";
  assert.ok((await verifyReceiptBundle(x.order, x.receipt, x.artifact, x.reference))
    .errors.includes("ARTIFACT_CITATION_0"));
  const y = await fixture();
  y.receipt.results[0].status = "UNSATISFIED";
  y.receipt.results[0].reason_code = "REQUIREMENT_NOT_MET";
  assert.ok((await verifyReceiptBundle(y.order, y.receipt, y.artifact, y.reference))
    .errors.includes("DETERMINISTIC_OUTCOME"));
});
test("UNVERIFIABLE has its own correctly aggregated result", async () => {
  const x = await fixture();
  x.receipt.results[0].status = "UNVERIFIABLE";
  x.receipt.results[0].reason_code = "INSUFFICIENT_EVIDENCE";
  x.receipt.results[0].artifact_quote = "";
  x.receipt.results[0].reference_quote = "";
  x.receipt.outcome = "EVIDENCE_REQUIRED";
  x.order.submissions[0].outcome = "EVIDENCE_REQUIRED";
  assert.equal((await verifyReceiptBundle(x.order, x.receipt, x.artifact, x.reference)).valid, true);
});
test("malformed data and oversized evidence fail closed without crashing", async () => {
  const x = await fixture();
  for (const data of [
    { ...x.receipt, chain_id: true },
    { ...x.receipt, contract: "0x" + "z".repeat(40) },
    { ...x.receipt, results: [null, null, null] },
    { ...x.receipt, results: [{ status: {} }, {}, {}] },
  ]) assert.equal((await verifyReceiptBundle(x.order, data, x.artifact, x.reference)).valid, false);
  assert.ok((await verifyReceiptBundle(x.order, x.receipt, new Uint8Array(16001), x.reference))
    .errors.includes("ARTIFACT_SIZE_INVALID"));
});
