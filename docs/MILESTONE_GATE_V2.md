# PROOFLY v2 milestone gate — experimental candidate

This is a new **undeloyed** GenLayer contract candidate. Original v1 and its work orders remain untouched.

## Consequence
When a contributor meets an agreed documentation-delivery rubric and GenLayer records ACCEPTED, the contributor can claim a one-time on-chain milestone release authorization. Outside services may independently read this authorization; no payment or off-chain integration is included. Rejected or unverifiable work does not authorize release.

## Source policy
AGREED_SPEC_ONLY_V1 limits claims to compliance with a specification authorized by both parties, not arbitrary factual claims on the internet. The contributor accepts a digest binding the order, network, contract, parties, requirements and immutable reference. Reference and artifact use commit-pinned GitHub TXT documents with SHA-256 validation. Independent validators re-fetch and compare evidence. These checks establish integrity and conformance, not independent authority to certify real-world facts.

## Safety boundaries
Release may be claimed only by the assigned contributor after ACCEPTED. The latest matching receipt is required, and only one grant is allowed. The grant is a non-transferable record, not an escrow, transfer, or automatic right in an off-chain system.

## Before deployment
Verify Python tests, GenVM compilation and ABI, full real-wallet workflow, FINALIZED and GenVM SUCCESS separately, negative and insufficient-evidence tests, and deployed source consistency. A new contract address and new order are required for video proof. Do not represent this feature as live until those checks are done.
