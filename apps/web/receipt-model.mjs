/** Browser-only offline proof-receipt verifier. NO wallet, RPC, fetch or finality claims. */
export const POLICY = "proofly.work-order.v1";
export const MAX_EVIDENCE = 16000;
export const MAX_METADATA = 64000;
const REASONS = Object.freeze({
  SATISFIED: "EVIDENCE_SUPPORTS",
  UNSATISFIED: "REQUIREMENT_NOT_MET",
  UNVERIFIABLE: "INSUFFICIENT_EVIDENCE"
});
const HEX64 = /^[a-f0-9]{64}$/;
const ADDRESS = /^0x[a-fA-F0-9]{40}$/;
const enc = new TextEncoder();
const dec = new TextDecoder("utf-8", { fatal: true });
const object = v => v !== null && typeof v === "object" && !Array.isArray(v);
const integer = v => Number.isSafeInteger(v) && typeof v === "number";

/**
 * Parse JSON while rejecting duplicate keys at every depth.
 * JSON.parse alone silently accepts duplicates ("outcome" can appear twice).
 * A small, bounded recursive-descent parser prevents ambiguous audit inputs.
 */
export function parseUniqueJson(input) {
  if (typeof input !== "string" || enc.encode(input).byteLength > MAX_METADATA)
    throw new Error("JSON metadata exceeds 64 KB");
  let i = 0;
  const ws = () => { while (/[ \t\r\n]/.test(input[i] || "") && i < input.length) i++; };
  const string = () => {
    if (input[i] !== '"') throw new Error("Expected JSON string");
    const start = i++;
    let escape = false;
    while (i < input.length) {
      const c = input[i++];
      if (escape) { escape = false; continue; }
      if (c === "\\") { escape = true; continue; }
      if (c === '"') return JSON.parse(input.slice(start, i));
    }
    throw new Error("Unterminated JSON string");
  };
  const value = depth => {
    if (depth > 32) throw new Error("JSON nesting depth exceeds limit");
    ws();
    const ch = input[i];
    if (ch === '"') return string();
    if (ch === "{") {
      i++; ws();
      const out = Object.create(null), seen = new Set();
      if (input[i] === "}") { i++; return out; }
      while (true) {
        ws(); const key = string(); ws();
        if (seen.has(key)) throw new Error("Duplicate JSON key: " + key);
        seen.add(key);
        if (input[i++] !== ":") throw new Error("Expected ':' in object");
        out[key] = value(depth + 1); ws();
        if (input[i] === "}") { i++; return out; }
        if (input[i++] !== ",") throw new Error("Expected ',' in object");
      }
    }
    if (ch === "[") {
      i++; ws();
      const out = [];
      if (input[i] === "]") { i++; return out; }
      while (true) {
        out.push(value(depth + 1)); ws();
        if (input[i] === "]") { i++; return out; }
        if (input[i++] !== ",") throw new Error("Expected ',' in array");
      }
    }
    for (const [literal, val] of [["true", true], ["false", false], ["null", null]]) {
      if (input.startsWith(literal, i)) { i += literal.length; return val; }
    }
    const match = /^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/.exec(input.slice(i));
    if (match) { i += match[0].length; return JSON.parse(match[0]); }
    throw new Error("Invalid JSON token");
  };
  const result = value(0); ws();
  if (i !== input.length) throw new Error("Unexpected JSON trailing content");
  return result;
}

/** Same compact key-sorted JSON envelope as work_order.py for defined schema. */
export function canonicalJson(value) {
  if (Array.isArray(value)) return "[" + value.map(canonicalJson).join(",") + "]";
  if (object(value)) return "{" + Object.keys(value).sort().map(
    key => JSON.stringify(key) + ":" + canonicalJson(value[key])
  ).join(",") + "}";
  if (value === null || typeof value === "string" || typeof value === "boolean" ||
      (typeof value === "number" && Number.isFinite(value))) return JSON.stringify(value);
  throw new TypeError("Unsupported canonical JSON type");
}

export async function sha256(bytes) {
  const buf = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, "0")).join("");
}

