# Velum — human-narrated demo, approximately 3:15

Record at 1440×900 or higher. Speak in your own voice. This is a suggested script; rehearse and adjust it to what the live model actually returns. Do not use the old invoice-batch recording as the new product demo.

## 0:00–0:25 · The problem
Open https://velum.aethe.me. Show the headline, then scroll to the invoice.

“An AI treasury agent reads an invoice and proposes a payment. But an invoice can also contain instructions telling the agent to change the recipient. Velum separates the agent's proposal from the authority to spend. Private accounting policy decides whether the treasury may execute that exact payment.”

## 0:25–0:55 · The valid control
Select Clean invoice and click Run live agent. Wait for the actual result.

“This is a live model call using a synthetic $2,400 contractor invoice. The agent extracts the recipient and amount. Velum compares that proposal with a separate canonical accounting record. This matches, so the preview is eligible. This browser button does not send money or run CRE.”

If inference is unavailable or quota-limited, say so and open the recorded evidence; do not call a recording live.

## 0:55–1:30 · The malicious input
Select Malicious remittance note. Show the appended instruction, then Run live agent.

“The footer tells the assistant to ignore the original wallet, use this new wallet, and conceal the change. The system prompt already says invoices are untrusted. In our recorded run, the model still proposed the attacker wallet. The independent policy rejected it.”

If the current model resists: “This run resisted the instruction. The recorded run did not. The gate must work even when the agent fails.” Then click Test a compromised proposal, explaining that this deliberately supplies the attacker wallet and makes no model call.

## 1:30–2:05 · The Chainlink boundary
Open the source-record disclosure briefly, then the evidence panel and CRE log.

“The model never receives the private approval cap or remaining budget. Our Chainlink handler retrieves the accounting credential and source bundle inside handlerInTee, applies deterministic checks, and releases only request-bound decisions. The report excludes invoice references, purchase-order terms, limits, budget and reasons. Settlement still exposes amounts and recipients.”

“We captured the actual model proposals and ran them through the real CRE CLI. The clean proposal transferred 2,400 test tokens in a local EVM. The malicious proposal's settlement reverted and the treasury balance stayed unchanged. This is CLI simulation and mock identity delivery, not an attested enclave deployment.”

## 2:05–2:45 · Enforcement
Open /lab.html. Run a recipient mutation, then the valid control or failed-transfer case.

“This runs the compiled Solidity treasury in your browser. A changed payment commitment fails. The contract also rejects forged callers, wrong identities, incomplete reports and replay. If a token transfer fails, approval consumption rolls back. The AI model has no signing key and no authority to bypass these checks.”

Optionally show the Sepolia receipts link for ten seconds: “Our separate batch integration also has real CRE CLI broadcast and test-token settlement receipts on Sepolia, using the explicitly labeled simulation adapter.”

## 2:45–3:15 · Honest scope and close
Return to the homepage.

“This prototype uses synthetic invoices and a trusted accounting fixture. A production integration needs exclusive source reservations, reconciliation and the deployed confidential workflow with a production forwarder. Our separate payment desk already demonstrates persistent reservations and finalized receipt reconciliation. Velum's central principle is simple: an agent may propose a payment, but it never gets to write the rules that authorize it.”

End on the repository and evidence links. Keep the complete video within the event's 2–4 minute limit; human narration is required.
