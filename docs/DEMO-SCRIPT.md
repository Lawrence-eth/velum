# Velum demo — approximately 3 minutes

Record at 1280×720 or above with your own voice. Use your own words and only describe contributions and customer insights that actually occurred.

## 0:00–0:25 — open with the failure
“Two invoices: $4,200 and $3,800. Both are below a $5,000 approval limit. But together they exceed the $6,000 purchase order. An invoice-by-invoice check misses that. Velum evaluates the whole payment run using private accounting rules.”

## 0:25–1:05 — demonstrate the difference
Open https://velum.aethe.me, scroll to the batch workspace and click Evaluate batch. Show the first invoice approved, the second held against the shared budget, a changed recipient rejected, and a duplicate reference caught even with another request ID. Explain that the synthetic example approves $5,800 versus $13,800 under independent checks. Change the PO budget to $10,000 and rerun: the legitimate second invoice passes, but the duplicate and changed wallet stay held.

Say explicitly that this interactive panel runs normal server-side preview code. It does not trigger CRE or send payments.

## 1:05–1:35 — make privacy concrete
Toggle Operator view → Public report. Point out that invoice references, PO details, budgets and rejection reasons disappear. The public report contains commitments and decisions. Amounts and recipients are still visible when used for payment; Velum is not a private-transfer protocol.

## 1:35–2:20 — show actual execution
Scroll to the execution evidence. Open the actual CRE batch log and point to the TEE-handler simulation notice and report output. Explain that the simulator is not a hardware enclave. Then show the local treasury balance moving from 20,000 to 14,200 synthetic USD.

“This receipt comes from one reproducible script: it runs CRE, decodes the actual returned bytes and delivers them through a mock forwarder into local Solidity execution. It does not verify Chainlink network signatures or broadcast a network transaction.”

Optionally run `bun run test:e2e` beforehand and use that fresh log. Do not wait through compilation in the video.

## 2:20–2:45 — show the difficult checks
Show the end-to-end check list: reordered/omitted reports rejected, replay rejected, a failed token transfer rolls back approval consumption, and cancellation prevents later settlement. Explain that one active batch is allowed and within-batch reservations are enforced. A production accounting source still needs exclusive reservations and reconciliation across batches.

## 2:45–3:10 — contribution and next integration
Explain why you chose this customer, describe your actual product/testing/design contribution and disclose AI assistance. Name the accounting or treasury integration you would build next. Do not claim that a customer interview, live deployment or production integration has happened unless it has.

Optional testnet evidence: open the Sepolia panel and its CRE delivery and two payment explorer links. Explain: “These are actual Sepolia transactions using test tokens. The simulator uses a public mock forwarder, so our test adapter accepts only an owner-pinned report hash. This proves the settlement path; it does not establish DON signatures or deployed TEE execution.”
