/**
 * Minimal GenLayer SDK adapter for PROOFLY's work-order candidate.
 *
 * SDK client is supplied by the host. Legacy 1.1.8 compatibility is
 * explicit: no invented fee quote, user reviews wallet fee before signing.
 * Confirm actual deployed ABI/network/fee policy before enabling any write UI.
 * Never auto-resend after writeContract returns a transaction hash.
 */
const ADDR = /^0x[a-fA-F0-9]{40}$/;
const SHA = /^0x[a-fA-F0-9]{64}$/;
const HASH = /^[a-f0-9]{64}$/;
const ID = /^[1-9][0-9]*$/;
const WRITE_ARITY = Object.freeze({
  create_order: 7,
  accept_order: 2,
  cancel_order: 1,
  submit_evidence: 3,
  evaluate_submission: 1,
  close_expired: 1
});
const READ_ARITY = Object.freeze({ get_order: 1, get_receipt: 2, next_order: 0 });

export class IntegrationError extends Error {
  constructor(message, code) { super(message); this.name = "IntegrationError"; this.code = code; }
}
function requireCondition(ok, message, code) {
  if (!ok) throw new IntegrationError(message, code);
}
function validContract(address) {
  requireCondition(typeof address === "string" && ADDR.test(address) &&
    !/^0x0{40}$/i.test(address), "A verified nonzero contract address is required", "INVALID_CONTRACT");
  return address;
}
function validId(orderId) {
  requireCondition(typeof orderId === "string" && ID.test(orderId), "Order ID must be a decimal string", "INVALID_ID");
  return orderId;
}
function validVersion(version) {
  requireCondition(Number.isSafeInteger(version) && version >= 1 && version <= 2,
    "Submission version must be 1 or 2", "INVALID_VERSION");
  return version;
}
export function makeRead(name, args = []) {
  requireCondition(Object.hasOwn(READ_ARITY, name), "Unknown read method", "UNSAFE_METHOD");
  requireCondition(Array.isArray(args) && args.length === READ_ARITY[name], "Invalid read arguments", "BAD_ARGUMENTS");
  if (name === "get_order") validId(args[0]);
  if (name === "get_receipt") { validId(args[0]); validVersion(args[1]); }
  return { functionName: name, args: [...args] };
}
export function makeWrite(name, args = []) {
  requireCondition(Object.hasOwn(WRITE_ARITY, name), "Unknown write method", "UNSAFE_METHOD");
  requireCondition(Array.isArray(args) && args.length === WRITE_ARITY[name], "Invalid write arguments", "BAD_ARGUMENTS");
  if (name !== "create_order") validId(args[0]);
  if (name === "create_order") {
    requireCondition(typeof args[0] === "string" && ADDR.test(args[0]) &&
      typeof args[1] === "string" && typeof args[2] === "string" &&
      typeof args[3] === "string" && typeof args[4] === "string" &&
      HASH.test(args[4]) && Number.isSafeInteger(args[5]) &&
      Number.isSafeInteger(args[6]) && args[5] < args[6],
      "Malformed create_order arguments", "BAD_ARGUMENTS");
  }
  if (name === "accept_order")
    requireCondition(typeof args[1] === "string" && HASH.test(args[1]), "Invalid spec digest", "BAD_ARGUMENTS");
  if (name === "submit_evidence")
    requireCondition(typeof args[1] === "string" && typeof args[2] === "string" &&
      HASH.test(args[2]), "Invalid evidence submission", "BAD_ARGUMENTS");
  return { functionName: name, args: [...args] };
}

