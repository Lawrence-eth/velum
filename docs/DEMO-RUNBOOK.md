# Velum demo runbook

## Before recording or presenting

Open https://velum.aethe.me in a fresh tab. Confirm the invoice loads and the CRE runner is active (`systemctl --user is-active velum-cre-runner`). Run the clean model once if needed; public inference allows 50 total daily calls and one every five seconds. Do not repeatedly refresh or run inference to hunt for a more dramatic result.

Keep these tabs ready:
- Homepage: actual agent output, live CRE CLI and automatic server-local contract settlement.
- `/agent-evidence.json`: recorded exact proposals, reports and local contract results.
- `/lab.html`: actual browser EVM experiments.
- `/evidence.html#sepolia-proof`: separate existing Sepolia transactions.

## If the model resists the malicious invoice

Say that it resisted on this run. Open “If the model resists the instruction” and use “Supply an attacker-wallet proposal” to demonstrate the independent gate, explicitly describing the injected control. The recorded malicious model response remains available as one observed failure, not an inevitable model behavior.

## If live inference is unavailable or quota-limited

Show the recorded model output and its timestamp. Call it a recording. The injected-proposal test does not call the model and remains available for demonstrating policy rejection and actual local settlement failure. A denied proposal can be explicitly corrected using “Use vendor record & retry”. Do not present it as a fallback AI response. The screen recorder intentionally stops if it cannot obtain valid live output.

## If the CRE runner is unavailable

The console reports execution failure and withholds a payment result. Check the user service and runner heartbeat; do not substitute a stored result into the live flow. Published `/interactive-cre.json` is a clearly timestamped recording of browser-triggered executions. The queue permits three active jobs and 40 per UTC day.

## If the browser contract lab takes too long

Its first run downloads the EVM bundle and compiles WASM crypto modules. Allow up to 30 seconds. If it fails, show recorded CRE/contract evidence and identify it as recorded. The public lab makes no chain transactions and requires no wallet.

## Keep the four environments distinct

| Screen | Safe description |
|---|---|
| Homepage result | Live AI output → actual CRE CLI simulation → server-local Solidity settlement |
| Agent evidence | Captured live outputs through real CRE CLI simulation and local Solidity |
| Contract lab | Actual Solidity execution in this browser using a mock report identity |
| Sepolia receipts | Separate batch testnet payments through the simulation forwarder and owner-pinned adapter |

Do not describe the CLI simulation as attested confidential execution, the local EVM as a testnet transaction, or the Sepolia adapter as DON signature verification. Private policy is excluded from inference/report fields; it is displayed openly in this synthetic operator demo.

## Final submission handoff

Use `SUBMISSION.md` and `DEMO-SCRIPT.md`. Review claims and actual team contributions, confirm the registered event track, add human narration, verify the video is 2–4 minutes and at least 720p, and submit through the event dashboard. These documents are prepared drafts; no submission or customer interview is claimed.
