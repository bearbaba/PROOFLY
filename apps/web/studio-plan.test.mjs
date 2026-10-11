import test from "node:test";
import assert from "node:assert/strict";
import { createStudioPlan, PLAN_SCHEMA } from "./studio-plan.mjs";

const SHA = "a".repeat(64), COMMIT = "b".repeat(40);
function fixture() {
  return {
    title: "Developer documentation",
    contributor: "0x" + "1".repeat(40),
    reference_url: "https://raw.githubusercontent.com/bearbaba/PROOFLY/" + COMMIT + "/fixtures/evidence/reference.txt",
    reference_sha256: SHA,
    criteria: [
      { id: "R1", text: "Document trial network" },
      { id: "R2", text: "Show onboarding steps" },
      { id: "R3", text: "Describe supported recovery instructions" }
    ],
    submit_deadline: 1000,
    revision_deadline: 2000
  };
}
test("creates a seven-argument unsigned plan matching contract create_order", () => {
  const plan = createStudioPlan(fixture(), 0);
  assert.equal(plan.schema, PLAN_SCHEMA);
  assert.equal(plan.stage, "UNSIGNED_CALL_PLAN");
  assert.equal(plan.functionName, "create_order");
  assert.equal(plan.args.length, 7);
  assert.equal(plan.args[0], fixture().contributor);
  assert.equal(plan.args[1], "Developer documentation");
  assert.deepEqual(JSON.parse(plan.args[2]), fixture().criteria);
  assert.equal(plan.args[3], fixture().reference_url);
  assert.equal(plan.args[4], SHA);
  assert.deepEqual(plan.args.slice(5), [1000, 2000]);
  assert.equal(plan.named_args.criteria_json, plan.args[2]);
  assert.equal(plan.contract_class, "ProoflyWorkOrder");
  assert.match(plan.disclaimer, /No wallet access/);
  assert.ok(!("txId" in plan) && !("contract_address" in plan));
});
test("invalid drafts never yield a Studio write plan", () => {
  for (const broken of [
    { ...fixture(), contributor: "not-an-address" },
    { ...fixture(), reference_sha256: "not-a-hash" },
    { ...fixture(), criteria: [{ id: "R1", text: "Too short" }] },
    { ...fixture(), revision_deadline: 1000 },
  ]) assert.throws(() => createStudioPlan(broken, 0), /Cannot prepare/);
});
test("non-ascii criterion bytes are checked against contract limit", () => {
  const draft = fixture();
  draft.criteria = [1,2,3,4,5].map(id => ({id: "R"+id, text: "界".repeat(500)}));
  assert.throws(() => createStudioPlan(draft, 0), /4000-byte limit/);
});
