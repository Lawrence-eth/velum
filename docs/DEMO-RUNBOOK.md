# Work-order demo runbook

Open https://velum.aethe.me in a fresh browser context. Confirm the CRE runner is active: `systemctl --user is-active velum-cre-runner`. A workspace already marked paid should remain paid; use it to demonstrate persistence and duplicate rejection.

Start with **Earlier revision**, run the review, show the held result, then use **Use accepted revision & retry**. Reload after payment and check duplicate protection. The two GitHub references are live provider records; the configured terms and acceptance are synthetic.

If CRE or GitHub is unavailable, the UI must retain an uncertain reservation and withhold successful payment claims. Use **Resume the saved job** to retry the original identity if available; it cannot create a second work payment. Inspect runner logs and the protected journal if recovery remains unsuccessful. Do not manually mark a workspace paid, erase its history, or free a reservation while its outcome is uncertain. Completed journal entries are redelivered to the backend until acknowledged.

Recorded evidence is at `/work-browser.json` and `/work-order-execution.json`. Identify it as recorded if used during an outage. The separate live invoice-agent experiment is `/invoice.html`; its attempts have independent treasuries and are not the work-order lifecycle. Original Sepolia receipts are a separate simulation-adapter batch.

The new work-order recorder is `scripts/record-work-demo.mjs`. Its output is silent and requires human narration. Review `DEMO-SCRIPT.md`, verify the final video is 2–4 minutes and at least 720p, then use `SUBMISSION.md` as the draft. No submission, customer interview or human narration is performed by these scripts.
