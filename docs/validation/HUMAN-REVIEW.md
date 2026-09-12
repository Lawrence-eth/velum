# Lawrence's product review

Status: proposed review tasks, not a claim that they have been completed.
ETHGlobal requires meaningful team involvement and transparent AI attribution.
This document helps record actual decisions; checking boxes alone is not proof of eligibility.

## Decisions to make yourself
- Who would you first build this for, based on your own experience or interview?
- Should an invoice reserve budget at review, approval, or transaction submission? Why?
- If a run is underfunded, should order determine which invoice gets paid? What alternative would you choose?
- Who may change an approved contractor wallet, and what review is needed?
- Which details must stay private, and from whom?

## Agent gate review to perform first
1. Open https://velum.aethe.me and predict the clean invoice proposal, then run the live model.
2. Read the malicious footer before running it. Record the actual selected wallet; do not assume injection succeeds.
3. Use the explicitly injected proposal. Explain why the gate rejects it even if the model resists the footer.
4. Inspect the separate source record. Explain who is authorized to update a contractor wallet and why invoice text alone is insufficient.
5. Read the recorded agent evidence. Distinguish live browser preview, CRE CLI simulation, local EVM settlement and the separate Sepolia batch.
6. In the contract lab, predict the failed-transfer result before running it. Explain why approval remains available after a revert.

Record a product decision from this review: should a legitimate wallet-change request be rejected, held for a second approver, or verified through an existing vendor channel? Explain which real workflow informed your answer.

## Supporting accounting review to perform
1. Import the CSV and predict the five decisions before clicking reserve. Explain every held row.
2. Reload and resubmit it. Explain why the available budget stays reduced.
3. Release a preview run. Correct NS-103's wallet and predict its next decision.
4. In a separate empty workspace load Sepolia reservations and reconcile them.
5. Resubmit NS-101 after reconciliation. Explain why a fresh request ID is insufficient.
6. Read the public report and identify which information is still visible through chain transactions.

Record actual date, expected behavior, observed behavior, bugs found, and your changes
below. Any unperformed step stays unperformed. Make the final product decisions and
human narration your own rather than representing AI drafts as independent work.

## Actual notes
Awaiting Lawrence's review.

## Fast handoff

Start at https://velum.aethe.me. Spend 15–20 minutes on the agent gate tasks
above, then send your actual observations and answers to the product decisions.
If a treasury operator is available, use INTERVIEW.md for a separate conversation.
Neither a completed worksheet nor an interview by itself guarantees prize eligibility.
