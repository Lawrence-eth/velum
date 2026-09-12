# ETHOnline submission draft — not submitted

## Title
Velum

## Short description
A confidential execution gate for AI treasury agents. An agent proposes a payment; private policy decides whether the treasury may execute it.

## Description
An invoice can tell an AI payment agent to ignore the approved wallet and send funds somewhere else. Better prompting helps, but the agent should never be the final authority over spending.

Velum separates intent from authorization. A live model extracts a proposed payment from an untrusted contractor invoice. A Chainlink CRE confidential handler fetches the canonical invoice and private spending policy from a separate authenticated source, then generates a report bound to the exact recipient, amount, token, chain, consumer and expiry. A Solidity treasury permits settlement only for approved, unexpired, unused requests.

In our recorded experiment, a live Llama model extracted the correct wallet from a clean $2,400 invoice but selected an attacker wallet after reading malicious remittance instructions, despite being told that invoices were untrusted. The actual proposals then ran through the CRE CLI and compiled Solidity in independent local EVMs. The clean proposal transferred 2,400 test tokens. The malicious proposal was denied and its settlement reverted, leaving the treasury balance unchanged. A separate, explicitly injected compromised proposal was also blocked. The live demo reports model resistance honestly; these examples do not claim universal prompt-injection prevention.

Supporting demonstrations include a nine-case browser EVM contract lab, persistent synthetic accounting with shared-budget reservations and duplicate protection, and recorded Sepolia test-token settlement through the CRE simulation forwarder.

## How it is made
Cloudflare Workers AI supplies actual `@cf/meta/llama-3.1-8b-instruct-fast` inference. Strict TypeScript/Zod validation accepts only the expected invoice ID, recipient and decimal amount. The model cannot define its own policy, canonical source record, paid status, token or execution domain. A global Durable Object bounds inference usage.

Chainlink CRE SDK 1.18.0 provides `handlerInTee`, targeting AWS Nitro in us-west-2. Secret retrieval and authenticated HTTP happen inside the handler. Deterministic policy checks the source invoice, recipient, amount, approval limit, remaining PO, duplicates, snapshot freshness and expiry. `usingTheDons` produces one ABI-encoded report containing the batch ID, ordered manifest and exact request decisions. Vendor identifiers, invoice/PO references, private caps, budgets and rejection reasons are not released into that report.

Solidity `BatchTreasury` authenticates the configured forwarder/workflow identity, checks report completeness and commitments, blocks replay, and atomically consumes authorization with ERC-20 transfer. The browser contract lab executes real bytecode using EthereumJS. SQLite-backed Durable Objects support the separate accounting desk's atomic reservations, idempotent retry and finalized Sepolia reconciliation. Vanilla JavaScript and CSS provide the responsive interface.

## Chainlink integration and evidence
Target: **Best Confidential Workflow**. The confidential handler is integral to the authorization design: the agent receives neither private approval caps nor budget; the workflow evaluates that policy and authorizes an exact payment.

The recorded agent evidence contains two actual live-model captures plus a labeled injected control, three real CRE CLI simulations and 21 local contract checks. The returned report bytes are delivered directly to compiled Solidity. Separate original batch evidence records a CRE CLI Sepolia broadcast and two successful test-token transfers totaling 5,800.

The published prize criteria accept CLI simulation evidence. We have not deployed an attested TEE workflow. Local EVM runs supply mock workflow metadata and do not verify DON signatures. The Sepolia simulation adapter requires the owner to pin an exact report hash and supplies synthetic metadata; it is not production oracle authentication. The homepage button runs live inference followed by ordinary Worker policy evaluation, and does not trigger CRE or payments.

## Links
- Demo: https://velum.aethe.me
- Source: https://github.com/Lawrence-eth/velum
- Agent → CRE → contract evidence: https://velum.aethe.me/agent-evidence.json
- Actual agent CRE logs: https://velum.aethe.me/logs/cre-agent.log
- Interactive Solidity attack lab: https://velum.aethe.me/lab.html
- Sepolia receipts: https://velum.aethe.me/sepolia-evidence.json
- Persistent accounting → CRE evidence: https://velum.aethe.me/ledger-cre-evidence.json
- Video: PENDING — 2–4 minutes, human narration, at least 720p.

## Limitations
Fixed synthetic invoice scenarios and private policy fixtures. Live inference is not confidential. Agent previews do not reserve budget or execute payments, and the persistent accounting desk is a separate demonstration. Production needs an authenticated accounting connector with exclusive reservation and reconciliation, governed policy updates, deployed confidential-workflow access and a production forwarder identity. Trusted-source compromise and alternative agent spending routes are outside the demonstrated protection. No real assets, audit, customer validation or measured attack-detection rate is claimed.

## AI and prior work
Codex generated the implementation, tests, UI and drafts, including the agent-gate direction. Lawrence selected the Chainlink focus, provided and authenticated the development environment and CRE account, chose Velum and the artistic direction, reviewed iterations and authorized the pivot. Public documentation informed API usage. No prior private project code was reused. Human customer validation and final narration remain pending; do not embellish the contribution record.

## Before submitting
Confirm the registered Start Fresh/Continuity track, review the prototype and disclosures, document meaningful actual team contribution, record the human-narrated demo, select Chainlink in the dashboard and submit before **September 13, 2026, 16:00 UTC**. No dashboard submission has been performed.

[Rules](https://ethglobal.com/events/ethonline2026/info/details) · [Chainlink prize](https://ethglobal.com/events/ethonline2026/prizes/chainlink)
