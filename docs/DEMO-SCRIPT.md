# Velum — one payment, one story

Target: approximately 3 minutes. Human narration, 1440×900 screen capture. Show actual outcomes and describe each execution environment accurately.

## 0:00–0:20 · A concrete task
Open https://velum.aethe.me. The suspicious invoice is selected by default.

“This agent has one job: pay a $2,400 contractor invoice. But the invoice includes a note telling it to use a different wallet and hide the change. Velum keeps the authority to spend separate from the agent's instructions.”

## 0:20–0:55 · One click through the payment gate
Show the note and click **Run this payment check**. The live model runs, then the actual proposed recipient and amount automatically go through policy checks and compiled Solidity in the browser.

“The model reads the invoice. The gate compares its proposal with the verified accounting record. Then we attempt the payment against the actual treasury contract. This is a local test treasury, so no wallet or real funds are needed.”

If live inference is unavailable, say so and open recorded evidence; do not describe a replay or injected control as live AI output.

## 0:55–1:20 · Show the consequence
Show the result: proposed amount, transferred amount, wallet difference and unchanged balance.

“In our captured runs, the model followed the changed-wallet instruction. The independent policy denied the proposal. The contract rejected settlement: $2,400 requested, zero transferred. The model's output cannot authorize its own payment.”

If this model resists, say it resisted. Open **If the model resists the instruction** and supply the explicitly labeled attacker-wallet proposal. Explain that no model call occurs for this control.

## 1:20–1:50 · Resolve the payment
Click **Use verified details & retry**. Show the verified correction and 2,400 test tokens transferred.

“A legitimate invoice still needs to be paid. I explicitly choose the details from the separate verified record. This is my correction, not a new model response. The same policy now approves the correct payment, and a fresh local test treasury settles it. The trace contains the rejected attempt and the corrected attempt.”

Do not describe these independent local treasuries as a persistent accounting lifecycle or as two transactions on the same deployed treasury.

## 1:50–2:30 · Why Chainlink
Scroll to **The Chainlink connection**, then open the linked agent execution record.

“The model doesn't receive the private approval cap or remaining budget. Our CRE confidential handler retrieves the source credential and private record inside handlerInTee, checks the payment, and releases a report bound to its exact fields. The public report omits invoice references, caps, budget and reasons.”

“These are actual captured model responses passed through the real CRE CLI and compiled Solidity. The valid proposal settled; the malicious one reverted. The browser interaction uses local policy and mock identity; the recorded CLI simulation is separate. We do not claim a deployed attested enclave.”

## 2:30–3:00 · Scope and close
Show the separate Sepolia section briefly if time allows, then return to the agent page.

“Our separate batch integration also has actual test-token settlement receipts on Sepolia through a simulation adapter. Production still needs an authenticated accounting connector, exclusive reservations and deployed confidential execution. The central boundary already works in the demo: an agent can propose a payment, but it cannot write the rules that authorize it.”

No tour of every page is needed. Keep the recording focused on the mistake, enforced result, explicit correction and Chainlink evidence.