export async function verifyReceiptBundle(order, receipt, artifact, reference) {
  const errors = [], checks = [];
  const check = (condition, code) => {
    if (!condition) errors.push(code);
    else checks.push(code);
  };
  const finish = () => ({
    valid: errors.length === 0,
    status: errors.length ? "INVALID" : "STRUCTURALLY_CONSISTENT",
    errors, checks,
    chain_finality_verified: false,
    semantic_correctness_verified: false,
    note: "Offline structural integrity only. JSON origins, GenLayer finality, validator consensus and semantic judgments are NOT authenticated."
  });
  try {
    if (!object(order) || !object(receipt)) { errors.push("INVALID_METADATA"); return finish(); }
    if (!(artifact instanceof Uint8Array) || !(reference instanceof Uint8Array)) {
      errors.push("INVALID_EVIDENCE_BYTES"); return finish();
    }
    if (enc.encode(JSON.stringify(order)).length > MAX_METADATA ||
        enc.encode(JSON.stringify(receipt)).length > MAX_METADATA) {
      errors.push("METADATA_TOO_LARGE"); return finish();
    }
    for (const [role, bytes] of [["ARTIFACT", artifact], ["REFERENCE", reference]]) {
      if (!bytes.length || bytes.length > MAX_EVIDENCE) errors.push(role + "_SIZE_INVALID");
    }
    if (errors.length) return finish();
    const text = Object.create(null);
    for (const [role, bytes] of [["artifact", artifact], ["reference", reference]]) {
      try {
        text[role] = dec.decode(bytes);
        if ([...text[role]].length > 10000 || text[role].includes("\0"))
          errors.push(role.toUpperCase() + "_TEXT_INVALID");
      } catch { errors.push(role.toUpperCase() + "_UTF8_INVALID"); }
    }
    if (errors.length) return finish();

    check(receipt.schema === POLICY, "RECEIPT_SCHEMA");
    check(integer(receipt.chain_id) && receipt.chain_id > 0, "CHAIN_ID");
    check(typeof receipt.contract === "string" && ADDRESS.test(receipt.contract), "CONTRACT_ADDRESS");
    check(typeof order.id === "string" && /^\d+$/.test(order.id) &&
          receipt.order_id === order.id, "ORDER_BINDING");
    check(integer(receipt.version) && receipt.version >= 1 && receipt.version <= 2, "VERSION");
    check(typeof order.title === "string" && order.title.length <= 120 && !!order.title.trim(), "TITLE");
    check(ADDRESS.test(String(order.owner || "")) && ADDRESS.test(String(order.contributor || "")) &&
          order.owner !== order.contributor, "PARTIES");
    const spec = order.spec;
    if (!object(spec) || !Array.isArray(spec.criteria) ||
        ![3, 4, 5].includes(spec.criteria.length)) {
      errors.push("INVALID_SPEC"); return finish();
    }
    check(spec.policy === POLICY, "SPEC_POLICY");
    const ids = new Set();
    for (const row of spec.criteria) {
      if (!object(row) || Object.keys(row).sort().join() !== "id,text" ||
          typeof row.id !== "string" || !/^R[1-9][0-9]*$/.test(row.id) ||
          ids.has(row.id) || typeof row.text !== "string" ||
          !row.text.trim() || row.text.length > 500) errors.push("INVALID_CRITERION");
      else ids.add(row.id);
    }
    if (errors.length) return finish();
    check(integer(spec.submit_deadline) && integer(spec.revision_deadline) &&
          spec.submit_deadline < spec.revision_deadline, "DEADLINES");
    for (const key of ["reference_sha256"]) check(
      typeof spec[key] === "string" && HEX64.test(spec[key]), "SPEC_" + key.toUpperCase());
    const envelope = {
      policy: POLICY, chain_id: receipt.chain_id, contract: receipt.contract,
      order_id: order.id, owner: order.owner, contributor: order.contributor,
      title: order.title, spec
    };
    const expectedSpec = await sha256(enc.encode(canonicalJson(envelope)));
    check(order.spec_sha256 === expectedSpec, "ORDER_SPEC_COMMITMENT");
    check(receipt.spec_sha256 === expectedSpec, "RECEIPT_SPEC_COMMITMENT");
    check(receipt.reference_url === spec.reference_url, "REFERENCE_URL_BINDING");
    check(receipt.reference_sha256 === spec.reference_sha256, "REFERENCE_HASH_BINDING");

    if (!Array.isArray(order.submissions) || !integer(receipt.version) ||
        receipt.version < 1 || receipt.version > order.submissions.length) {
      errors.push("MISSING_SUBMISSION"); return finish();
    }
    const submission = order.submissions[receipt.version - 1];
    if (!object(submission)) { errors.push("INVALID_SUBMISSION"); return finish(); }
    check(submission.version === receipt.version, "SUBMISSION_VERSION");
    check(submission.artifact_url === receipt.artifact_url, "ARTIFACT_URL_BINDING");
    check(submission.artifact_sha256 === receipt.artifact_sha256, "ARTIFACT_HASH_BINDING");
    check(submission.submitted_at === receipt.submitted_at, "SUBMITTED_AT_BINDING");
    check(submission.outcome === receipt.outcome, "SUBMISSION_OUTCOME_BINDING");
    for (const role of ["artifact", "reference"]) {
      const hash = await sha256(role === "artifact" ? artifact : reference);
      check(receipt[role + "_sha256"] === hash, role.toUpperCase() + "_BYTE_HASH");
    }

    if (!Array.isArray(receipt.results) || receipt.results.length !== spec.criteria.length) {
      errors.push("INVALID_RESULT_VECTOR"); return finish();
    }
    const statuses = [];
    for (let i = 0; i < receipt.results.length; i++) {
      const row = receipt.results[i];
      if (!object(row) || Object.keys(row).sort().join() !==
          "artifact_quote,id,reason_code,reference_quote,status") {
        errors.push("INVALID_RESULT_SCHEMA_" + i); continue;
      }
      check(row.id === spec.criteria[i].id, "RESULT_ID_" + i);
      if (!Object.hasOwn(REASONS, row.status)) {
        errors.push("INVALID_RESULT_STATUS_" + i); continue;
      }
      statuses.push(row.status);
      check(row.reason_code === REASONS[row.status], "REASON_CODE_" + i);
      for (const role of ["artifact", "reference"]) {
        const quote = row[role + "_quote"];
        const good = typeof quote === "string" && quote.length <= 400 &&
          (!quote || text[role].includes(quote)) &&
          (row.status !== "SATISFIED" || !!quote.trim());
        check(good, role.toUpperCase() + "_CITATION_" + i);
      }
    }
    if (statuses.length === spec.criteria.length) {
      const aggregate = statuses.includes("UNSATISFIED") ? "CHANGES_REQUIRED" :
        statuses.includes("UNVERIFIABLE") ? "EVIDENCE_REQUIRED" : "ACCEPTED";
      check(receipt.outcome === aggregate, "DETERMINISTIC_OUTCOME");
    }
  } catch {
    errors.push("MALFORMED_RECEIPT_INPUT");
  }
  return finish();
}
