# Velum — private invoice authorization

AI-assisted prototype for ETHOnline 2026, started September 11, 2026.

## Problem and working scope
Small teams paying contractors from an onchain treasury need to enforce invoice rules without publishing supplier identifiers, purchase-order details or negotiated caps. Velum evaluates these details inside a CRE confidential handler and emits a minimal, request-bound authorization. Payment amounts and destinations remain public when used onchain. This is authorization infrastructure, not a private transfer protocol.

Working proposal selected by the assistant; user validation of the customer, problem and track is still pending. Do not describe it as user-validated.

## Required behavior
- Validate positive integer amounts; exact recipient, currency and invoice/PO matching; private vendor allowlist; per-invoice and remaining-PO limits; expiry.
- Fetch the API credential and sensitive invoice/PO policy inside handlerInTee.
- Return only request ID, authorization commitment, approval boolean and expiry to the DON, then generate an ABI report.
- Optional EVM report delivery updates a receiver. Bind authorization to chain, consumer, payment recipient, token, amount and invoice request. Reject replay and stale reports; authenticate forwarder and workflow identity.
- Public demo uses only synthetic data. Browser preview is visibly distinct from actual CLI evidence. Local simulation is not an enclave and must not process production secrets.
- Authenticated demo API holds synthetic fixtures. Public users cannot trigger CRE, broadcast transactions, or access VM credentials.

## Evidence and scope
Run actual CRE simulations for approval and rejection, adversarial policy tests, contract integration tests and browser interaction tests. Preserve logs and actual execution hashes. No fabricated deployments, network attestations, security audits or transaction hashes.

## Inputs and attribution
User asked: “im now on ethglobal online hackathon, https://ethglobal.com/events/ethonline2026/home, i wanna use chainlink track, reserach it and do everything for me, i have github and aethe.me api key on the vm right nowm aks me if ur not sure aboyt anything”. User connected CRE through SSH/browser authentication. Project proposal and implementation are AI-generated so far. Human product work and narrated demo remain necessary for eligibility.
Sources: https://ethglobal.com/events/ethonline2026/prizes/chainlink ; https://ethglobal.com/events/ethonline2026/info/details ; https://docs.chain.link/cre-templates/hello-confidential-workflows ; https://docs.chain.link/cre/guides/workflow/using-evm-client/onchain-write/building-consumer-contracts

Use the public Hello Confidential Workflows template as API/structure reference, with explicit attribution. Do not copy its demonstration scoring function or echo endpoint into product logic.

## v0.2 extension
The initial scope above is preserved as the original planning record. The user reviewed the prototype, chose Velum and its artistic direction, and requested a competitive upgrade. The resulting assessment and implementation brief are in `COMPETITIVE-REVIEW.md`. The current implementation adds ordered batch evaluation, within-batch budget reservation, duplicate invoice identity checks, a versioned/fresh accounting snapshot, an atomic settlement treasury, actual CRE-output-to-local-EVM evidence, a batch workspace and a disclosure inspector. Current limitations and reproducible commands are in README.
