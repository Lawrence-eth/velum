# Guided payment recording

The current recorder follows one payment journey: suspicious invoice → live model proposal → actual local contract result → explicit verified correction → recorded Chainlink evidence. It does not require a tour through every product page.

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

The interactive payment attempts execute real Solidity locally with fresh test treasuries. They do not send network transactions, call CRE, or update persistent accounting. The linked CLI simulation and Sepolia receipts are separate recorded evidence. Preserve those distinctions in narration.
