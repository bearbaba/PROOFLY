# PROOFLY — browser-only Spec Builder preview

The Spec Builder at `/builder.html` is a **local, offline specification drafting prototype**. The site homepage `/` is now a separate, wallet-capable Studionet console.
It does not connect a wallet, deploy contracts, upload files, call LLMs,
read public URLs or produce a finalized proof receipt.

## Run locally

From the repository root:

    python -m http.server 4173 --directory apps/web

Visit http://localhost:4173/builder.html for the offline Spec Builder, or `/` for the live console (after `npm run bundle`). This must be served over HTTP, not by
double-clicking index.html, because the browser loads JavaScript modules.

No install required for the preview itself. For JS unit tests (Node 22+):

    cd apps/web
    npm test
    npm run build

The build command checks JavaScript syntax; this is a static HTML app.

## Preflight

The criteria and hash/URL checks are syntactic, not semantic. A green
draft does NOT mean a fetched document has the claimed SHA-256 or that
GenLayer has accepted a work order. The exported JSON is an **unsigned
offline draft** intended for review.

The example loads a fictional documentation fixture using a public,
commit-pinned URL from this repository. It is not a real customer order.
No private or sensitive evidence should be pasted into a public website
or uploaded to GenLayer validators.

## Deployment

The repository's vercel.json points at the apps/web static files.
Vercel deployment remains separate from contract verification; publishing
this UI does not mean wallet integration or consensus is operational.

Future integration requires actual contract ABI confirmation, wallet
transaction status/finality handling, evidence hosting, trusted source
hash checks, and browser-level security regression tests.


## Browser regression checks

Browser E2E runs using Playwright/Chromium. It covers the loaded preview,
draft validity, add/remove controls, exported JSON, HTML-like input safety,
bad URL/hash and mobile overflow. It stubs only Google Fonts for stability.

    cd apps/web
    npm install
    npx playwright install chromium
    npm run test:browser

The GitHub Actions workflow runs these cases on changes to apps/web.
The tests do not simulate wallet, contract, chain finality or true evidence
consensus; those belong to a separate live integration milestone.


## Offline Proof Receipt Inspector

Visit `http://localhost:4173/receipt.html` (or use **Receipt Inspector**
in the main navigation). Upload four files: JSON from `get_order`, JSON
from `get_receipt`, the original artifact TXT, and the original reference
TXT. The browser rejects duplicate JSON keys and malformed files, recomputes
the version/contract/chain-bound spec commitment, hashes both documents,
checks literal citations and verifies deterministic outcome aggregation.

The inspector never sends uploaded bytes anywhere, makes no RPC requests and
does **not** authenticate JSON provenance, GenLayer consensus or transaction
finality. An attacker can fabricate four internally consistent files. Always
compare exported records with finalized trusted network state separately.

Both Node tests and Playwright browser tests cover tampering, malformed JSON,
HTML injection, mobile display and the explicit offline boundary.


## Studio call-plan export (unsigned)

When the Spec Builder draft passes offline checks, select **Export Studio
call plan (unsigned)**. The downloaded JSON maps directly to the seven
arguments of `ProoflyWorkOrder.create_order` in the order expected by the
candidate GenLayer contract. The criteria argument is a JSON **string**.
The export contains no contract address, wallet signature, tx ID or verdict.
It does not verify public evidence URLs or send a transaction.

`studio-plan.mjs` and `sdk-workflow.mjs` have isolated Node tests.
The SDK gateway is intentionally **not wired into the preview UI** until
live Studio proof has established runtime/chain/ABI compatibility.
See [Studio integration runbook](../../docs/SDK_WORKFLOW.md).


## Live Studionet console (wallet-backed, experimental)

