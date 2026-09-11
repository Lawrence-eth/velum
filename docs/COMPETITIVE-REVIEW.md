# Velum competitiveness review — September 11, 2026

This is an engineering/product assessment, not a prediction of judging results or a security audit.

| Dimension | Finding in v0.1 | Improvement selected |
|---|---|---|
| Prize fit | Real confidential handler and successful CLI logs match the published technical requirements. Eligibility still depends on human contribution, track and submission. | Preserve actual evidence and make it inspectable in the UI. |
| Originality | Invoice approvals alone are not distinctive. Request Finance already has invoice approvals and payments; Safe provides transaction coordination. | Focus on confidential, batch-aware spending decisions with a minimal public receipt. |
| Technical depth | Single-invoice checks; receiver tested independently of CRE output. | Evaluate a batch inside CRE; feed the actual returned ABI payload into a local EVM treasury and demonstrate token balance changes. |
| Correctness | Two individually valid invoices can overcommit a shared PO; fresh IDs can disguise duplicate invoices. | Sequential deterministic budget reservation inside one batch; duplicate invoice keys; reject inconsistent policy snapshots; bind report to complete ordered manifest. |
| Settlement | Authorization could be consumed without payment. | Treasury consumes authorization and transfers the exact token/amount/recipient in one call; failed transfer rolls back consumption. |
| Privacy | Sound distinction between simulation and enclave, but raw logs are hard to inspect. | A disclosure inspector shows exactly what stays private and what is in the report. No claim of private payment amounts or TEE execution in the browser. |
| Practicality | Hardcoded examples; no accounting connector or source freshness check. | Editable synthetic batch budget and fresh versioned snapshot. Real customer integrations remain future work. |
| UX | Attractive landing page, limited app behavior. | Batch workspace, shared-budget comparison, detailed invoice checks, downloadable receipt and evidence explorer. |
| Demo impact | Clicking approve/reject is forgettable. | Show two invoices both pass separately but cannot both fit the same private budget; show actual report-to-token settlement evidence. |
| Security | Good replay/domain checks; unbounded POST body read; no payment rollback evidence. | Bound request body reads, reject malformed inputs, test settlement failure, replay, manifest mutation, stale snapshots and unauthorized calls. |
| Operations | Public preview separate from CRE credentials. | Retain separation; deterministic reproduction script and CI. |
| Narrative | Generic businesses, no validated customer. | Working target: crypto teams paying contractors; awaiting user preference. |
| Team/eligibility | AI created most implementation; user chose name, reviewed prototype and requested this upgrade. | Accurately document contribution. Do not claim product validation or human development that has not occurred. |

## Why this scope
The strongest feasible improvement is a complete, reproducible confidential decision → settlement path, with a shared-budget failure case. Additional chains, an LLM, or speculative integrations would add surface area without resolving the core gaps. A local EVM bridge is explicitly a test adapter, not a Chainlink signature verifier or live network deployment.

## Remaining risks
Batch-local reservation does not implement a transactional accounting backend across batches. The trusted source must reserve its snapshot exclusively and reconcile paid invoices before issuing another. The treasury can serialize active batches, but it cannot verify a private upstream ledger is truthful. No production funds or real invoices should enter this prototype. A malicious authorized treasury owner can select dishonest policies; this is not governance against the treasury owner.

## Sources
- Judging criteria / rules: https://ethglobal.com/events/ethonline2026/info/details
- Prize requirements: https://ethglobal.com/events/ethonline2026/prizes/chainlink
- Existing invoice API: https://docs.request.finance/invoices
- Existing multisig coordination: https://docs.safe.global/core-api/transaction-service-overview
- Confidential execution boundary: https://docs.chain.link/cre/guides/workflow/using-confidential-workflows

## Implementation brief / user direction
User: “now the project seems ok but maybe not enough to winm analyze from every aspect and make it better”. Preserve the name Velum and the restrained artistic identity. Implement the selected upgrades, test actual behavior, publish only verified claims. No win guarantee.

## Verified upgrade outcome
- Batch policy/API tests pass. The five-row fixture approves 5,800 synthetic USD versus 13,800 under independent checks.
- A new actual CRE simulation produced a 768-byte ABI payload. The same bytes were passed to the local Solidity treasury; two token balances increased and treasury decreased by exactly 5,800 synthetic USD.
- 33 end-to-end checks passed, including failed-transfer rollback, complete manifest validation, replay, unauthorized settlement and cancellation.
- Browser verification covers 17 flows, including interactive budget changes, private/public views, download, receipt hash consistency and mobile overflow.
- The analysis resulted in implemented changes, not only a redesign proposal. These results improve the demonstration; they do not imply a prize probability.

## Cost and scaling assessment
The batch handler uses one authenticated HTTP call and one report operation for up to 20 entries. EVM report processing is linear in entry count; each payment is separately settled. The 20-entry bound limits untrusted work, but no production throughput or dollar-cost claim has been measured. The EVM receipt includes execution gas for the demonstrated transfers. A production deployment needs measured total cost including report delivery, registration, storage and payment transactions.

## Deliberate tradeoffs
The owner commits the complete ordered batch before approval, preventing decision omission/reordering after evaluation. First-in-order allocation is predictable, but not fair allocation or optimal scheduling. Cancelling a batch revokes unspent approvals but cannot reverse paid transfers. Current token compatibility is standard ERC-20 behavior; fee/rebase tokens require further accounting. A private policy revision label cannot itself revoke an onchain report. These details should be explained during Q&A.
