# PROOFLY — Studionet deployment verification

**Status: USER-REPORTED IMPORT ADDRESS / ON-CHAIN VERIFICATION PENDING**

A PROOFLY Studio import link was provided by the project owner on
2026-10-11. This is an **unverified lead**, not independently confirmed
deployment, finalization, execution success, or compatibility with
`contracts/proofly/work_order.py` at HEAD.

## Candidate address (user supplied)

- Network to inspect: GenLayer Studio / Studionet (confirm chain ID **61999**)
- Candidate contract: `0x6F773E2e249D08a00509E4EC96d13C71c0e657d7`
- Import: https://studio.genlayer.com/?import-contract=0x6F773E2e249D08a00509E4EC96d13C71c0e657d7
- Explorer: https://explorer-studio.genlayer.com/address/0x6F773E2e249D08a00509E4EC96d13C71c0e657d7
- Deployment tx: **NOT YET VERIFIED**
- Deployed source / class / dependency: **NOT YET VERIFIED**
- Deployment status + GenVM execution result: **NOT YET VERIFIED**
- Live contract read: **NOT YET VERIFIED**
- Full owner/contributor work-order lifecycle: **NOT YET VERIFIED**

Do not mark these items successful until a matching finalized transaction,
execution success, contract code, and observable read/write state are collected.

## Release evidence checklist

1. [ ] Open the Explorer contract page: identify deployment tx, finalized
   status, SUCCESS GenVM result, chain ID, deployer and contract address.
2. [ ] Compare the transaction's deployed contract code and class against
   the reviewed `contracts/proofly/work_order.py` candidate.
3. [ ] In Studio Run & Debug, call `next_order()` as a read method. On a
   brand-new deployment with no orders it should be the string `"1"`.
4. [ ] Create an order with public commit-pinned reference source + digest,
   realistic deadlines, and another wallet as contributor. Record its tx hash.
5. [ ] Wait for FINALIZED and SUCCESS; inspect `get_order(order_id)`.
6. [ ] Switch to contributor wallet. Confirm the stored spec hash, then call
   `accept_order(order_id, spec_sha256)`. Capture finalized SUCCESS.
7. [ ] Call `submit_evidence` from contributor wallet using a commit-pinned
   artifact and its actual SHA-256. Capture finalized SUCCESS.
8. [ ] Call `evaluate_submission(order_id)`; verify consensus and execution
   SUCCESS, then inspect `get_receipt(order_id, 1)`.
9. [ ] Repeat representative CHANGES_REQUIRED, EVIDENCE_REQUIRED and
   injection-adversarial cases. Record verdicts, quote snippets, failures,
   fees, latency and network data **as actually observed**.
10. [ ] Run portable receipt checks using authentic exported chain state;
    verify that the original source bytes match declared digests.
11. [ ] Only then update README and Builder submission description with
    confirmed deployment and live behavior.

## Evidence table — fill with verified values only

| Requirement | Current evidence |
| --- | --- |
| Deployment transaction URL | Pending |
| Finalized deployment SUCCESS | Pending |
| Deployed source matches reviewed code | Pending |
| `next_order()` read | Pending |
| `create_order` finalized SUCCESS | Pending |
| `accept_order` finalized SUCCESS | Pending |
| `submit_evidence` finalized SUCCESS | Pending |
| `evaluate_submission` finalized SUCCESS | Pending |
| `get_receipt` and per-requirement results | Pending |
| Independent verdict benchmark / injection case | Pending |

This deployment note is for auditability and **must not** be interpreted as
proof that the user-provided import address belongs to the current PROOFLY
contract or that GenLayer validators have verified any real deliverable.


## Live failure observed during manual create_order test — 2026-10-11

The owner provided a GenVM traceback from `create_order`:

```
OverflowError: cannot fit 'int' into an index-sized integer
contract.py:162 in create_order -> _address(contributor)
contract.py:47 in _address -> Address(value).as_hex.lower()
```

The current Studio-imported instance cannot be counted as a successful
end-to-end proof. **Do not report create_order as successful.** The source
fix changes the method's contributor ABI from `Address` to `str`; it
requires deployment of a fresh instance. The old candidate address remains
in this document only as historical evidence of the attempted deployment.
The new address, deployment tx, readback and business flow are PENDING.
