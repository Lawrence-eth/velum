# Demo script — 3 minutes, human narration

Record at 1280×720 or above. Use your own voice; replace proposed customer/problem statements with what you actually learned and contributed. Do not present synthetic fixtures as real customer data.

## 0:00–0:25 — problem
“Velum is a prototype for teams paying invoices from an onchain treasury. They need spending rules, but vendor details and negotiated limits should not become public. We separate confidential invoice evaluation from a minimal authorization.”

## 0:25–1:15 — show the demo
Open https://velum.aethe.me. Explain that the visible policy is synthetic and the interactive preview is ordinary server execution.
- Evaluate the $2,400 invoice: approved.
- Choose the $7,200 invoice: rejected for exceeding the private $5,000 cap.
- Choose the changed-wallet invoice: rejected despite a valid amount.
- Choose the previously-paid invoice: rejected.
- Return to the first invoice and lower the cap to $2,000: rejected.
Point to the minimal public receipt. Explain that detailed reasons and PO values are omitted from real workflow outputs.

## 1:15–2:10 — actual Chainlink execution
Show `workflow/workflow.ts`: `handlerInTee`, `getSecret`, authenticated `HTTPClient`, `usingTheDons`, and `report`. Show an actual `bun run simulate` run with the local fixture server already running, or the existing unedited execution log and its timestamp. Explain that the simulator is not a real enclave and no production data is used. Show the approval and rejection logs listed in the manifest.

## 2:10–2:40 — receiver and limits
Show `InvoiceGate.sol` and `bun run test:contract`. Explain that the local tests reject forged callers, wrong workflow identity, altered payments, expired reports and replay. State clearly: local EVM only; the receiver does not transfer assets; network deployment and accounting integration are future work.

## 2:40–3:00 — contribution and next step
Describe your actual product/testing/design contribution and AI assistance. End with the intended customer and the next integration you would build, based on your own choice. Do not claim pending work is complete.
