/** Pure, dependency-free browser/Node spec preflight. No RPC or verdicts. */
export const POLICY = "proofly.work-order.v1";
const VAGUE = /\b(high[- ]quality|good|nice|professional|beautiful|intuitive|excellent|user[- ]friendly|best[- ]in[- ]class)\b/i;
const URL_RE = /^https:\/\/raw\.githubusercontent\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\/[a-f0-9]{40}\/[A-Za-z0-9_./-]+\.txt$/;
const ID_RE = /^R[1-9][0-9]*$/;
const HASH_RE = /^[a-f0-9]{64}$/;
const WALLET_RE = /^0x[a-fA-F0-9]{40}$/;

export function isPinnedUrl(url) {
  if (typeof url !== "string" || url.length > 500 || !URL_RE.test(url)) return false;
  return !url.split("/").slice(6).some(s => !s || s === "." || s === "..");
}

export function validateDraft(draft, now = Date.now()) {
  const errors = [], warnings = [];
  const error = (field, message) => errors.push({ field, message });
  const warn = (field, message) => warnings.push({ field, message });
  if (!draft || typeof draft !== "object" || Array.isArray(draft)) {
    return { valid: false, errors: [{ field: "draft", message: "Invalid draft." }], warnings };
  }
  if (typeof draft.title !== "string" || draft.title.trim().length < 1 ||
      draft.title.trim().length > 120) error("title", "Use a title from 1 to 120 characters.");
  if (!WALLET_RE.test(String(draft.contributor ?? "")) ||
      /^0x0{40}$/i.test(String(draft.contributor ?? "")))
    error("contributor", "Enter a nonzero 0x-prefixed contributor address.");
  if (!isPinnedUrl(draft.reference_url))
    error("reference_url", "Use a public GitHub raw .txt URL pinned to a 40-character commit.");
  if (!HASH_RE.test(String(draft.reference_sha256 ?? "")))
    error("reference_sha256", "Enter the 64-character lowercase SHA-256 of the reference bytes.");
  const criteria = draft.criteria;
  if (!Array.isArray(criteria) || criteria.length < 3 || criteria.length > 5) {
    error("criteria", "Add between 3 and 5 requirements.");
  } else {
    const seen = new Set();
    criteria.forEach((item, i) => {
      const path = "criteria[" + i + "]";
      if (!item || typeof item !== "object" || Array.isArray(item) ||
          !ID_RE.test(String(item.id ?? "")) || seen.has(item.id)) {
        error(path, "Each requirement needs a unique R1-style ID.");
      } else seen.add(item.id);
      if (typeof item?.text !== "string" || item.text.trim().length < 1 ||
          item.text.length > 500) {
        error(path, "Each requirement must contain 1–500 characters.");
      } else if (VAGUE.test(item.text)) {
        warn(path, "Subjective language: replace adjectives with observable acceptance conditions.");
      }
    });
  }
  const submit = draft.submit_deadline;
  const revise = draft.revision_deadline;
  const seconds = Math.floor(now / 1000);
  if (!Number.isSafeInteger(submit) || !Number.isSafeInteger(revise) ||
      submit <= seconds || revise <= submit || revise > seconds + 60 * 86400)
    error("deadlines", "Set future submission and revision deadlines, in order, within 60 days.");
  if (errors.length === 0)
    warn("network", "Offline checks only. No remote hashes, wallet identity or GenLayer consensus were verified.");
  return { valid: errors.length === 0, errors, warnings };
}

export function normalizeDraft(input) {
  return {
    schema: "proofly.offline-draft.v1",
    contract_policy: POLICY,
    title: String(input.title || "").trim(),
    contributor: String(input.contributor || "").trim().toLowerCase(),
    criteria: input.criteria.map(x => ({ id: x.id, text: x.text.trim() })),
    reference_url: input.reference_url.trim(),
    reference_sha256: input.reference_sha256.trim(),
    submit_deadline: input.submit_deadline,
    revision_deadline: input.revision_deadline,
    exported_at: new Date().toISOString(),
    disclaimer: "Unsigned draft. No onchain work order or verification result exists."
  };
}
