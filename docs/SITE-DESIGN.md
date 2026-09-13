# Velum payment console

The primary screen is a working payment review, not a marketing landing page. Three panes keep the invoice version and verified vendor record, source document, and execution decision visible together. One action runs the live model and actual CRE CLI; a held payment exposes an explicit correction from the vendor record. The same result contains the exact report and CLI log.

Neutral gray surfaces, IBM Plex Sans and Mono, compact navigation, document typography and restrained decision colors replace oversized slogans and repeated feature cards. At narrow widths the panes stack and controls remain visible. Technical payloads and the explicit adversarial control use disclosures.

| Route | Purpose | Execution |
|---|---|---|
| `/` | Review a proposed payment, hold or release, correct a mismatch | Live model → actual CRE CLI → server-local Solidity |
| `/desk.html` | Reserve synthetic invoices and reconcile receipts | Persistent accounting, separate from payment review |
| `/lab.html` | Exercise treasury enforcement conditions | Browser-local EVM with mock identity |
| `/evidence.html` | Inspect recorded executions and Sepolia receipts | Timestamped evidence |

All routes share navigation, type, background and control styles. `scripts/build-site.mjs` generates the shared static header/footer and CI checks for drift. Accounting storage and existing feature controls remain intact. The primary review uses fresh test treasuries, not the persistent accounting lifecycle; consistent styling does not imply that integration is complete.

Validation covers desktop, tablet and mobile routes, active navigation, internal anchors, overflow, live CRE decisions, correction and trace downloads. No external user study is claimed.
