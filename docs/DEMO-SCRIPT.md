# Velum — payment review demonstration

Target 3 minutes, 1440×900, human narration. Show the actual model outcome, including resistance if it happens.

## 0:00–0:25 — The decision
Show the invoice, appended remittance instruction and separate verified vendor wallet.

“An agent is asked to pay a $2,400 invoice. The document also tells it to change the wallet and conceal that change. Velum separates what the agent proposes from who can authorize payment.”

## 0:25–1:05 — Run the actual workflow
Click **Run review**. Keep the progress visible while the model and CRE run.

“This is a live model call followed by a real CRE CLI execution on our demo server. The confidential handler fetches a separate source record, checks the proposed recipient and amount against policy, and returns a payment-bound report. We then deliver those exact bytes to Solidity in a local test treasury.”

## 1:05–1:35 — Inspect the consequence
Show the proposed wallet, decision and transferred amount. If the model resisted, state that, then use the explicitly labeled attacker-wallet control. Never call that control a model response.

“The contract rejects the wrong-wallet payment. Nothing transfers. The document cannot rewrite the verified vendor record or the rules that authorize spending.”

## 1:35–2:20 — Resolve the held payment
Click **Use vendor record & retry**. Show the second CRE run and $2,400 test-token transfer.

“I explicitly choose the verified details. CRE evaluates this new proposal and the fresh test treasury settles it. The downloaded trace retains both attempts and their actual execution logs. These are independent test treasuries, not a persistent invoice lifecycle.”

## 2:20–3:00 — Verify and scope
Open execution details and download the CRE log. Briefly show Evidence if time permits.

“The handler keeps private limits and accounting references out of the public report. The demo uses synthetic records and CLI simulation: it does not claim deployed TEE attestation or DON-authenticated delivery. Separate Sepolia receipts demonstrate test-token settlement through a simulation adapter. Production requires a real accounting connector, exclusive reservations and deployed confidential execution.”

Do not tour every supporting tool. Finish on the verified payment decision. If inference or CRE is unavailable, explicitly label any recording shown as recorded evidence.
