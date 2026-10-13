# PROOFLY — Single-contract cutover (Studionet)

**Decision:** Launch the new product on **one fresh indexed milestone contract**. Do not mix V1, V2, and V3 records in the new app. The old deployed addresses remain immutable on the network, but they will not be product data sources after cutover.

## Canonical contract source for the new launch

[`contracts/proofly/milestone_gate_v3_indexed.py`](../contracts/proofly/milestone_gate_v3_indexed.py)

This source keeps the milestone workflow (create / accept / submit / AI consensus / claim) and introduces owner/contributor append-only indexes with `list_owner_order_ids` and `list_contributor_order_ids` (page size 1–50). It is a **candidate**, not a deployed or audited contract.

## Deployment boundary

There is currently **no verified new GenLayer contract address**. GitHub commits and Vercel deployments are not deployments of GenLayer contracts. Do not substitute the previously deployed V2 address: `0xD67245387dF5448671235CE00c8969664b5aF8bd` for the new one.

**Required next step:** deploy the exact pinned canonical Python source in GenLayer Studio, then capture the NEW contract address and deployment transaction / source identity. Do not use simulation-only results.

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