After \`npm install && npm run bundle\` in \`apps/web\`, open
\`/live.html\` alongside the existing offline Spec Builder.

- Read \`get_order\` and \`get_receipt\` from \`LATEST_FINAL\` using
  \`genlayer-js@1.1.8\`, pointing at the **actual** contract deployed to
  Studionet chain ID 61999.
- Use an injected EIP-1193 wallet (e.g., MetaMask) to opt into the
  chain and authenticate writes. The site never generates or holds
  wallet secrets. Studio's built-in **local development accounts are not
  automatically available as injected browser wallets**.
- Owner \`create_order\` imports a validated, unsigned call-plan JSON
  from the offline Spec Builder; accepted spec digest is loaded from chain.
- Contributor \`accept_order\` and \`submit_evidence\` are permission-gated
  in UI and rechecked inside the contract. \`evaluate_submission\`
  is permissionless; \`cancel_order\` is owner-only.
- Fee estimation and explicit confirmation occur **before** signing.
  Submitted tx hashes are retained for manual finality tracking.
  The UI does not automatically resend on a timeout.
- FINALIZED and GenVM SUCCESS must be confirmed separately before
  showing final execution success; readback is refreshed afterward.
- Unknown RPC/CORS/fee/provider errors are shown, not hidden by
  fallbacks, mocked balances or offline receipts.

The compiled \`live.bundle.js\` is a build artifact, not checked into Git.
Production/preview builds bundle pinned SDK dependencies in Vercel.
The UI has not yet undergone a signed browser-wallet end-to-end test;
**do not report production readiness until a real injected-wallet
transaction and finalized read have been verified on the deployment**.

\`npm run bundle\` requires network access to install npm dependencies.


### Live MetaMask SDK compatibility fix (2026-10-11)

This site pins `genlayer-js@1.1.8`. That release supports
`waitForTransactionReceipt({hash,status:"FINALIZED"})`, **not** the
future `waitForFinalization` helper, and does **not** export
`estimateTransactionFeesForWrite` or `isSuccessful`. The adapter
accepts legacy clients, requires explicit user consent before attempting
any write, and then lets MetaMask review the actual wallet fee. It
**never invents a numeric protocol fee estimate**. Writes carry
`value:0n`; PROOFLY does not transfer escrow funds. Once a transaction
hash exists, the app waits for a FINALIZED receipt and checks the
`txExecutionResultName` independently.

Wallet smoke tests still require a human signature; CI now verifies the
adapter against a **real** pinned SDK client, not only mocked clients.

## User-facing creation workflow (no JSON required)

The latest source homepage includes **Create a work order** directly (the production deployment must be checked separately; at the last verified check it was on an older commit).
A customer enters a job title, contributor wallet, three objective
requirements, and a public commit-pinned reference text URL. The browser
automatically downloads that reference and calculates/verifies its
SHA-256 digest before signing. Deadlines are chosen as a number of
days, so users never calculate Unix timestamps or prepare ABI arrays.
**Fill example requirements** makes the successful public trial-guide
fixture usable for a first walkthrough; it does not fabricate blockchain
outcomes. The reference digest is rechecked before signing.

The signer sees the wallet cost warning and must approve in MetaMask.
A returned transaction hash is **not** treated as finality; the
user tracks it to finalized execution and the app verifies any inferred
order ID against the actual owner/contributor/title on the chain.
Duplicate submissions are blocked while an unresolved transaction
hash is saved locally.

**Remaining MVP limitation:** arbitrary reference/evidence files still
must be publicly published as immutable GitHub commit-pinned .txt files.
There is no built-in permanent document upload/storage backend yet.
The application does not claim a file upload that does not exist.


### No manual Work Order number after creating

A real signed `create_order` now automatically triggers read-only
finality tracking. The app verifies the actual order ID by checking
every newly allocated order against **all seven creation arguments** and
the Owner/Contributor addresses. It does not guess an ID from the
pre-sign next-order counter.

When uniquely verified, the work order is opened on the page and a
shareable `?order=<id>` URL appears for the Contributor. Opening a
shared link automatically reads that order from finalized state
without requesting a wallet signature.

The submitted hash and expected work-order identity are stored locally
for read-only recovery on refresh. Unknown execution outcomes,
unavailable RPC, or multiple matching orders do not trigger a
new write or fake success. A user can manually re-track the saved hash.
