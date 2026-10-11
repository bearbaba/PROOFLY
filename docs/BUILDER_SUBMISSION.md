# PROOFLY — GenLayer Builder contribution submission

**Submission status: HOLD — web wallet connection fix has passed CI on main,
but the Vercel production domain is still serving an older commit because
the deployment API reached the account's daily 100-deployment limit (402).
Portal submission NOT YET CONFIRMED.**

This is an honest, reviewer-ready description of the **manual Studionet
demo** and the reproducible public source. The submitter must select a
currently available Builder contribution category and sign in to
https://portal.genlayer.foundation/ with their own wallet/GitHub account.
Do not claim a submitted/reviewed/accepted portal contribution until the
portal provides a confirmation.

## Project title

PROOFLY — Evidence-Based Work Verification Through GenLayer AI Consensus

## Short description

PROOFLY is a GenLayer Intelligent Contract that turns agreed work
requirements and publicly pinned evidence into criterion-level AI-verified
outcomes and a reusable on-chain Proof Receipt.

## Full submission (English — copy into the contribution form)

PROOFLY is an evidence-based work verification prototype built on
GenLayer. It addresses a practical problem in freelance work,
documentation deliveries and agent-to-agent collaboration: how can two
parties agree on objective requirements, submit independently inspectable
proof, and receive a transparent outcome without trusting a single
off-chain reviewer?

The owner creates a work order with 3–5 explicit requirements, a
commit-pinned public reference document and SHA-256 digest, deadlines
and a designated contributor. The contributor accepts the exact
chain/contract/order-bound specification hash and later submits a
public, immutable evidence URL and content hash. GenLayer AI validation
compares evidence against the agreed criteria; validators independently
fetch the reference and artifact, check both SHA-256 digests,
reclassify criterion outcomes, and check grounded citations.
The contract deterministically aggregates each criterion as
SATISFIED, UNSATISFIED or UNVERIFIABLE into ACCEPTED,
CHANGES_REQUIRED or EVIDENCE_REQUIRED, storing a versioned,
publicly readable Proof Receipt.

The critical distinction is that missing or unverifiable evidence is
not automatically a negative verdict. A revision path supports one
corrected submission. The current application deliberately contains
no escrow, payments, token logic or financial custody.

A manual end-to-end GenLayer Studio demonstration was completed on
Studionet (chain ID 61999) using separate owner and contributor
accounts. Its first work order moved through PROPOSED → ACTIVE →
SUBMITTED → COMPLETED. The reported get_receipt(1,1) returned the
business outcome ACCEPTED with all three criteria SATISFIED and
literal supporting citations. A subsequent get_order(1) Accepted-state
readback reported COMPLETED, with submission outcome ACCEPTED.
The public repository includes both JSON readbacks, original
commit-pinned documents, an offline integrity checker and
automated regression tests. CI passes on the main branch.

This is a demonstrated **Studio prototype**, not a fully shipped,
wallet-connected consumer dApp. Full transaction hashes,
independent Explorer/GenVM execution attestation, further
negative/unverifiable live cases and production security auditing
remain outstanding. The deployed website now offers a GenLayerJS-based Studionet console
alongside a standalone offline Spec Builder and Proof Receipt Inspector.
Web/Node browser checks have passed, and the Vercel production deployment
reports READY, but its **browser-injected wallet write flow is not yet
verified end-to-end** and should not be described as a proven signed
dApp transaction.

What makes GenLayer essential here is *AI-validator adjudication of
real evidence*, including domain-specific equivalence checking —
not a hard-coded outcome, mock oracle, or client-provided verdict.

## Source and evidence links

