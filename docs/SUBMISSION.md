# ETHOnline submission draft — not submitted

## Title
Velum

## Short description
Confidential work-order payments: CRE verifies the exact accepted software revision and private commercial terms, then authorizes one payment with persistent reservation and history.

## Description
A correct wallet, correct amount and successful build do not prove a contractor delivered the agreed revision. Velum checks that commercial boundary before payment.

The primary flow reserves a configured synthetic work order and its budget. A Chainlink CRE confidential handler retrieves the source record and live GitHub evidence using separate credentials. It checks the accepted commit, numeric repository/workflow identities, branch, trigger, successful completion and pinned workflow definition, alongside the payment policy. The actual returned ABI report determines settlement in compiled Solidity.

The demonstration begins with a real successful GitHub run for an earlier revision: payment is held and zero tokens transfer. Selecting the accepted revision triggers another CRE execution and transfers 2,400 test tokens. The same workspace preserves its contract operations and paid work identity; a duplicate request after reload is rejected. Concurrent requests cannot acquire the same reservation.

## How it is made
TypeScript/Zod defines independent work terms and validates evidence. `handlerInTee` retrieves source and GitHub credentials, fetches the provider records and evaluates the conditions. Request identity commits to the work binding, evidence reference and configured terms. The existing payment commitment binds request, recipient, amount, token, chain, consumer and expiry. `usingTheDons` returns an ABI authorization without raw commercial terms.

`BatchTreasury` checks its configured forwarder/workflow, manifest, exact payment commitments and expiry, and atomically consumes authorization with ERC-20 transfer. The demo uses mock identity. SQLite-backed Durable Objects persist reservations and operator history. A protected execution journal reconstructs the workspace's local EVM across runs; completed results are durably saved and redelivered until acknowledged. Unknown outcomes retain their reservation instead of opening another payment path.

The separate invoice-agent experiment uses live Workers AI and actual CRE to reject a changed-wallet proposal. Supporting tools include batch budget checks, persistent CSV accounting, browser contract experiments and recorded Sepolia test-token settlement through a simulation adapter.

## Chainlink integration and evidence
Target: **Best Confidential Workflow**. The confidential handler performs the core work-evidence and commercial-policy decision. It makes actual GitHub HTTPS requests and returns the report bytes used by Solidity; the main flow does not substitute a browser-computed verdict.

Published work-order evidence includes two browser-triggered real CRE executions, held and paid outcomes in a saved workspace, concurrent reservation rejection, reload recovery, duplicate protection and capability-free downloads. Unit coverage includes wrong revision, repository, workflow definition, branch, trigger, incomplete/failing runs, observation freshness and request binding. An isolated executor test also checks journal reconstruction, cached retry and rejection of a new job for paid work.

## Links
- Demo: https://velum.aethe.me
- Source: https://github.com/Lawrence-eth/velum
- Browser-triggered work-order evidence: https://velum.aethe.me/work-browser.json
- Actual CRE and journal execution checks: https://velum.aethe.me/work-order-execution.json
- Separate live invoice agent: https://velum.aethe.me/invoice.html
- Evidence explorer: https://velum.aethe.me/evidence.html
- Separate Sepolia receipts: https://velum.aethe.me/sepolia-evidence.json
- Video: PENDING human narration; 2–4 minutes and at least 720p.

## Limitations
Synthetic commercial terms and configured acceptance, public team-controlled GitHub repository, no customer validation. A green build does not prove software quality. Actual CRE CLI simulation is demonstrated, not deployed TEE attestation. Solidity executes in a journal-backed local EVM with mock forwarder identity; no new network payment is sent. Work-order uniqueness depends on the trusted reservation service and runner journal; the contract independently prevents request replay, not business-identity reuse across arbitrary treasuries. Each browser-created demo workspace is an independent test environment.

The primary demonstration covers one work order, not multiple competing milestones or a production accounting connector. Unknown executions require reconciliation. Production needs governed acceptance and policy updates, restricted source access, registered confidential execution/forwarder identity, replicated durable state and chain reconciliation. The earlier CSV accounting and Sepolia fixtures remain separate.

## AI and prior work
Codex generated the implementation, tests, UI and drafts, including the agent-gate direction. Lawrence selected the Chainlink focus, provided and authenticated the development environment and CRE account, chose Velum and the artistic direction, reviewed iterations and authorized the pivot. Public documentation informed API usage. No prior private project code was reused. Human customer validation and final narration remain pending; do not embellish the contribution record.

## Before submitting
Confirm the registered Start Fresh/Continuity track, review the prototype and disclosures, document meaningful actual team contribution, record the human-narrated demo, select Chainlink in the dashboard and submit before **September 13, 2026, 16:00 UTC**. No dashboard submission has been performed.

[Rules](https://ethglobal.com/events/ethonline2026/info/details) · [Chainlink prize](https://ethglobal.com/events/ethonline2026/prizes/chainlink)
