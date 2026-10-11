# PROOFLY — browser-only Spec Builder preview

This page is a **local, offline specification drafting prototype**.
It does not connect a wallet, deploy contracts, upload files, call LLMs,
read public URLs or produce a finalized proof receipt.

## Run locally

From the repository root:

    python -m http.server 4173 --directory apps/web

Visit http://localhost:4173 . This must be served over HTTP, not by
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
