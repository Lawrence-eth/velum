# Guided payment recording

The current recorder follows one payment journey: suspicious invoice → live model proposal → live CRE CLI → server-local contract result → explicit verified correction → execution evidence. It does not require a tour through every product page.

```sh
VELUM_TEST_IP=104.21.32.18 node --no-addons scripts/record-demo.mjs
bash scripts/finish-demo-recording.sh
```

The IP override is optional and preserves TLS hostname verification. The recorder makes a real model call. If the model resists the instruction, the take explicitly introduces the injected control before demonstrating correction. If live inference is unavailable, the recorder stops rather than substituting a canned answer.

Artifacts:
- `artifacts/velum-guided-demo-footage.webm`: silent 1440×900 screen take.
- `artifacts/velum-guided-demo-footage.mp4`: H.264 export.
- `artifacts/guided-demo-cues.json`: actual scene timestamps.

Add your own human narration using `DEMO-SCRIPT.md`, review the execution claims, and verify 2–4 minutes and at least 720p before submission. Silent footage is not a finished submission video. Earlier `velum-demo-footage.*` and `velum-agent-demo-footage.*` files show superseded flows.

The interactive attempts invoke the actual CRE CLI and execute its returned report in server-local Solidity with fresh test treasuries. They do not send network transactions or update persistent accounting. The separate Sepolia receipts use a simulation adapter. No deployed TEE attestation is claimed. Regenerate footage after interface changes; existing recordings may show an earlier version.
