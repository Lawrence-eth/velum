# Velum work-order walkthrough

Target approximately three minutes, human narration, 1440×900. Use a fresh browser context to create an independent demo workspace; do not reset an existing paid workspace to manufacture a second payment.

## 0:00–0:25 — Agreed work

“This software contractor is owed $2,400 for one accepted revision. The wallet and amount are correct. But the submitted evidence is a successful build for an earlier revision. A transaction allowlist cannot decide whether this is the work we agreed to pay for.”

Show the accepted revision and the submitted earlier revision. Both GitHub run links are real. Acceptance and commercial terms are synthetic and configured by the demo team.

## 0:25–1:05 — Independent verification

Click **Verify & release test payment**.

“Velum reserves the work order and budget. The actual Chainlink CRE confidential handler retrieves the source record and GitHub evidence using separate credentials. It checks the exact revision, repository, workflow, branch, trigger and accepted workflow definition, alongside payment policy.”

Show **Payment held** and zero transferred. Describe it as a revision mismatch, not a failed build or a model-generated attack.

## 1:05–1:55 — Resolve and pay

Click **Use accepted revision & retry** and wait for the actual result.

“The accepted revision satisfies the configured record. CRE returns a report bound to this work reference and exact payment. Its bytes drive Solidity, which releases 2,400 test tokens. The prior denial and successful payment remain in this workspace’s execution journal.”

## 1:55–2:30 — Persistence and duplicate protection

Show payment history, reload, then click **Check duplicate protection**.

“A new request cannot pay the same work order again. Reservations and paid history persist in SQLite; local contract operations persist in a protected journal. Unknown execution results stay reserved rather than opening a second payment path.”

## 2:30–3:10 — Evidence and scope

Show the work-order execution log or Evidence page.

“This is real CLI simulation with live public GitHub evidence and journal-backed local Solidity. Commercial terms are synthetic. The public authorization omits those terms; payment amount and recipient are not hidden. Forwarder identity is mocked, and we do not claim deployed TEE attestation or a network payment. A successful build is evidence for a configured revision, not proof of software quality.”

Finish on the paid history. The separate invoice-agent and Sepolia experiments support the project but do not need a full tour.
