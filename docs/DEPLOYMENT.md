# Deployment record — Velum v0.2

- Public demo: https://velum.aethe.me
- Repository: https://github.com/Lawrence-eth/velum
- Cloudflare Worker: `velum`
- Worker version: `d151e85a-e508-4d26-9c1e-cb15eafc1e85`
- Published and verified September 11, 2026.
- Source/UI commit: `29f84d3`; local CRE-to-EVM implementation: `cfe42a7`.
- GitHub checks passed: https://github.com/Lawrence-eth/velum/actions/runs/34624166999
- Policy/API suite: 21 passing tests. Original receiver: 16 local EVM checks. New batch integration: 33 checks using actual CRE simulation output and local token settlement. Live browser: 17 checks.
- Actual batch receipt: `public/settlement-evidence.json`; CRE output: `public/logs/cre-batch.log`.

The public Worker contains only the synthetic preview and static evidence. It has no CRE login session or invoice API secret. Unauthenticated private routes remain unavailable. Public previews use read-only GET; POST remains subject to the existing domain security policy.

Cloudflare DNS and Google DNS both returned the new hostname's IPv4 records. The VM's default resolver still failed to resolve IPv4, so live browser checks mapped the hostname to the publicly returned Cloudflare address (`104.21.32.18`) with normal TLS verification enabled. The live suite passed at the correct HTTPS hostname, including Worker API calls and all static evidence. This is documented rather than treating the local resolver problem as a completed global propagation check.

The old project Worker and old hostname were retired during the rename. The separate domain-management repo tracks the Velum hostname in commit `da5015c`. Existing mail, other project hosts and global security policies were not modified. The earlier broader zone verifier did not finish unrelated-host HTTPS probes because of a DNS lookup error.

No ETHGlobal submission, live CRE network deployment or Sepolia deployment was performed. Token movements are real Solidity execution of synthetic tokens inside a local EVM; the report adapter is a mock forwarder and does not verify Chainlink signatures. No assets with monetary value moved.

### Sepolia preparation (2026-09-12)

Dedicated test wallet: `0x4C3fFFcEC089E14b9689560BCf7125cDE7D8e625`.
Its credential is stored outside this repository in an owner-readable VM file.
At preparation time its Sepolia ETH balance was zero; no deployment or broadcast
has been performed with this wallet. Fund with Sepolia test ETH only.

The batch workflow now accepts `deliverOnchain` (default `false`). When enabled it
uses the Sepolia EVM capability to submit the generated report and requires a
successful delivery status and transaction hash. This delivery branch has not yet
been verified against Sepolia; existing recorded settlement remains local EVM.

Chainlink's [consumer contract guide](https://docs.chain.link/cre/guides/workflow/using-evm-client/onchain-write/building-consumer-contracts)
explains that simulation uses a mock forwarder without workflow identity metadata.
The current `BatchTreasury` requires workflow identity, so it must not be deployed
unchanged behind the simulation forwarder and described as working. A separate,
explicitly test-only simulation adapter is needed for a broadcast demonstration;
the treasury's identity checks should remain intact. A mock-forwarder demonstration
would prove testnet state changes, not DON signature verification or deployed TEE
execution. Live CRE deployment still requires account deployment access.

### Verified Sepolia execution (2026-09-12)

The funded wallet completed CRE CLI broadcast and two settlements. Treasury: `0x9ce987f98853314ca5d139f0016d02ba521477a9`. Test token: `0x6ddfba3c4633710ac948b5261ffda54d86dc354a`. Adapter: `0xe94ec0befe649168cab8ba0f02486264f2a1e211`.

CRE delivery: https://sepolia.etherscan.io/tx/0x6864307f28f1c8cc88a0c2393ef8a95afe1d6ad68dd40de3557567adfc19d68c

Verified balance change: 20,000 → 14,200 synthetic USD; 5,800 paid. All ten transactions confirmed, including batch close. See [full evidence](../public/sepolia-evidence.json) and [reproduction/trust boundaries](SEPOLIA.md). The earlier preparation limitations above are historical; the broadcast branch is now verified through the separate simulation adapter. Live CRE network deployment remains unavailable.

Site deployment with Sepolia evidence: Worker version `29f5dce7-2379-4182-9672-ae1483846ebe`.

### Persistent workspace upgrade (2026-09-12)

Worker entry is now `src/index.ts`, exporting the Worker and `AccountingLedger`.
The `ACCOUNTING` binding uses SQLite-backed Durable Objects with migration
`v1-accounting`. Generated Worker types are required before type checking; CI runs
`bun run types`. The Bun fallback still serves the static demo and old previews but
returns 503 for ledger requests because it does not emulate Durable Objects.

Live browser checks verified separate workspaces, concurrent reservation safety,
CSV import/correction, reload persistence, and finalized Sepolia reconciliation.
The actual CRE simulator then fetched the reconciled ledger snapshot and rejected
all five resubmitted requests. Evidence: `evidence/ledger-browser.json`,
`evidence/ledger-cre.json`, and `evidence/cre-ledger.log`.

The zone's existing method-block rule required a narrow exception for five POST
paths on velum.aethe.me (import, reserve, release, seed, reconcile). Other rules and
hosts were preserved. `docs/ledger-firewall-expression.txt` records the expression.
No credentials or workspace bearer capabilities are in public artifacts.

