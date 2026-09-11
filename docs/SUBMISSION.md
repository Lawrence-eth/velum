# ETHOnline submission draft — not submitted

## Title
Velum

## Short description
A confidential payment gate that catches duplicate invoices and shared-budget overruns before an onchain treasury pays a contractor batch.

## Description
A $4,200 invoice and a $3,800 invoice can both pass a $5,000 approval limit and still overdraw a $6,000 purchase order. Velum checks the entire payment run, including private budget commitments and resubmitted invoice identities, inside a Chainlink CRE confidential handler.

The handler retrieves an authenticated accounting snapshot and keeps invoice references, vendor IDs, purchase-order terms and rejection reasons out of its public report. The report commits to an ordered set of exact payments. A treasury validates that manifest and settles only approved entries, consuming approval and transferring tokens in one transaction. Failed transfers restore the approval.

The demo makes the distinction visible: an interactive synthetic preview compares isolated checks to shared-budget decisions, a disclosure inspector shows operator versus public data, and an evidence panel shows real CRE simulation output driving actual Solidity bytecode and token balance changes in a local EVM.

## How it is made
TypeScript, Chainlink CRE SDK 1.18.0 and `handlerInTee` targeting AWS Nitro in us-west-2. `getSecret` and `HTTPClient` run inside the handler. Batch policy checks snapshot freshness, consistent private PO terms, invoice identity, amount/recipient/currency matching, remaining budget and expiry. `usingTheDons` releases only the batch ID, ordered manifest and request-bound decisions for one ABI-encoded report.

Solidity `BatchTreasury` authenticates the forwarder and exact workflow identity, rejects incomplete/reordered/tampered reports, serializes active batches, prevents replay and atomically transfers ERC-20 test tokens. Cloudflare Workers host the preview, and vanilla JavaScript powers the responsive interface and downloadable receipts.

## Chainlink integration and evidence
Target: **Best Confidential Workflow**. The core batch decision is evaluated in a real CRE CLI confidential-workflow simulation. `scripts/batch-e2e.ts` uses the actual returned ABI bytes in a local EVM adapter. Recorded results: two approved payments totaling 5,800 synthetic USD, treasury balance 20,000 → 14,200, and 33 end-to-end checks. Original four single-invoice simulations remain available.

This is simulation evidence accepted by the published prize criteria; it is not a live hardware enclave deployment. The local adapter uses a mock forwarder caller and does not verify Chainlink signatures. No network transaction or real-asset payment is claimed. Receipt hashing verifies file consistency only.

## Links
- Demo: https://velum.aethe.me
- Source: https://github.com/Lawrence-eth/velum
- Settlement receipt: https://velum.aethe.me/settlement-evidence.json
- CRE batch log: https://velum.aethe.me/logs/cre-batch.log
- Video: PENDING — 2–4 minutes, human narration, at least 720p.

## Limitations
Synthetic accounting API; batch-local reservations only. A real source must reserve snapshots exclusively and reconcile paid invoices across batches. No production accounting integration, real token settlement, Sepolia deployment or live CRE network deployment. No audit. The treasury trusts configured token behavior and the authorized workflow/source.

## AI and prior work
Codex generated the concept, implementation, tests, UI and drafts. Lawrence provided Chainlink direction/environment, authenticated CRE, reviewed the prototype, chose the Velum name and artistic direction, and requested the competitive upgrade. Public templates informed the CRE API wiring. No prior private project code was reused. Human customer validation and final narration remain pending. Do not embellish the contribution record.

## Before submitting
Confirm the registered Start Fresh/Continuity track, review the functionality and disclosure, document meaningful actual team contribution, record the human-narrated demo, select Chainlink in the dashboard and submit before **September 13, 2026, 16:00 UTC**. No dashboard submission has been performed.

[Rules](https://ethglobal.com/events/ethonline2026/info/details) · [Chainlink prize](https://ethglobal.com/events/ethonline2026/prizes/chainlink)
