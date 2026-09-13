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

## September 12: persistence, import, and reconciliation

Implemented a persistent synthetic accounting workspace, strict CSV import with
editable held invoices, and an explicit privacy matrix. Live tests demonstrate
cross-run budget reservation, canonical invoice identities, page-reload persistence,
concurrent reservation serialization, preview release, and finalized Sepolia
reconciliation. A subsequent actual CRE CLI simulation fetched the saved accounting
snapshot and rejected all five resubmitted invoices after reconciliation.

The raw policy evaluator remains snapshot-based. The demo ledger is not a live
accounting-provider integration, and browser reservation does not initiate a CRE
execution or payment. The new source snapshot endpoint connects saved accounting
state to the simulator, with evidence saved in `evidence/ledger-cre.json`.

27 policy/API/ledger tests and 12 live ledger/browser checks passed. The separate
confidential-beta application still needs Lawrence's name/role; a general CRE
access request was submitted successfully. Customer research materials and human
review tasks are prepared, not completed validation. Human-narrated submission
video remains pending. These are the remaining tasks most likely to affect the
credibility and completeness of the submission.

## Guided execution review — September 12

The main weakness after visual unification was the demonstration itself: a reviewer had to connect an AI preview, a separate EVM lab and recorded CRE files. The primary interaction now carries an actual model proposal directly into the compiled local treasury. It shows requested versus transferred funds, then provides an explicit operator correction and successful retry. This replaces page navigation with a complete observable task.

The live model is fallible and the source fixture is deliberately separate from its output. The local executor checks preserved proposal fields and agreement with the server policy before displaying success. A rejected attempt and its correction can be downloaded together. Each attempt has a fresh treasury and is clearly distinguished from persistent accounting and CRE execution.

Against the current Chainlink criteria, the strongest evidence remains the actual confidential handler simulation and report-driven contract outcomes. The prize accepts successful CLI simulations, but requires the confidential component to contribute meaningfully to the application's core. The integrated interaction helps explain that architecture; it is not itself a live CRE run. [Official criteria](https://ethglobal.com/events/ethonline2026/prizes/chainlink)

Competitive gaps remain: no independent treasury-operator validation, no production accounting connector, no deployed confidential attestation, and no broad attack evaluation. There is no basis to estimate winning probability or claim these examples establish universal security. The presentation should lead with one verifiable payment failure and recovery, not a feature count.

## September 13: next product improvements

The homepage now invokes actual CRE CLI execution, closing the earlier integration gap. The strongest remaining product improvement is connecting it to persistent accounting: reserve the canonical invoice and budget, execute the report, reconcile the outcome and reject a second payment after reload. This requires explicit failure recovery; local treasury experiments must not be relabeled as real settled invoices.

Next, put shared private-budget enforcement into that same journey: two valid invoices pass individually but exceed their shared budget together. The batch evaluator already demonstrates this in supporting tools; the primary review does not. This would make private policy central to the user's decision. A broader adversarial evaluation should distinguish model resistance from policy enforcement and cover changed amounts, duplicates, stale records and replay. Neither is implemented by the readability revision.

These are engineering priorities, not prize predictions. The official confidential-workflow criteria require meaningful core integration and successful CLI or deployment evidence, which are documented separately. Independent operator feedback and human narration remain valuable uncompleted work.

## Deeper competitor and implementation review

See [Velum: the next build](research/VELUM-NEXT-BUILD.md) for the current recommendation, primary-source competitor comparison, exact-revision work-order concept, state model, acceptance tests and live GitHub feasibility evidence. It supersedes the earlier suggestion that persistence alone would provide sufficient differentiation. The proposed work-order integration is not implemented in the deployed product.
