# Recording handoff

The scripted screen take is silent source footage, not a finished submission video.
The human-narrated recording is still required. `scripts/record-demo.mjs` records
1440×900 screen footage and saves timestamped scene cues under `artifacts/`.

Reproduce with:

```sh
node --no-addons scripts/record-demo.mjs
```

On the current VM, use `VELUM_TEST_IP=104.21.32.18` if DNS fails. This preserves TLS
hostname verification. The recorder creates its own synthetic accounting workspace,
reads finalized Sepolia receipts, and reserves preview records. It does not send
chain transactions or expose a wallet key.

Use `docs/DEMO-SCRIPT.md` as the narration draft. Explain the simulator, mock adapter,
and public payment fields accurately. Record your voice at a normal pace. Align it
with the scene cues or record a fresh screen take while speaking; do not use an AI
voice or label the silent take as submission-ready. Remove long network waits with
cuts rather than speeding up playback. Verify 2–4 minutes and at least 720p.

Human review and actual customer findings should guide your final wording. Only add
an interview statement after the interview has happened and publication is permitted.
