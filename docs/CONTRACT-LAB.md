# Live contract experiment lab

Open `/lab.html`. Each click creates an isolated EthereumJS VM inside a browser
Web Worker, deploys the actual compiled BatchTreasury and TestToken bytecode, funds
the local treasury, and registers a complete five-payment manifest. The lab evaluates
the shared batch policy locally and submits its ABI report with one selected mutation.
It then attempts settlement and reads the treasury's actual token balance and request
status. The UI renders those returned values; it does not select a canned outcome.

## Experiments

| Experiment | Delivery | First payment | What it tests |
|---|---|---|---|
| Valid control | Accepted | 4,200 transferred | Positive control for the fixture |
| Recipient changed | Rejected | None | Exact payment commitment |
| Amount increased by one micro-unit | Rejected | None | Amount binding |
| Decisions reordered | Rejected | None | Ordered manifest |
| One decision omitted | Rejected | None | Complete manifest |
| Wrong workflow ID | Rejected | None | Workflow identity |
| Wrong caller | Rejected | None | Forwarder caller check |
| Report replay | Second report rejected | Original approval pays once | Report replay does not revoke a valid approval |
| Token returns failure | Accepted | None; approval preserved | Settlement rollback |

A fresh VM is used per run. The replay experiment explicitly accepts the first report
before trying the second; it is not evidence that a replay paid twice. The lab settles
the first approved invoice only, while the separate recorded Sepolia evidence covers
both approved payments. All amounts are synthetic test-token units.

## Reproduction and provenance

`bun run build:lab` compiles the Solidity sources using solc 0.8.30, Shanghai EVM,
optimizer enabled with 200 runs, and creates `public/lab-contracts.json`. It includes
SHA-256 source hashes and the compiler version. The same command builds a minified
browser worker from `src/lab-worker.ts`; EthereumJS dependencies are already pinned.
CI rebuilds both artifacts and fails if the checked-in outputs differ.

`bun run test:lab` drives all nine experiments in Chromium, checks delivery and token
balance results, checks failure rollback, downloads a result, and checks mobile
horizontal overflow and uncaught page errors. Set `VELUM_TEST_URL` for the deployed
site and `VELUM_TEST_IP` only if this VM's DNS workaround is needed. Evidence is saved
in `evidence/lab-browser.json`.

The worker bundle is lazy-loaded only after the run button is clicked. The main page
never fetches it. It runs on a separate browser thread, has a 30-second execution
limit enforced by the page, and is terminated after each result or error. A small
compatibility shim provides environment flags and microtask scheduling expected by
EthereumJS; it exposes no filesystem, signing keys or server credentials.

## Trust limits

The policy runs locally, not in CRE. The forwarder caller is simulated and no DON
signatures or TEE attestations are verified. No chain transaction is submitted.
Source hashes identify the compiled source inputs; they are not a security audit or
remote attestation. The separate CRE simulation logs and Sepolia receipts establish
those distinct integration steps. The lab does not claim proof of production safety,
arbitrary-token compatibility, or protection against a dishonest authorized owner.

The live site's CSP permits `wasm-unsafe-eval` for the EVM library's WebAssembly
component. General JavaScript `unsafe-eval` remains disallowed and scripts remain
restricted to this origin. This was verified against the deployed HTTPS site;
the local fallback does not apply Cloudflare asset headers.
