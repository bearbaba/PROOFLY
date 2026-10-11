/** Pure, SDK-free boundaries for the public Studionet client. */
import { validateDraft } from "./model.mjs";
import { makeRead, makeWrite } from "./sdk-workflow.mjs";

export const CONTRACT = "0xEbb6E4D791299E79317DE796232029194e0F0aCb";
export const CHAIN_ID = 61999;
export const EXPLORER = "https://explorer-studio.genlayer.com";
const ADDRESS = /^0x[a-fA-F0-9]{40}$/;
const HASH = /^[a-f0-9]{64}$/;
const ID = /^[1-9][0-9]*$/;

export function parseStudioPlan(input, now = Date.now()) {
  const plan = typeof input === "string" ? JSON.parse(input) : input;
  if (!plan || typeof plan !== "object" || Array.isArray(plan) ||
      plan.schema !== "proofly.studio-create-order.v1" ||
      plan.stage !== "UNSIGNED_CALL_PLAN" ||
      plan.functionName !== "create_order" ||
      !Array.isArray(plan.args) || plan.args.length !== 7) {
    throw new Error("Expected an unsigned PROOFLY Studio create_order plan.");
  }
  const args = makeWrite("create_order", plan.args).args;
  let criteria;
  try { criteria = JSON.parse(args[2]); } catch { throw new Error("Invalid criteria JSON string."); }
  const draft = {
    contributor: args[0], title: args[1], criteria,
    reference_url: args[3], reference_sha256: args[4],
    submit_deadline: args[5], revision_deadline: args[6]
  };
  const report = validateDraft(draft, now);
  if (!report.valid) throw new Error(report.errors.map(x => x.field + ": " + x.message).join("; "));
  if (plan.named_args) {
    const names = ["contributor","title","criteria_json","reference_url","reference_sha256","submit_deadline","revision_deadline"];
    if (names.some((key, i) => JSON.stringify(plan.named_args[key]) !== JSON.stringify(args[i])))
      throw new Error("Named and ordered plan arguments disagree.");
  }
  return { args, title: args[1], contributor: args[0] };
}

export function decodeRead(name, raw) {
  makeRead(name, name === "next_order" ? [] : name === "get_order" ? ["1"] : ["1", 1]);
  if (raw === "" || raw === null || raw === undefined) return null;
  if (name === "next_order") return String(raw);
  const value = typeof raw === "string" ? JSON.parse(raw) : raw;
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid JSON contract response.");
  return value;
}

export function roleFor(order, account) {
  if (!order || !ADDRESS.test(String(account || ""))) return "viewer";
  if (String(order.owner || "").toLowerCase() === account.toLowerCase()) return "owner";
  if (String(order.contributor || "").toLowerCase() === account.toLowerCase()) return "contributor";
  return "viewer";
}

export function preparedAction(name, orderId, order, fields = {}) {
  if (!ID.test(orderId)) throw new Error("Enter a positive order ID.");
  const args = {
    accept_order: [orderId, order?.spec_sha256],
    submit_evidence: [orderId, String(fields.artifact_url || "").trim(), String(fields.artifact_sha256 || "").trim()],
    evaluate_submission: [orderId],
    cancel_order: [orderId],
    close_expired: [orderId]
  }[name];
  if (!args) throw new Error("Unsupported operation.");
  if (name === "accept_order" && (!order || !HASH.test(String(order.spec_sha256 || ""))))
    throw new Error("Load the finalized order and its spec hash before accepting.");
  return makeWrite(name, args).args;
}

export function describeReceipt(receipt) {
  if (!receipt) return { status: "NO_RECEIPT", satisfied: 0, total: 0, consistent: false };
  const rows = receipt.results;
  if (!Array.isArray(rows) || rows.length < 1 || rows.length > 5) throw new Error("Invalid receipt results.");
  if (!rows.every(r => r && ["SATISFIED","UNSATISFIED","UNVERIFIABLE"].includes(r.status)))
    throw new Error("Unknown receipt verdict.");
  const outcome = rows.some(r => r.status === "UNSATISFIED") ? "CHANGES_REQUIRED" :
    rows.some(r => r.status === "UNVERIFIABLE") ? "EVIDENCE_REQUIRED" : "ACCEPTED";
  return { status: String(receipt.outcome || ""), satisfied: rows.filter(r => r.status === "SATISFIED").length,
    total: rows.length, consistent: outcome === receipt.outcome };
}
