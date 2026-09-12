# Sepolia demonstration

Run `bun run demo:sepolia` from the repository with a funded dedicated Sepolia
wallet at `/home/ubuntu/.secrets/velum-sepolia.env` and an authenticated CRE CLI.
The credential file contains `CRE_ETH_PRIVATE_KEY=` followed by 64 hex digits.
The key is never committed or included in public evidence. The script deletes its
temporary combined secrets file after the CRE process finishes.

Each run deploys fresh contracts and spends Sepolia test ETH. It does not resume a
failed run automatically. Inspect `artifacts/sepolia-progress.json` and the sanitized
`artifacts/cre-sepolia.log` before retrying; pending transactions may still confirm.

The script deploys a test token, an unchanged BatchTreasury, and a separate
SepoliaSimulationAdapter. It funds the treasury with synthetic tokens, registers
the five-invoice manifest, and pins the expected report hash in the adapter using
the owner's wallet. CRE executes the confidential handler locally and broadcasts
its report through the Chainlink simulation forwarder. The adapter accepts only
that exact report once, supplies explicit synthetic workflow metadata, and calls
the treasury. The owner then settles the two approved invoices and closes the batch.

The script verifies successful transaction receipts, the registered manifest,
exact report equality, rejected invoice statuses, recipient balance deltas, and
an exact treasury debit of 5,800 synthetic USD units. It saves public evidence only
after these checks pass. The website preview does not initiate transactions.

This is testnet execution evidence, **not proof of DON signatures or deployed TEE
execution**. The owner-pinned hash is the authorization boundary for this demo;
it is not a substitute for a production oracle. The public mock forwarder does
not provide authenticated workflow identity. Production deployment needs the real
Chainlink forwarder and registered workflow identity, without the simulation adapter.

See [Chainlink's simulation guidance](https://docs.chain.link/cre/guides/workflow/using-evm-client/onchain-write/building-consumer-contracts).
