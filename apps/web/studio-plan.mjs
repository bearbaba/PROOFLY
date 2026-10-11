/**
 * Deterministic GenLayer Studio call-plan builder.
 * Produces unsigned method arguments; DOES NOT send or simulate transactions.
 */
import { validateDraft, normalizeDraft } from "./model.mjs";

export const PLAN_SCHEMA = "proofly.studio-create-order.v1";

export function createStudioPlan(rawDraft, now = Date.now()) {
  const report = validateDraft(rawDraft, now);
  if (!report.valid) {
    const fields = report.errors.map(x => x.field).join(", ");
    throw new Error("Cannot prepare Studio call; invalid: " + fields);
  }
  const draft = normalizeDraft(rawDraft);
  // The onchain schema accepts a JSON STRING for criteria_json, not a JS array.
  const criteriaJson = JSON.stringify(draft.criteria);
  if (new TextEncoder().encode(criteriaJson).byteLength > 4000) {
    throw new Error("criteria_json exceeds GenLayer contract's 4000-byte limit");
  }
  const args = [
    draft.contributor,
    draft.title,
    criteriaJson,
    draft.reference_url,
    draft.reference_sha256,
    draft.submit_deadline,
    draft.revision_deadline
  ];
  const names = [
    "contributor", "title", "criteria_json", "reference_url",
    "reference_sha256", "submit_deadline", "revision_deadline"
  ];
  return {
    schema: PLAN_SCHEMA,
    stage: "UNSIGNED_CALL_PLAN",
    contract_source: "contracts/proofly/work_order.py",
    contract_class: "ProoflyWorkOrder",
    network: "SELECT_NETWORK_AND_VERIFY_CHAIN_BEFORE_SENDING",
    functionName: "create_order",
    args,
    named_args: Object.fromEntries(names.map((name, i) => [name, args[i]])),
    instructions: [
      "Compile and deploy the candidate contract on the intended GenLayer Studio network.",
      "Review source, deployed contract address, selected network, account and transaction fees.",
      "In the contract's create_order write method, enter the seven arguments in listed order.",
      "Confirm the resulting transaction is finalized AND execution succeeded.",
      "Read next_order and get_order from finalized state; verify owner/contributor/spec commitments.",
      "No transaction was sent by exporting this file."
    ],
    disclaimer: "Unsigned preparation only. No wallet access, deployed contract, consensus, transaction or finality is implied."
  };
}
