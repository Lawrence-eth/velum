# Persistent work-order execution

The homepage now demonstrates a configured software work order with live GitHub evidence. The operator submits one of two real workflow runs. No model call is attributed to this selection. The separate live invoice-agent experiment remains at `/invoice.html`.

## Evidence and authorization

`src/work-order.ts` defines the authoritative synthetic work order: vendor, $2,400 amount, verified recipient, $6,000 budget, accepted commit, numeric repository/workflow identities, required branch and trigger, and the Git blob identity of the accepted workflow definition. Terms are configured by the demo team, not derived from submitted evidence or model output.

The confidential handler uses separate accounting and GitHub credentials. It fetches the reserved source bundle and makes actual HTTPS requests to the fixed GitHub repository for the submitted workflow run and its workflow definition at the run's commit. It validates completion, conclusion, repository, workflow, accepted revision, branch, trigger, definition and observation freshness. A successful build for the earlier revision fails these work conditions even though its wallet and amount are correct.

The work request ID commits to the execution attempt, workspace work identity, submitted evidence run and authoritative terms. The handler verifies that binding. The existing Solidity payment commitment includes this request ID, recipient, amount, token, chain, consumer and expiry. The ABI report format remains unchanged; public report fields do not contain commercial terms or raw GitHub metadata. GitHub observations appear in the authenticated operator result and CLI simulation output, separate from the ABI authorization.

A configured accepted commit is an explicit demo acceptance record, not a real customer approval. A green workflow is not proof of code quality. The repository is public. GitHub and the configured acceptance authority are trusted; the simulator and VM host are also trusted. There is no independent deployed TEE attestation or DON-authenticated forwarding.

## Reservation and history

A random browser-held capability identifies a synthetic work-order workspace. The dedicated bounded executor queue's Durable Object stores workspaces and attempts in SQLite. Creating a review atomically reserves the work identity and $2,400 of its budget before enqueueing CRE. Another request cannot acquire the same reservation. Retry keys return the same job and reject changed evidence.

A confirmed denial releases the reservation and retains the held attempt. A confirmed test settlement marks the work order paid and reduces its available budget. A new request ID cannot pay the same work order again. History and status survive reloads. This is a one-work-order demonstration; it does not implement several milestones competing for a shared budget, nor connect to the older CSV accounting workspace.

Unknown or failed execution retains the reservation. No browser action can simply mark it paid or release an uncertain payment. The operator may resume the same failed job, up to three times. Recovery keeps the original job identity and reservation; a completed journal result is returned instead of executing another payment. Persistent uncertainty or exhausted recovery requires investigation. Opening a new independent demo workspace is not a continuation of the old treasury and is not an organization-level identity guarantee.

## Persistent local treasury

The runner stores a protected journal under `artifacts/work-journals`, outside Git. Before each execution it rebuilds the workspace's EthereumJS treasury from the recorded registrations, actual CRE reports and settlement attempts at their original block timestamps. It verifies contract source hashes and recorded balances. This is deterministic reconstruction of persistent local execution state, not a new independently funded treasury for each attempt.

A completed execution is saved with its result using a temporary file, fsync and atomic rename before result delivery. Retrying the same job reads its saved result; a different job for paid work is rejected by the journal. Unacknowledged results are retried from disk before the runner claims another job. The backend accepts idempotent result delivery and can reconcile a delayed successful result after a timeout. A host disk loss or compromised host is outside this local demo's guarantees; there is no distributed journal replication.

Work-order uniqueness is enforced by the trusted reservation service and journal. Solidity enforces exact payment/report binding and request replay. The contract does not independently recognize a canonical business work identity, and an authorized owner is not cryptographically prevented from configuring a different treasury or policy. Do not claim that stronger guarantee.

## Bounds and reproduction

The existing global queue supports one CLI executor, at most three active jobs, and 40 new queued jobs per UTC day, plus at most three same-job recoveries for each failed work job. Workspaces are capped at 2,000 and each permits at most ten review attempts. Stored work attempts are retained beyond the short-lived invoice capture cleanup. This global coordination is intentional for the bounded demo executor, not a general multi-tenant deployment architecture.

- `bun test`: policy, evidence, payment binding and existing ledger cases.
- `bun run test:work-execution`: real GitHub retrieval inside CRE, denial, accepted payment, journal reconstruction, cached retry and duplicate rejection. Uses an isolated test journal directory.
- `VELUM_TEST_IP=104.21.32.18 bun run test:work-browser`: deployed reservation, concurrent rejection, capability isolation, reload recovery, actual CRE decisions, saved paid state, duplicate rejection, downloads and mobile layout.
- `scripts/work-recovery-test.ts`: actual runner restart and saved-result redelivery without another payment.
- `python3 scripts/work-resume-test.py`: explicitly injected pre-execution failure, retained reservation, same-job recovery and real CRE settlement.
- `bun run test:agent-browser`: compatibility checks for `/invoice.html`.

`work-workflow/workflow.yaml` selects the same handler with the additional GitHub secret mapping. The runner reads its existing GitHub credential without printing it and supplies it only to the local CLI environment. Source and GitHub credentials are checked against captured logs before publication. The production runner service must not use the test journal directory.

The public evidence files are timestamped recordings, not live endpoint responses. `work-browser.json` records actual browser-triggered work reviews; `work-order-execution.json` records the isolated executor checks. Neither contains workspace access capabilities.