export function createWorkflowGateway({ client, contractAddress, finalVariant, isSuccessful }) {
  const address = validContract(contractAddress);
  // genlayer-js@1.1.8 supports waitForTransactionReceipt but does NOT ship
  // estimateTransactionFeesForWrite or waitForFinalization. Never gate its
  // legitimate signed client on newer SDK APIs.
  requireCondition(client && typeof client.readContract === "function" &&
    typeof client.writeContract === "function" &&
    (typeof client.waitForTransactionReceipt === "function" ||
     typeof client.waitForFinalization === "function"),
    "The installed GenLayer SDK client does not support contract reads, writes and transaction receipts", "SDK_NOT_READY");
  requireCondition(finalVariant !== undefined && finalVariant !== null,
    "Set TransactionHashVariant.LATEST_FINAL from the installed SDK", "MISSING_FINAL_VARIANT");
  requireCondition(typeof isSuccessful === "function",
    "Provide the SDK's isSuccessful(transaction) predicate", "MISSING_SUCCESS_CHECK");

  return Object.freeze({
    async readFinal(name, args = []) {
      const read = makeRead(name, args);
      const value = await client.readContract({
        address, ...read, transactionHashVariant: finalVariant
      });
      // Candidate contract returns JSON encoded as a string; a missing record is "".
      if (value === "") return { found: false, value: null, finalSnapshotRequested: true };
      if (name === "next_order")
        return { found: true, value: String(value), finalSnapshotRequested: true };
      requireCondition(typeof value === "string", "Unexpected contract return type", "DECODE_FAILED");
      let parsed;
      try { parsed = JSON.parse(value); } catch {
        throw new IntegrationError("Invalid JSON from GenLayer view", "DECODE_FAILED");
      }
      requireCondition(parsed && typeof parsed === "object" && !Array.isArray(parsed),
        "Invalid GenLayer record payload", "DECODE_FAILED");
      return { found: true, value: parsed, finalSnapshotRequested: true };
    },

    async submit(name, args, onSubmitted, approveFees) {
      const call = { address, ...makeWrite(name, args) };
      // Estimation can fail or cost too much: do not submit unless the caller
      // explicitly invoked this method and fee policy was returned.
      const modernFees = typeof client.estimateTransactionFeesForWrite === "function";
      let estimate = null;
      if (modernFees) {
        estimate = await client.estimateTransactionFeesForWrite(call);
        requireCondition(estimate && estimate.distribution != null && estimate.feeValue != null,
          "SDK did not return a usable fee estimate", "FEE_ESTIMATE_MISSING");
      } else {
        // Legacy 1.1.8 cannot quote consensus fees here. Never fake a fee
        // estimate; require an explicit acknowledgment of this limitation,
        // followed by the MetaMask cost/signature confirmation.
        requireCondition(typeof approveFees === "function",
          "Explicit wallet cost review is required for this SDK version", "FEE_REVIEW_REQUIRED");
      }
      if (typeof approveFees === "function") {
        const approved = await approveFees(estimate);
        requireCondition(approved === true, "Wallet submission cancelled before signing", "USER_CANCELLED");
      }
      const txId = await client.writeContract({
        ...call,
        value: 0n, // PROOFLY never transfers funds to a work order.
        ...(modernFees ? {fees: {
          distribution: estimate.distribution, feeValue: estimate.feeValue
        }} : {})
      });
      requireCondition(typeof txId === "string" && SHA.test(txId),
        "SDK returned an unexpected transaction identifier; inspect wallet activity before retrying",
        "TX_ID_UNEXPECTED");
      // Failure to save the ID does not imply the submitted transaction failed.
      let trackingNote = null;
      if (typeof onSubmitted === "function") {
        try { await onSubmitted(txId); }
        catch { trackingNote = "Transaction may be submitted; store its hash and resume tracking, do not re-send."; }
      }
      return { txId, status: "SUBMITTED_NOT_FINAL", final: false, trackingNote };
    },

    async resumeFinalization(txId) {
      requireCondition(typeof txId === "string" && SHA.test(txId),
        "A valid saved transaction hash is required", "INVALID_TX_ID");
      let tx;
      try {
        tx = typeof client.waitForFinalization === "function" ?
          await client.waitForFinalization({hash: txId}) :
          await client.waitForTransactionReceipt({
            hash: txId, status: "FINALIZED", fullTransaction: false
          });
      } catch (error) {
        return { txId, status: "TRACKING_UNRESOLVED", final: false,
          note: "Network wait failed or timed out. Resume this transaction ID, never blindly resend.",
          error: String(error?.message || error) };
      }
      // Even finalized consensus can contain a contract execution failure.
      const success = isSuccessful(tx);
      return {
        txId,
        status: success ? "FINALIZED_SUCCESS" : "FINALIZED_EXECUTION_FAILED",
        final: true,
        executionSuccessful: Boolean(success),
        statusName: typeof tx?.statusName === "string" ? tx.statusName : null,
        executionResultName: typeof tx?.txExecutionResultName === "string" ?
          tx.txExecutionResultName : null
      };
    }
  });
}