Final workspace deployment version: `4781c8ef-7c92-4551-9f1c-26da586fcd63`.
GitHub CI passed for implementation commit `4abb937`. The original 18-check live
browser suite also passed after the upgrade. The public ledger-to-CRE evidence URL
returned a successful five-check record over verified HTTPS.

### Product-audit upgrade

Deployed Worker version `4b2cc209-17d1-464f-bc5a-db3e6ded3b4c`: read-only review,
revision checks, idempotent reservations, public run receipts, and shorter product
navigation. No new bindings or firewall exceptions were required. Existing saved
workspaces remain compatible; historical runs without receipts remain readable.
Live checks: 14 ledger checks plus 18 existing product checks passed.

### Browser contract lab

Worker version `ee58f098-7854-4e1c-b3ee-2849cec13887` serves `/lab.html`, its on-demand
Web Worker bundle, and reproducibly compiled Solidity artifacts. No new Worker
bindings, private API routes, wallet keys or network-writing capabilities were added.
The asset CSP adds `wasm-unsafe-eval` to allow EthereumJS's WebAssembly dependency;
general JavaScript string evaluation is still blocked. Local tests caught a browser
process-environment dependency and mobile overflow; deployed tests caught the stricter
CSP, all resolved before claiming live verification.

## Agent gate deployment — September 12, 2026

Worker version `f0653a07-6a58-4cc4-a72e-a67b57222c32` adds the live treasury-proposal homepage, Workers AI binding, globally bounded synthetic inference endpoint, strict proposal validation and independent accounting-policy preview. The persistent payment desk is now `/desk.html`; the contract lab remains `/lab.html`. The existing Durable Object migration is reused with a separate quota table in one dedicated global instance.

The zone POST firewall exception was extended only for `velum.aethe.me` at `/api/agent`; existing restrictions and other hosts were preserved. The endpoint accepts fixed synthetic scenarios, not arbitrary documents. Live inference needs no browser API key; the server binding calls Workers AI.

Published evidence includes actual clean/malicious model captures, three real CRE CLI simulations and local compiled-contract settlement results. This adds no new Sepolia transactions and does not claim deployed confidential attestation.

## Unified product site — September 12, 2026

Worker version `121e18e9-16d5-4ce8-bbba-026922d88346` unifies all product pages through shared static navigation and design styles. Accounting now has one dedicated workspace, the Evidence page centralizes recorded results, and earlier fixtures live under technical references. API bindings, stored workspace identities, policy and contract behavior are unchanged. See `SITE-DESIGN.md` for route and validation details.

## Guided proposal-to-contract execution — September 12, 2026

Worker version `6a9f6b50-2b65-4026-a160-b66922b1506a` makes the agent homepage a single guided flow. The existing live inference endpoint feeds the exact proposed recipient and amount into the browser-local Solidity executor. The UI compares policy and settlement outcomes, shows token balances, and supports an explicitly labeled verified-record correction with a combined trace. Every attempt uses a fresh local treasury; no new onchain transaction, persistent reservation or CRE network run is triggered by the button.

The browser EVM bundle now supports a validated `proposal` experiment alongside the existing nine contract cases. Type checking, actual proposal execution edge cases, the deployed guided browser test and the original contract-lab tests cover the change.

## Live CRE payment console — September 13, 2026

Current Worker version `1da1928f-a96b-4359-8a1d-cab4bfbb39d0` replaces the primary browser-local execution with an authenticated queue and actual CRE CLI jobs on the VM. The returned report drives server-local Solidity. The compact payment console displays the invoice beside the decision and exposes the current report and CLI log. `interactive-cre.json` records browser-triggered live model and recovery executions.

The user service `velum-cre-runner` is enabled, with lingering enabled to survive SSH logout. Credentials are held in a restricted environment file and the matching Worker secret, never browser code. See `LIVE-CRE.md` and `scripts/velum-cre-runner.service.example` for operation, bounded quotas and simulation limitations. Existing accounting remains separate.

Validation: 44 unit tests, TypeScript, four actual browser-triggered CRE jobs, 14 deployed accounting checks, and six deployed access/idempotency checks. Site screenshots and route checks cover desktop, tablet and mobile.

## Readability revision — September 13, 2026

Worker `cedd0f1e-f2c0-4b82-867a-58cab99d41fe` increases the console reading scale, pane spacing, decision-column width and primary control height. Shared navigation and evidence tables are larger. Smaller screens switch layouts sooner and include a direct review link. CRE execution and accounting behavior are unchanged.

## Persistent work orders — September 13, 2026

Worker `6381872c-c5e0-46d3-9348-a6518a305943` deploys the work-order homepage, live GitHub retrieval inside CRE, exclusive work/budget reservation, saved history, same-job recovery and duplicate rejection. The invoice-agent experiment is retained at `/invoice.html`. Shared source/report enforcement remains in the existing batch workflow; `work-workflow` adds the GitHub secret mapping.

The VM runner now maintains protected journals outside Git and redelivers unacknowledged results after restart. Work-order Solidity state is reconstructed from its recorded operations. The UI labels this journal-backed local execution, synthetic acceptance and mock forwarding. No new network payment or deployed enclave is claimed.

Validation includes 58 unit tests; real CRE denial and settlement; 11 deployed work-order browser checks; same-job recovery from a labeled injected executor failure; actual service restart/result redelivery; the existing eight invoice-agent, 14 accounting and nine contract-control checks; and desktop/tablet/mobile site checks. See `WORK-ORDERS.md` for limits and remaining production work.
