# PROOFLY — Indexed discovery upgrade (V3 candidate)

## Why this is necessary

The **deployed V2 contract** at `0xD67245387dF5448671235CE00c8969664b5aF8bd` only exposes `get_order(id)` and `next_order()`. It does not expose a wallet index. The V2 web client therefore currently uses finalized-state batch scanning (20 IDs per page, bounded concurrency). `Find all my work` can scan historical orders, but its cost is O(total orders) and RPCs may be slow or rate-limited. It is **not an indexed lookup**.

## V3 source candidate

`contracts/proofly/milestone_gate_v3_indexed.py` preserves the V2 milestone acceptance and consensus gate while adding append-only indexes on `create_order`:

- `owner_order_counts[owner]` and `owner_order_ids[owner:sequence]`
- `contributor_order_counts[contributor]` and `contributor_order_ids[contributor:sequence]`
- `list_owner_order_ids(owner, offset, limit)`
- `list_contributor_order_ids(contributor, offset, limit)`

Results return a JSON string with `wallet`, `role`, `total`, `order_ids` (newest first), `next_offset`, and `has_more`. Limits are strictly 1–50 per page. Addresses are normalized and validated. The new on-chain lookup is O(page size) rather than O(global order count).

**Source code is only a candidate.** No V3 address exists yet, no Studio/GenVM execution, gas benchmark, or external audit has been performed. Do not say this is deployed or production-ready.

## Migration and data continuity

The deployed V2 contract **cannot be mutated in place by a GitHub commit**. Its historical Work Orders #1, #2 and #3 continue to live at the V2 address. A fresh V3 deployment starts with new IDs and new on-chain indexes. It will **not automatically contain V2 orders**.

Release sequence:

1. Run static checks and offline regression tests for V3; reproduce positive flow and all negative guards (wrong caller, double claim, non-ACCEPTED claim).
2. Deploy a separate V3 contract on Studionet; verify exact deployed source in Explorer and Studio. Do not overwrite the V2 contract reference.
3. Test wallet-index pagination with >50 orders, both Owner and Contributor roles, account switching, malformed offsets and limits, and chain finality.
4. Extend the web client with a **versioned contract registry** and a read adapter. V3 uses address index. V2 historical records remain accessible using an explicit V2 network/address and scan fallback.
5. Add wallet-scoped local search, stable canonical URLs containing contract version + address + order ID, and explicit cross-contract status labels. Never conflate V2 #3 with V3 #3.
6. Validate the browser lifecycle: signed create, accept, submit, consensus, claim, finality vs GenVM execution, transaction recovery across reloads, and negative rollback.
7. Review contract upgrade/security with adversarial tests. Only after manual approval promote V3 from Preview to a production domain. Preserve V2 read-only public proof URLs and V1 legacy production until migration sign-off.

## Product-quality remaining tasks

- Stable public app hostname instead of changing preview origins. Browser localStorage is origin-bound; changing Vercel URLs can strand pending hashes.
- Multi-transaction durable journal rather than a single pending-write key; include chain ID, contract address, wallet, method, args digest, tx hash and finalized execution status.
- Confirmation of execution result from a reliable RPC/Explorer-compatible receipt endpoint; never equate consensus FINALIZED with GenVM SUCCESS.
- A true indexed My Work UI with pagination and wallet filters across every supported contract version.
- Loading, empty, offline, rate-limited and RPC-error states; mobile wallet flows, accessibility and performance checks.
- Real-browser and live Studionet end-to-end test before filming a completely new workflow.

## Integrity statement

The existing verified V2 positive and negative Studionet demonstrations remain valid at their original contract. This candidate V3 provides a scalable discovery mechanism but **does not retroactively update historical V2 storage**.
