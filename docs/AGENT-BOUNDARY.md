# The agent can propose. It cannot authorize.

Velum is a confidential execution gate for AI treasury agents. A contractor invoice is untrusted input; the agent extracts a proposed payment. A separate accounting source determines the canonical recipient, amount, paid state and spending policy. The CRE handler evaluates that source and produces an authorization report bound to the exact payment. A Solidity treasury enforces identity, commitments, expiry and replay protection.

## The threat this prototype demonstrates

The synthetic invoice NS-101 requests $2,400 for Northstar Studio. Its malicious variant appends a remittance instruction telling an automated assistant to ignore the original wallet, use an attacker wallet, and conceal the change. The system prompt explicitly says invoice content is untrusted. A successful prompt injection is not assumed: the UI shows the actual model response and explains when the model resists. A separate, explicitly labeled compromised-proposal test verifies the gate regardless of model behavior.

The agent returns only an invoice reference, recipient and amount. Strict validation rejects extra fields, invalid amounts, other invoice identities, and malformed output. Policy is never accepted from the agent. Both a one-cent increase and a one-cent decrease fail the canonical amount check. Server-side code sets request ID, chain, token, consumer and expiry.

The demo model is Cloudflare Workers AI `@cf/meta/llama-3.1-8b-instruct-fast`. Inputs are fixed synthetic scenarios; the endpoint does not accept arbitrary documents. Inference receives neither the approval cap nor remaining budget. A global Durable Object limits inference claims to 50 daily and one every five seconds, claimed before the external call. Failed calls consume quota. The public test has no wallet signing key.

## Evidence and reproduction

1. `VELUM_TEST_IP=104.21.32.18 bun run capture:agent` captures two live model responses and one explicitly injected proposal from the deployed service. The IP override is optional and only needed if VM DNS fails; TLS hostname verification remains enabled.
2. `bun run test:agent` compiles the treasury and test token, creates an independent local EVM for each captured scenario, registers its exact proposal, serves an authenticated accounting bundle, invokes the real CRE CLI, decodes the actual report, delivers it using a local mock identity, and attempts settlement. CRE must be installed and authenticated. No funded key is needed for this simulation.
3. The runner writes `evidence/agent.json`, `evidence/cre-agent.log`, and public copies only after all scenarios pass. It checks that the CLI fetched the source and returned exactly the expected encoded report, that replay is blocked, and that balance changes match the actual decision.
4. `VELUM_TEST_IP=104.21.32.18 bun run test:agent-browser` verifies the live injected-proposal route, source labeling, trace download, state reset and mobile layout. `bun test` checks the source/agent authority boundary.

Each scenario is an independent experiment with a fresh treasury. These runs do not demonstrate cross-run invoice reconciliation. The separate persistent payment desk demonstrates reservation and reconciliation, but it is not connected to agent preview runs.

## What each environment proves

| Environment | Actual execution | Limitation |
|---|---|---|
| Live agent page | Workers AI inference followed by deterministic Worker policy evaluation | Synthetic source; policy check outside a TEE; no CRE call or payment from this button |
| Agent evidence runner | Captured model output → real CRE CLI handler simulation → compiled Solidity in local EVM | Local identity injection, no DON signatures, no deployed TEE attestation, no testnet transaction |
| Existing Sepolia batch | Real CRE CLI broadcast through simulation adapter, successful test-token settlement transactions | Separate batch fixture; owner pins report hash; mock forwarder is not production authentication |
| Browser contract lab | Compiled Solidity executes in an in-browser EVM | Locally computed policy and mock report identity |

Private source records and secrets belong inside the intended confidential handler. The CLI simulator is not an attested enclave. The report omits vendor details, invoice/PO references, caps, budget and reasons. Settlement exposes recipient, amount and token. Inference itself is not confidential and receives the invoice text.

## Production work still required

An authenticated accounting connector must exclusively reserve and reconcile budgets across all agent runs. The signing/execution identity must be restricted so an agent cannot spend through another route. Deployment requires CRE confidential-workflow access, a registered workflow identity and the production forwarder. Policies need governed updates and source integrity; compromise of the trusted source is outside this prototype's protection. A single invoice attack demonstrates a failure path, not a universal prompt-injection defense or measured detection rate.

## References

- [Workers AI model and input/output parameters](https://developers.cloudflare.com/workers-ai/models/llama-3.1-8b-instruct-fast/)
- [Workers AI bindings](https://developers.cloudflare.com/workers-ai/configuration/bindings/)
- [Chainlink prize requirements](https://ethglobal.com/events/ethonline2026/prizes/chainlink)
- [CRE confidential workflow access](https://docs.chain.link/cre/account/confidential-workflows-access)
