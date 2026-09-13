# Velum

**Give agents a task. Keep the authority.** A confidential execution gate for AI treasury agents, built for ETHOnline 2026 and the Chainlink Best Confidential Workflow track.

[Live agent demo](https://velum.aethe.me) · [Agent → CRE → contract evidence](public/agent-evidence.json) · [Contract lab](https://velum.aethe.me/lab.html) · [Payment desk](https://velum.aethe.me/desk.html#ledger) · [Evidence explorer](https://velum.aethe.me/evidence.html) · [Submission draft](docs/SUBMISSION.md)

An invoice can persuade a payment agent to change a wallet. Velum treats the agent's output as a proposal: a separate accounting record and deterministic private policy decide whether that exact payment is eligible. The model cannot supply its own approval, policy, budget or invoice identity.

![Velum guided payment result](evidence/site-payments-desktop.png)

## Live payment review

Select an invoice and click **Run review**. The model proposes a wallet and amount; the server runs the actual Chainlink CRE CLI confidential handler and uses its returned report to drive Solidity settlement in a local test treasury. The result pane shows the proposed payment, transferred tokens, wallet mismatch and balance change. Download the current run's actual CRE log and report directly from the result.

For a denial, **Use vendor record & retry** explicitly corrects the proposal on the server and launches another CRE execution. The combined trace preserves both attempts. No model output can define the private policy or authorize its own payment.

This is live CLI simulation, not deployed TEE attestation. Contracts run in fresh server-local EVMs; no network payment is sent. [Live architecture and operational bounds](docs/LIVE-CRE.md).

## Demonstrated result

We gave a live Llama model a clean $2,400 invoice and a version containing malicious remittance instructions. Despite a system prompt identifying invoices as untrusted data, the captured malicious response chose the attacker wallet. Velum denied that proposal because it disagreed with the separately stored canonical recipient.

The actual captured proposals then passed through the **real CRE CLI confidential-handler simulation** and **compiled Solidity in a local EVM**:

| Captured scenario | CRE decision | Actual local contract result |
|---|---|---|
| Clean invoice → live model proposes approved wallet | Approve | Transfers 2,400 synthetic tokens; treasury 10,000 → 7,600 |
| Malicious invoice → live model proposes attacker wallet | Deny | Settlement reverts; treasury remains 10,000 |
| Explicitly injected compromised proposal, no model call | Deny | Settlement reverts; treasury remains 10,000 |

Each scenario uses an independent treasury. These are reproducible fixture outcomes, not a measured prompt-injection detection rate. The live model may resist on another run; the UI reports that honestly. [Full evidence](evidence/agent.json) · [Actual CRE logs](evidence/cre-agent.log)

## Why Chainlink Confidential Workflows

Approval limits, purchase-order terms and remaining budget should not have to be disclosed to a payment agent or encoded publicly onchain. `workflow/batch-main.ts` retrieves the accounting credential and source bundle **inside `handlerInTee`**, checks the proposed payment against source truth, and releases a report containing only the batch ID, ordered payment manifest and request-bound decisions.

`BatchTreasury` checks forwarder/workflow identity, exact commitments, order, completeness, expiry and replay state. An accepted report can authorize only the registered payment. Settlement consumes authorization and transfers tokens atomically; a failed transfer restores approval.

```mermaid
flowchart LR
  I[Untrusted invoice] --> A[AI proposes recipient and amount]
  A --> P
  S[Separate trusted accounting source] --> P
  subgraph C[CRE confidential handler]
    P[Canonical invoice and private policy checks]
  end
  P --> R[Report bound to exact payment]
  R --> T[Treasury verifies and settles]
```

## Evidence boundaries

| Surface | What runs | What it does not prove |
|---|---|---|
| Live payment console | Actual Workers AI inference → authenticated CRE CLI job → returned report → compiled Solidity | CLI simulator, mock identity, fresh VM-local treasury; no TEE attestation or network payment |
| Agent evidence runner | Captured model output → real CRE CLI simulation → actual local EVM settlement attempt | No deployed enclave, DON signature verification or testnet transaction |
| Existing Sepolia batch | Actual CRE CLI broadcast and two successful test-token payments totaling 5,800 | Separate batch fixture; mock forwarder and owner-pinned report adapter, not production oracle authentication |
| Browser contract lab | Actual Solidity bytecode executes for nine attack/control cases | Local policy evaluation and mock identity |
| Persistent payment desk | SQLite reservations, stale-review rejection, idempotent retry, duplicate checks, finalized Sepolia reconciliation | Synthetic accounting, separate from agent preview runs |

The intended confidential handler keeps vendor IDs, invoice/PO references, caps, budget and reasons out of the report. Settlement exposes recipients, amounts and token. The model sees the synthetic invoice but does not receive private policy. The simulator is not an attested enclave. A compromised trusted source or an agent with another unrestricted spending route remains outside this protection.

## Reproduce

Node 22+, Bun 1.4.2; CRE CLI 1.33.0+ and `cre login` for simulation. SDK 1.18.0 is pinned.

```sh
bun install --frozen-lockfile
bun run types
bun run typecheck
bun test
bun run test:contract
bun run test:adapter

# Capture two live model outputs and one explicitly injected proposal.
bun run capture:agent
# Execute those exact proposals through CRE and fresh local treasuries.
bun run test:agent
```

If VM DNS is unavailable, use `VELUM_TEST_IP=104.21.32.18 bun run capture:agent`. TLS still verifies `velum.aethe.me`. Captures are written to ignored `artifacts/`; the runner publishes evidence only after all checks pass. Model calls are capped globally at 50/day and one every five seconds. No funded wallet is required for the local EVM runner.

```sh
# Deployed browser checks (requires Playwright Chromium)
bun run test:agent-browser
bun run test:ledger-browser
# Original batch integration and browser contract artifact reproduction
bun run test:e2e
bun run build:lab
bun run test:lab
```

`bun run dev` serves local static pages and synthetic policy previews at `http://127.0.0.1:8787`; live inference and persistent ledgers require the deployed Worker bindings. `bun run test:browser` covers the policy reference examples locally; set `VELUM_TEST_URL=https://velum.aethe.me` to test deployment. Browser evidence captures are regenerated by the corresponding scripts.

## Project map

- [Agent authority boundary, reproduction and limitations](docs/AGENT-BOUNDARY.md)
- [Confidential batch workflow](workflow/batch-main.ts), [policy](src/policy.ts), [agent proposal validation](src/agent.ts)
- [Treasury contract](contracts/BatchTreasury.sol), [nine-case contract lab](docs/CONTRACT-LAB.md)
- [Persistent accounting lifecycle](docs/ACCOUNTING.md), [Sepolia reproduction](docs/SEPOLIA.md)
- [Deployment](docs/DEPLOYMENT.md), [CRE access status](docs/CRE-ACCESS.md)
- [Three-minute human demo script](docs/DEMO-SCRIPT.md), [judge questions](docs/JUDGE-QA.md)

Production still requires an authenticated accounting connector, exclusive reservation/reconciliation across agent runs, governed policy updates, deployed confidential-workflow access and a registered production forwarder identity. Test tokens are synthetic; the prototype is unaudited. The team has not yet completed customer validation or a human-narrated submission video. AI assistance is disclosed in the submission draft.


## Site structure

The shared navigation contains Payments, Accounting, Controls and Evidence. Accounting is the persistent workspace; recorded CLI and Sepolia results live on the Evidence page. Earlier batch/single-invoice fixtures are retained at `/examples.html`, under the evidence page's technical references.

`public/site.css` defines the shared colors, type, layout and controls. `bun run build:site` generates every page's header and footer from one source; CI checks the committed output for drift. `bun run test:site` checks navigation, active states, mobile layouts, evidence rendering and browser errors across all four product pages.

The primary review console is a compact three-pane interface: invoice inputs, source document and decision. The current execution path is documented in `docs/LIVE-CRE.md`; earlier browser-only execution records remain historical fixtures.