- Live production website: https://proofly-lovat.vercel.app/
- Offline specification builder: https://proofly-lovat.vercel.app/builder.html
- Offline receipt inspector: https://proofly-lovat.vercel.app/receipt.html
- GitHub (main): https://github.com/bearbaba/PROOFLY
- Intelligent Contract: https://github.com/bearbaba/PROOFLY/blob/main/contracts/proofly/work_order.py
- Import deployed Studio instance: https://studio.genlayer.com/?import-contract=0xEbb6E4D791299E79317DE796232029194e0F0aCb
- Studio instance address: `0xEbb6E4D791299E79317DE796232029194e0F0aCb`
- Chain ID: `61999` (Studionet; NOT Bradbury/mainnet)
- Detailed real Studio walkthrough: https://github.com/bearbaba/PROOFLY/blob/main/docs/LIVE_STUDIO_DEMO.md
- Final completed order JSON: https://github.com/bearbaba/PROOFLY/blob/main/docs/evidence/studionet-order-1-completed.json
- Proof Receipt JSON: https://github.com/bearbaba/PROOFLY/blob/main/docs/evidence/studionet-order-1-receipt.json
- Integrity checker: https://github.com/bearbaba/PROOFLY/blob/main/packages/receipt.py
- Security and release evidence limitations: https://github.com/bearbaba/PROOFLY/blob/main/docs/DEPLOYMENT_EVIDENCE.md

## Minimal reviewer reproduction

1. Open the Studio import link and locate `Read Methods`.
2. Set `State = Accepted` and call `get_order` with
   `order_id = "1"`. The expected existing stored result is
   `status = "COMPLETED"`, with
   `submissions[0].outcome = "ACCEPTED"`.
3. Call `get_receipt` with `order_id = "1"` and
   `version = 1`. The expected result has three
   `SATISFIED` statuses and `outcome = "ACCEPTED"`.
4. Inspect the original reference and evidence URLs from the
   receipt and compare their literal quotes and SHA-256 hashes.
5. Independently rerun the archived consistency checks locally:

```bash
python -m unittest discover -s tests -p "test_studio_evidence.py" -v
python -m packages.receipt \
  --order docs/evidence/studionet-order-1-completed.json \
  --receipt docs/evidence/studionet-order-1-receipt.json \
  --artifact fixtures/evidence/pass.txt \
  --reference fixtures/evidence/reference.txt
```

The offline verifier must never be represented as chain finality
or independent blockchain provenance verification.

## Current production deployment caveat (2026-10-11)

A browser wallet-connect attempt at https://proofly-lovat.vercel.app/
reported `A compatible initialized GenLayer SDK client is required`.
The root cause was the website requiring newer SDK methods that do not
exist in pinned `genlayer-js@1.1.8`. The fix was merged on main
(`2e804b02`) and passed Python + Node/browser GitHub Actions.

**The Vercel domain still serves commit `f3f7329`**, without the fix.
A deploy attempt returned HTTP 402, resource
`api-deployments-free-per-day`, retry-after 86400 seconds. Do not
claim that signed browser writes work on the hosted site until Vercel
deploys `2e804b02` (or later) and an actual browser-wallet smoke test
succeeds. No payment token, private key or wallet seed should be
provided for this fix.

## Reviewer evidence still to collect

- [ ] Full deployment transaction hash and Explorer URL.
- [ ] Full `create_order`, `accept_order`, `submit_evidence`
      and `evaluate_submission` tx hashes, each with FINALIZED
      and GenVM SUCCESS checks.
- [ ] Independent Explorer confirmation that the deployed bytecode
      matches reviewed source.
- [ ] Live `CHANGES_REQUIRED`, `EVIDENCE_REQUIRED` and
      prompt-injection defense cases.
- [ ] Optional screen recording of two-wallet flow and stored
      Proof Receipt, linked here after recording.
- [ ] Verify public deployed homepage and finalized RPC read in a real browser.
- [ ] Verify an actual EIP-1193 injected-wallet signature, fee confirmation and tx receipt.
- [ ] Actual portal submission confirmation/link.

## Suggested category / status

Builder contribution — Intelligent Contract / experimental dApp or
appropriate currently available mission. Do not submit to a closed
hackathon or claim that this is deployed on Bradbury.

## Demo script (60–90 seconds)

1. Introduce PROOFLY as work verification using GenLayer.
2. Open the production website's Studionet console, then show the two
   accounts and the deployed Studio contract. Note clearly that the
   successful two-wallet demo was conducted in Studio.
3. Show `get_order("1")`: owner, contributor, spec hash and
   `COMPLETED`.
4. Show `get_receipt("1", 1)`: three real SATISFIED decisions,
   grounded artifact/reference quotes and ACCEPTED outcome.
5. Show the raw commit-pinned documents and receipt archive in
   GitHub; explain independent validation and no-money scope.
6. Close with current limits and next step (a wallet-connected UI).
