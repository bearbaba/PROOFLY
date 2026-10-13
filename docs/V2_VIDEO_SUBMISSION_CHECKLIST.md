# PROOFLY V2 — Video submission checklist and reviewer script

**Evidence refresh:** October 13, 2026. The complete Order #2 negative workflow is now observed. PR #16 remains Draft until fresh real-browser recovery testing and security review.

## Links to show on screen
- Preview: https://proofly-atboqi1pu-khaiptk1998-8088s-projects.vercel.app/milestones.html?order=1
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

**2:40–3:35 / Verified negative AI outcome.** Show new work order, a deliberately incomplete handoff, the real receipt with non-ACCEPTED outcome, and an actual `MILESTONE_NOT_ACCEPTED` rollback from the Contributor if it occurs. Show the actual MILESTONE_NOT_ACCEPTED rollback.

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
- [x] Live non-ACCEPTED Work Order #2 and denied release.
- [x] Preview MetaMask create, accept and submit transactions, verified through Explorer and finalized state; new recovery UI awaits fresh browser smoke test.
- [x] Full transaction hashes captured for the five live Order #2 steps.
- [ ] Complete production release/security review; merge only when checks pass.

## Important filming safety
Show only public testnet wallet addresses. Never reveal secret keys, recovery phrases or wallet passwords. Before every write verify the correct account, Studionet 61999, full contract address, fee, and method. Do not submit the same transaction twice due to a slow UI; follow the existing hash to its GenVM conclusion.

The source policy is deliberately `AGREED_SPEC_ONLY_V1`. The release authorization is an on-chain record and does not itself move funds.

## Work Order #2 Explorer proof (complete)

- [Create](https://explorer-studio.genlayer.com/tx/0xa7c782f969c88e726b13b527ba0299d7bf92af9c6f758376736797c0fd1ec012)
- [Accept](https://explorer-studio.genlayer.com/tx/0x1984f4b9545f6685fb699fc572668f696fc84295089cc227533e7f6622fc62e4)
- [Submit incomplete artifact](https://explorer-studio.genlayer.com/tx/0x281a2d0e2924231e5d9717c1f5b8222d151507e5b9e9cdcf50313b7aff5c0602)
- [Evaluate: R3 UNSATISFIED](https://explorer-studio.genlayer.com/tx/0x2f17900df6961efa6a81eca16f449d2a0b6aa99027d15c834c2d1f4b2775dbbb)
- [Claim denied: MILESTONE_NOT_ACCEPTED](https://explorer-studio.genlayer.com/tx/0xca2a98c928199f1b35f38c3e478cd74aae9dd58df546814a217636c21671ca6f)

**Record without extra signatures:** show Order #1 ACCEPTED / AUTHORIZED, Order #2 REVIEWED / CHANGES_REQUIRED, R3 UNSATISFIED, and Explorer rollback; do not re-trigger failed calls solely for video.
