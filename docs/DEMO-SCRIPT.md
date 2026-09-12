# Velum demo — target 3 minutes 20 seconds

Human narration required. This is a recording script, not a completed submission video.
Record at 1080p if possible (minimum 720p). Keep the final duration between 2 and 4
minutes. Do not use an AI voice, speed up playback, or imply the browser preview
triggers CRE. Close notifications and keep keys, terminals with credentials, and
personal information outside the recording. Allow a first rehearsal before recording.

## Prepare the browser
Open https://velum.aethe.me. Download the sample CSV. Open the Sepolia report and
payment explorer pages in background tabs. In an empty ledger workspace load recorded
Sepolia reservations but leave reconciliation for the demonstration. Keep this script
on a separate screen. For a fresh retry use “Start a separate workspace”; this creates
a separate ledger and does not erase the previous one.

## 0:00–0:25 — The problem
Show the five-invoice batch and click Evaluate batch.

“These two invoices each pass a five-thousand-dollar approval limit. Together, they
exceed a six-thousand-dollar purchase order. A resubmitted invoice can make it worse.
Velum checks the whole contractor payment run while keeping the team's budget and
approval rules out of the public report.”

## 0:25–0:55 — The decision
Point to the first two invoices, the changed wallet, and the duplicate. Switch the
existing disclosure inspector between operator and public report.

“The first invoice reserves budget. The next one no longer fits. A changed payment
wallet is held, and the same invoice submitted under another request is still a
duplicate. Only two payments are approved: fifty-eight hundred synthetic dollars.
The operator can inspect detailed reasons. The public report contains decisions and
payment commitments, not the invoice references or private budget.”

## 0:55–1:25 — Why CRE
Scroll to the privacy matrix and architecture.

“The core check runs in a Chainlink CRE confidential handler. It fetches an API
credential and accounting snapshot inside that handler, evaluates the batch, and
releases the minimal report for delivery. Our recorded execution uses the CRE CLI
simulator. That proves the integration, but it is not a deployed hardware enclave.
Recipients and payment amounts are public onchain; Velum protects the private
approval inputs, not every fact about a payment.”

## 1:25–2:05 — Actual payment evidence
Show the Sepolia panel and open the CRE report delivery and one payment link.

“We also broadcast the report to Sepolia and verified two test-token transfers.
The treasury validates the ordered payment manifest and spends only approved
requests. A failed transfer restores the authorization. For simulation, a separate
adapter accepts an exact report hash authorized by the owner. This mock-forwarder
path demonstrates settlement; it does not verify DON signatures.”

## 2:05–2:55 — Accounting remembers
In the prepared ledger workspace click Verify Sepolia payments & reconcile. Show
Paid states. Reload, load sample invoices, and click Evaluate & reserve this run.

“A payment run also needs memory. This ledger keeps budget reservations across
runs and reloads. Reconciliation reads finalized Sepolia events and checks the
request, token, recipient, and amount before marking an invoice paid. Now I import
the same invoice again. Even with a fresh request ID, it stays blocked because
its invoice identity was already paid. This browser action changes the synthetic
accounting ledger; it does not send another transaction.”

## 2:55–3:20 — Close
Show the source and evidence links.

“Velum combines confidential batch decisions, exact payment authorization, and
persistent reconciliation. You can import a synthetic CSV and correct held rows.
The prototype still needs a real accounting-provider integration and a live
confidential deployment. The code, simulation logs, tests, and Sepolia receipts
are public so you can inspect what actually ran.”

If a real customer interview has happened, replace one closing sentence with a
specific, consented finding and the decision it changed. Do not invent validation.

## Recording checklist
- Human voice; 2–4 minutes; at least 720p; normal playback speed.
- Browser preview, actual recorded CRE run, and Sepolia evidence clearly distinguished.
- Submission description matches the final implementation and includes AI disclosure.
- Video link opens in a private browser without requesting access.
- Select Chainlink in the ETHGlobal submission dashboard before September 13, 16:00 UTC.
