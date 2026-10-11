# PROOFLY — GenLayer Work Order Integration Runbook

**Status: PRE-DEPLOYMENT INTEGRATION CANDIDATE. No live GenLayer deployment or finality is claimed.**

This guide bridges the current static Spec Builder and the existing
\`contracts/proofly/work_order.py\` candidate. It does **not** authorize
automated wallet signing, deploy a contract or attest to consensus.

## Network / SDK compatibility first

GenLayer has separate network definitions. Stable Studionet (chain ID 61999)
is distinct from Studio development preview (chain ID 61997).
Never reuse a chain preset with a different network. The published
\`genlayer-js\` default npm tag can differ from the v2.0 prerelease used in the
Consensus v0.6 development preview. Choose and PIN an exact compatible SDK
release and chain configuration before executing writes.

Official references:
- https://docs.genlayer.com/developers/decentralized-applications/writing-data
- https://docs.genlayer.com/developers/decentralized-applications/reading-data
- https://docs.genlayer.com/developers/consensus-v06-migration
- https://docs.genlayer.com/developers/intelligent-contracts/tools/genlayer-studio

## Prepare an unsigned Studio create_order call

1. Serve the static app: \`python -m http.server 4173 --directory apps/web\`.
2. Open \`http://localhost:4173\`; fill in a real contributor address, title,
   exactly 3–5 requirements, public immutable reference URL + SHA-256, and
   appropriate submission and revision deadlines.
3. Review the errors and warnings, then select **Export Studio call plan
   (unsigned)**. The JSON contains an ordered \`args\` array and \`named_args\`.
4. Review both the contract candidate source code and the exported parameters
   before deploying or signing anything. The UI does not verify that the
   reference URL serves the supplied digest.
5. Deploy the matching candidate in Studio after runtime review. Record the
   exact network, address and deploy transaction; never invent addresses.
6. In Studio, locate \`create_order\` and enter the seven arguments IN ORDER:
   contributor, title, criteria_json **string**, reference_url,
   reference_sha256, submit_deadline, revision_deadline.
7. Wait for finalized consensus and verify execution success; read
   \`next_order\` and \`get_order\` from finalized state. Record actual order
   ID, owner and stored spec SHA-256.
8. Switch to the contributor account. Read and inspect the stored spec before
   \`accept_order(order_id, spec_sha256)\`. Never accept an unfamiliar hash.
9. Contributor submits \`submit_evidence(order_id, artifact_url, artifact_sha256)\`;
   the URL must refer to a public commit-pinned TXT, and the hash must match.
10. Call \`evaluate_submission(order_id)\` and verify finalized execution.
    Read the corresponding \`get_receipt(order_id, version)\` from finalized
    state. Cover ACCEPTED, CHANGES_REQUIRED and EVIDENCE_REQUIRED separately.
11. Export snapshots and original bytes for
    \`python -m packages.receipt ...\` or the browser Receipt Inspector.
    Both check offline integrity only, not chain origin.
12. Record live errors, fee/latency, validator agreement, failures,
    transaction receipts and appeals/finality, then update reviewer evidence.

## Safe SDK adapter foundation

\`apps/web/sdk-workflow.mjs\` provides a tiny client-injected, separately
testable boundary. It deliberately does not import a specific SDK release,
secret key, RPC, wallet or network preset:

- \`makeRead(name, args)\` and \`makeWrite(name, args)\` validate supported
  method names and known argument counts, preventing arbitrary method calls.
- \`createWorkflowGateway({client, contractAddress, finalVariant, isSuccessful})\`
  demands a validated nonzero contract address, a **preconfigured**
  GenLayerJS client, the SDK's \`TransactionHashVariant.LATEST_FINAL\`
  and \`isSuccessful\` predicate.
- \`readFinal\` explicitly requests \`LATEST_FINAL\` contract state.
- \`submit\` first calls \`estimateTransactionFeesForWrite\`, then makes at most
  **one** \`writeContract\` call and yields \`SUBMITTED_NOT_FINAL\`, with tx ID.
- \`resumeFinalization(txId)\` waits for FINALIZED and separately checks
  \`isSuccessful(transaction)\`. Timeout returns \`TRACKING_UNRESOLVED\`;
  do not resend the same operation without checking its original tx ID.
- A finalized consensus transaction with failed contract execution is
  reported as \`FINALIZED_EXECUTION_FAILED\`, not a business success.

**This adapter is not yet wired to a real wallet**: runtime compatibility,
fee quotes and contract ABI must first be proven by Studio transactions.
Unit tests use an intentionally fake client. Never call mocks live or label
their results network-verified.

## Mandatory release criteria

- [ ] Compile and deploy the Python candidate on chosen Studio network.
- [ ] Verify runtime and GenLayerJS version against that exact network.
- [ ] Measure a representative fee profile; ensure users understand
      network costs and retry implications.
- [ ] Complete two-account create → accept → submit → evaluate → receipt
      with separate FINALIZED transaction and execution-success checks.
- [ ] Confirm all three business outcomes, wrong-hash rejection,
      malformed/untrusted evidence and no double submission.
- [ ] Add read-only contract browser panel with authenticated chain
      identity once the contract address and method ABI are confirmed.
- [ ] Add wallet writes only after measuring costs, handling appeals,
      and implementing persistent tx-ID recovery.
- [ ] Publish genuine finality proof and reviewer evidence before a beta claim.

This software does **not** support escrow, payments or real money.
