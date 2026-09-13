# Invoice-agent CRE execution

The separate `/invoice.html` review invokes a real CRE CLI confidential-handler simulation for each run. The returned ABI report drives compiled Solidity on the VM. This replaces the earlier primary flow's browser-local policy report.

The homepage work-order workflow has persistent reservations and an execution journal; see [WORK-ORDERS.md](WORK-ORDERS.md). This document describes the independent invoice-agent experiments.

## Request path

1. Workers AI reads one of two fixed synthetic invoice inputs. Strict validation accepts only the expected invoice reference, recipient and amount.
2. The server persists that proposal with its independently sourced accounting bundle. It returns an unguessable per-run access capability to the requesting browser.
3. The browser queues the saved run. It cannot supply arbitrary policy, workflow paths, HTTP destinations, report bytes or shell arguments.
4. One authenticated VM executor claims the job. It constructs a fresh local treasury, token and canonical source bundle, registers the exact proposed payment, and creates an ephemeral loopback API with a fresh secret.
5. The actual CRE CLI executes `workflow/batch-main.ts`. Secret retrieval and source fetch happen inside `handlerInTee`. The handler evaluates the proposal and returns a bound ABI report.
6. The executor checks that the source was fetched and that the actual returned report matches the expected encoded decision. It delivers those exact report bytes to the compiled treasury through a mock identity, attempts settlement, reads balances, and verifies replay rejection.
7. The authenticated result is validated against the saved proposal, request ID, decision report and token balance delta before being made available to the browser. The UI shows actual results and exposes the CLI log and run trace.

An explicit operator correction is constructed from the server's canonical vendor record. It receives a new run ID and launches a second CRE job. Its combined trace retains the denied attempt and clearly labels the operator as the correction source.

## Boundaries

This is **live execution of the CRE CLI simulator**, not deployment to an attested confidential network. The Solidity treasury runs in a fresh VM-local EVM for each job; no network payment is sent. Forwarder metadata is mocked. Source data is synthetic. Persistent accounting reservations remain a separate workflow.

The runner is trusted infrastructure. The result checks reject inconsistent transport data; they are not independent attestation of Chainlink, the host or the runner. A real deployment requires the confidential network, registered workflow identity, production forwarder and an authenticated accounting source with exclusive reservations.

## Operational bounds

- Only server-created proposals may be queued; enqueue is idempotent for each run.
- At most three jobs may be queued/running and 40 may start per UTC day.
- Proposal creation is capped at 500 stored captures per day; old rows are removed after 24 hours. Model inference retains its separate 50/day limit.
- Proposal eligibility for queueing expires after 15 minutes. Stale execution jobs fail after 180 seconds; CLI execution is terminated after 100 seconds.
- The runner polls outbound over HTTPS. No inbound VM port, shell execution API or wallet key is exposed.
- The runner uses a dedicated secret outside the repository, and the Worker uses its corresponding secret binding. It uses no funded Ethereum private key; the CLI receives an explicit dummy simulation key and never broadcasts.
- Runner credentials are removed from the CLI child environment. Each job's temporary credential/config directory is removed in `finally`. Captured logs are checked for the temporary source credential before publication.
- Downloaded operator traces strip per-run access capabilities.

The single queue is intentional coordination for one bounded CLI executor, not a general multi-tenant architecture. Each persisted accounting workspace still has its own Durable Object.

## VM service

Build with `bun run build:runner`. The current VM uses the user systemd service `velum-cre-runner.service`, with restart-on-failure, a 1.2 GB memory limit, a task limit and a protected environment file. User lingering is enabled so the service survives SSH logout.

```sh
systemctl --user status velum-cre-runner.service
journalctl --user -u velum-cre-runner.service --no-pager -n 20
```

Provision your own `CRE_RUNNER_TOKEN` in a protected environment file and as a Worker secret. Authenticate CRE on the runner host, build the contracts, and run the service from the repository root. Never copy the current VM's credentials into the repository. The runner currently has a VM-specific CRE binary path; adapt it for another host.

`bun run test:agent-browser` exercises the live model, actual CRE jobs, wrong-wallet control, explicit source correction, combined log/trace download and mobile results. `test/cre-jobs.test.ts` checks result integrity. API access/queue behavior is checked separately against the deployed service.
