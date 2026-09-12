# Recording handoff

The scripted screen take is silent source footage, not a finished submission video.
The human-narrated recording is still required. `scripts/record-demo.mjs` records
1440×900 screen footage and saves timestamped scene cues under `artifacts/`.

Reproduce with:

```sh
node --no-addons scripts/record-demo.mjs
```

On the current VM, use `VELUM_TEST_IP=104.21.32.18` if DNS fails. This preserves TLS
hostname verification. The recorder makes two real model calls, shows their actual outcomes, runs two
local Solidity experiments, and opens the separate recorded Sepolia receipts.
It does not send chain transactions, reserve accounting records or expose a wallet key.
If the malicious invoice is resisted, it adds an explicitly labeled injected control.
An unavailable live model stops the take rather than substituting a canned response.

Use `docs/DEMO-SCRIPT.md` as the narration draft. Explain the simulator, mock adapter,
and public payment fields accurately. Record your voice at a normal pace. Align it
with the scene cues or record a fresh screen take while speaking; do not use an AI
voice or label the silent take as submission-ready. Remove long network waits with
cuts rather than speeding up playback. Verify 2–4 minutes and at least 720p.

Human review and actual customer findings should guide your final wording. Only add
an interview statement after the interview has happened and publication is permitted.


Files produced:
- `artifacts/velum-agent-demo-footage.webm` — silent screen take.
- `artifacts/velum-agent-demo-footage.mp4` — H.264 conversion after `bash scripts/finish-demo-recording.sh`.
- `artifacts/agent-demo-cues.json` — timestamps and observed malicious-model verdict.

The older `velum-demo-footage.*` files show the previous batch-focused concept and should not be used for the new pitch.


## Recorded agent take — September 12, 2026

Silent take: approximately 3:03, 1440×900. The actual live malicious-invoice call selected the attacker wallet and was denied. The local contract result is visible in the captured frame.

| Time | Screen |
|---|---|
| 0:01 | Opening: agent intent and independent authority |
| 0:18 | Clean synthetic invoice |
| 0:26 | Actual live clean proposal is eligible; preview sends no payment |
| 0:43 | Malicious remittance instruction |
| 0:54 | Actual malicious-invoice model outcome: DENIED · Recipient does not match purchase order |
| 1:14 | Separate source policy and actual model prompt |
| 1:34 | Three captured proposals through real CRE CLI and local Solidity |
| 1:57 | Actual browser EVM rejects changed payment commitment |
| 2:16 | Failed token transfer restores authorization |
| 2:32 | Separate original batch: real Sepolia receipts, mock-forwarder boundary |
| 2:47 | Close: private policy and explicit prototype scope |


The unified-site redesign supersedes the appearance of the earlier recorded take. The recorder now opens the canonical Evidence page for Sepolia receipts. Re-record before producing the final narrated submission so the footage matches the current navigation.
