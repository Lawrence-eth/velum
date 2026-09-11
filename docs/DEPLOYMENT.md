# Deployment record

- Public demo: https://velum.aethe.me
- Repository: https://github.com/Lawrence-eth/velum
- Cloudflare Worker: `velum`
- Worker version: `99a3b6d8-2449-4649-abe0-668d0911ba27`
- Published and verified September 11, 2026.
- Live browser verification: `evidence/browser-live.log`; all eight checks passed.
- Public health endpoint returns `synthetic-demo`, `creNetworkDeployment: false`.
- Unauthenticated private fixture route returns HTTP 401. The deployed Worker has no invoice API token or CRE credentials configured. Real CRE simulation uses the localhost synthetic fixture API.
- Public preview is read-only GET with scenario and synthetic limit parameters. Existing zone policy blocks POST; the demo does not require a zone-policy exception.
- Four successful CRE CLI simulation logs and 16 local EVM checks are committed. Policy/API suite: 12 tests.
- Domain inventory updated locally in the separate `aethe.me` management repo, with the current Velum hostname.

The broader read-only zone verifier passed mail-record, expected-worker, DNSSEC and TLS setting checks but exited on a DNS lookup error in its other-host HTTPS probes. It did not complete all unrelated-host checks. Velum's own live HTTP and browser checks passed. Existing mail, other project hosts and global security policies were not modified.

No ETHGlobal submission, Sepolia deployment, transfer of funds, or live CRE network deployment was performed. Human contribution and narrated video remain pending.

Rename verification: the Velum domain passed the browser suite with Chromium resolving to the IPv4 address returned by Cloudflare public DNS, while the VM resolver still cached the new hostname. TLS verification remained enabled. Screenshots and all four CRE logs were regenerated under the new name.
