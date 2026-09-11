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
