# PROOFLY V2 — Video submission checklist and reviewer script

**Candidate build:** `08595a4b35132cadf49f4ac735d99df753cd4bca` (Vercel preview READY, Python + web CI passed as observed October 13, 2026). PR [#16](https://github.com/bearbaba/PROOFLY/pull/16) stays **Draft** until final negative chain verification and preview-signing tests pass.

## Links to show on screen
- Preview: https://proofly-a8zmsu2cu-khaiptk1998-8088s-projects.vercel.app/milestones.html?order=1
- GenLayer contract: https://explorer-studio.genlayer.com/address/0xD67245387dF5448671235CE00c8969664b5aF8bd
- Evidence report: https://github.com/bearbaba/PROOFLY/blob/feat/milestone-acceptance-gate-v2/docs/V2_STUDIONET_EVIDENCE.md
- Actual duplicate-release rollback: https://explorer-studio.genlayer.com/tx/0x0e435e25a54b86048644394051d061f76c710e07dcdef93975409f23edd8a7e3
- Actual unauthorized-Owner rollback: https://explorer-studio.genlayer.com/tx/0x58c988fd241e854f198c78f6cbc5b33b36b475bb8488b045506220dd8aa09619
- Negative-test instructions and pinned artifact: [V2_NEGATIVE_MILESTONE_TEST.md](V2_NEGATIVE_MILESTONE_TEST.md)

## Suggested 3–5 minute recording storyboard

**0:00–0:30 / The concrete problem.** Explain that buyers and contributors agree on a bounded acceptance rubric up front; the decision controls a meaningful on-chain authorization. This is not a generic website classification or a payment app.

**0:30–1:00 / Immutable evidence boundary.** Show that Order #1 binds parties, chain, contract, rubric, pinned reference URL, spec SHA-256 and artifact SHA-256. Explain that GenLayer evaluates *documentation against an agreed standard*, not whether an actual external API is live.

**1:00–2:00 / Successful flow.** Load Order #1 in the V2 preview. Show COMPLETED, Proof Receipt ACCEPTED, 3/3 SATISFIED, exact source-grounded quotes, then Milestone Release AUTHORIZED and matching recipient/digests. Say that these are finalized on-chain state reads, not invented frontend status.

**2:00–2:40 / Adversarial enforcement.** Show Explorer transaction `0x0e435e25...`, highlight FINALIZED / consensus Accepted **but** GenVM ERROR / Rollback / RELEASE_ALREADY_CLAIMED. Show Explorer transaction `0x58c988fd...`, highlight ONLY_CONTRIBUTOR from the Owner address. Explain that finality and execution are different dimensions.

**2:40–3:35 / Negative AI outcome (ONLY after it is actually recorded).** Show new work order, a deliberately incomplete handoff, the real receipt with non-ACCEPTED outcome, and an actual `MILESTONE_NOT_ACCEPTED` rollback from the Contributor if it occurs. If the negative test was not completed, explicitly say it is pending and omit any imagined result.

**3:35–4:10 / Architecture and boundaries.** Show contract repository source plus PR tests/CI. State one authorization per completed milestone, no USDC/GEN payout, no token escrow, no live external API claims. Link deployed contract and exact repo branch.

**4:10–4:30 / Summary.** "PROOFLY V2 turns a GenLayer consensus-backed, quote-grounded documentation acceptance decision into a contributor-bound, one-time milestone release authorization on Studionet."

## Reviewer evidence to preserve
- Browser URL and displayed contract / chain.
- Explorer full tx hashes for every actual new signed action; screenshot *both* consensus and GenVM execution.
- Real receipt JSON with criteria statuses and grounded quotes.
- Real release authorization JSON containing recipient, spec digest, artifact digest, receipt version.
- Positive and negative controls. Do not fake a wallet signature or replay old footage as a new transaction.

## Final gate before recording submission
- [x] Real positive Work Order #1 final reads, 3/3 and release.
- [x] Duplicate claim rolled back, Explorer tx.
- [x] Owner (non-Contributor) claim rolled back, Explorer tx.
- [x] V2 preview reads completed order and receipt/release, user-observed.
- [x] Web and Python CI for candidate commit, Vercel READY.
- [ ] Live non-ACCEPTED work order and denied release.
- [ ] Preview MetaMask write tested on a new order, including confirmation and finality checks.
- [ ] Capture full successful write transaction hashes in Explorer (existing live state readbacks already show outcomes).
- [ ] Complete production release/security review; merge only when checks pass.

## Important filming safety
Show only public testnet wallet addresses. Never reveal secret keys, recovery phrases or wallet passwords. Before every write verify the correct account, Studionet 61999, full contract address, fee, and method. Do not submit the same transaction twice due to a slow UI; follow the existing hash to its GenVM conclusion.

The source policy is deliberately `AGREED_SPEC_ONLY_V1`. The release authorization is an on-chain record and does not itself move funds.
