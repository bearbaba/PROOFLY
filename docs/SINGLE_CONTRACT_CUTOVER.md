# PROOFLY — Single-contract cutover (Studionet)

**Decision:** Launch the new product on **one fresh indexed milestone contract**. Do not mix V1, V2, and V3 records in the new app. The old deployed addresses remain immutable on the network, but they will not be product data sources after cutover.

## Canonical contract source for the new launch

[`contracts/proofly/milestone_gate_v3_indexed.py`](../contracts/proofly/milestone_gate_v3_indexed.py)

This source keeps the milestone workflow (create / accept / submit / AI consensus / claim) and introduces owner/contributor append-only indexes with `list_owner_order_ids` and `list_contributor_order_ids` (page size 1–50). It is a **candidate**, not a deployed or audited contract.

## Deployment boundary (updated October 14, 2026)

The new address supplied via GenLayer Studio import is `0xb8305F15336a79761157b86e214d3dDeaDFc1ce` on Studionet chain 61999. The web application is configured to use this **single indexed contract address**. The Vercel production build at commit `7f4a769c` reported READY on October 13. **These facts do not independently establish** deployed source parity, GenVM execution, or a complete V3 acceptance workflow. Do not substitute V2 transaction proofs for the new contract.

**Required next step:** independently capture the new contract deployment transaction, verified deployed source identity, and fresh create/accept/submit/evaluate/claim transaction hashes with GenVM result and final-state reads. Do not use simulation-only results.

Before deploying, test/inspect:
- The indexed `TreeMap` state and `get` access are supported by the active GenVM toolchain.
- Constructing the contract and reading `list_owner_order_ids(wallet, 0, 20)` works for an empty index.
- Real `create_order` increments both indexes and returns the same new order ID in each role.
- Offsets 0, last page, beyond total, invalid/oversized page limits, and wallet case normalization.
- Contract acceptance security (Owner vs Contributor), pinned reference digest, consensus validator, no accepted receipt => no release, and no duplicate grant.

## After the contract address is verified

1. Replace **every** V2 constant used by the web application, model and UI links with a single canonical address for the new contract. Do not run two address namespaces in the new product.
2. Change My Work from historical `next_order/get_order` scan to indexed `list_owner_order_ids` and `list_contributor_order_ids`; fetch only IDs in the requested page; validate each returned order against the connected wallet and the address of the contract being queried.
3. Use one stable Preview hostname (same origin across test runs) and a transaction journal keyed by chain, contract, wallet and hash. Store the pending hash **before** awaiting finality. Never infer GenVM SUCCESS from consensus finalization alone.
4. Run a new on-chain end-to-end test (Owner create → Contributor accept → submit → AI evaluation → claim), a negative test (R3 unsatisfied → rollback), and browser reload/timeout/account switch cases.
5. Only after this passes, promote the same verified build to the final PROOFLY domain and record a new video with a fresh order.

**Cutover rule:** The launch app shows exactly one contract address and all its Work Orders use that address; old testnet deployments are not queried in the production UI. Historical proof links may remain in archived documents. Do not claim that old blockchain contracts were deleted.

## Responsibility / blocker

There is currently no connected GenLayer Studio deployment action available here to sign and deploy this contract on the user's behalf. The contract's new address must come from an actual signed Studio deployment before the web can be safely switched.
