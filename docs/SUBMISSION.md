# ETHOnline submission draft — not submitted

## Title
Velum

## Short description
Private invoice authorization with Chainlink Confidential Workflows: check sensitive purchase-order rules inside a confidential handler, then release a minimal, payment-bound decision.

## Description
Onchain treasuries need approval rules, but publishing vendor details and negotiated spending caps reveals internal business information. Velum separates private invoice evaluation from public authorization. The workflow authenticates to an invoice API, checks the invoice against a purchase-order policy inside a CRE TEE handler, and releases only the request identifier, payment commitment, approval and expiry for a DON report.

The demo lets reviewers explore four synthetic scenarios and adjust a private approval limit. It labels interactive previews separately from actual recorded CRE simulations. A Solidity receiver binds each decision to a registered payment and enforces workflow authentication, expiry and one-use authorization.

## How it is made
TypeScript with Chainlink CRE SDK 1.18.0; `handlerInTee` targets AWS Nitro in us-west-2. `runtime.getSecret` retrieves an API token inside the handler; ordinary `HTTPClient` with `TeeRuntime` fetches synthetic invoice and policy data. Deterministic rules reject vendor, currency, recipient, amount, budget, duplicate and expiry violations. `usingTheDons` and `report` handle the deliberately minimal public result. Reports use viem ABI encoding. The Solidity registry verifies forwarder and workflow identity and a chain/receiver/payment-bound commitment. A Cloudflare Worker hosts the synthetic preview, with a responsive vanilla JavaScript frontend.

## Chainlink integration / prize
Intended prize: Best Confidential Workflow. All four scenario runs completed in the actual CRE CLI. Evidence: `public/evidence.json`, `evidence/cre-*.log`, and the source at `workflow/workflow.ts`. This entry does not claim live TEE deployment, actual privacy in simulation, a deployed Sepolia receiver, or completed payments. The separate local EVM tests use a mock forwarder and are not evidence of Chainlink network settlement.

## Links
- Demo: https://velum.aethe.me
- Repository: https://github.com/Lawrence-eth/velum
- Execution manifest: https://velum.aethe.me/evidence.json
- Demo video: PENDING — user must record 2–4 minutes with their own narration, at least 720p.

## Current limitations
Synthetic API only; no accounting connector, transactional shared-budget reservations, real payments or live confidential deployment. Trust in the invoice source is explicit. Full live report delivery remains unverified. Prototype is unaudited.

## AI use and prior work
Codex generated the product proposal, implementation, UI, tests and draft documents. Public Chainlink examples informed API wiring; attribution is in README. Lawrence provided track direction/environment and authenticated CRE. Meaningful human product work is still pending and must be described truthfully before submission. Start Fresh versus Continuity registration has not been confirmed.

## Required before submission
- Confirm registration track and final product/customer direction.
- Make and document meaningful human contributions; do not replace this with an invented claim.
- Record the required human-narrated demo; no AI voiceover.
- Review actual evidence and limitations; select Chainlink in the dashboard.
- Submit before September 13, 2026, 16:00 UTC. No dashboard submission has been performed.

Rules: https://ethglobal.com/events/ethonline2026/info/details
Prize: https://ethglobal.com/events/ethonline2026/prizes/chainlink
